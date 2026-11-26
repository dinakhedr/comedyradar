-- Super admin: Bulk import (Admin > Bulk import), Comedians and Shows.
-- The site reads the CSV file, matches each row and shows a preview; these
-- two functions save the rows the super admin confirmed, all or nothing.
--   * Comedians are published at once and marked "seeded by Comedy Radar".
--   * Shows go in as Pending for the Review queue. A new venue goes in as a
--     Pending venue, and a performer not on the site yet as a Pending,
--     seeded comedian profile.
-- The super admin does not become an admin of the imported profiles.

-- ---------------------------------------------------------------------------
-- The creator of a profile becomes its admin, except during a bulk import.
-- ---------------------------------------------------------------------------
create or replace function private.grant_creator_admin()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if current_setting('comedyradar.bulk_import', true) = 'on' then
    return new;
  end if;
  if v_uid is null or not exists (select 1 from public.accounts where id = v_uid) then
    return new;
  end if;
  if tg_table_name = 'comedians' then
    insert into public.profile_access (account_id, comedian_id, role, status)
    values (v_uid, new.id, 'admin', 'active')
    on conflict do nothing;
  else
    insert into public.profile_access (account_id, group_id, role, status)
    values (v_uid, new.id, 'admin', 'active')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- A free comedian slug: base, base-2, base-3 …
create or replace function private.free_comedian_slug(p_base text)
returns text
language plpgsql stable
set search_path = ''
as $$
declare
  v_base text := coalesce(nullif(btrim(lower(regexp_replace(coalesce(p_base, ''), '[^a-zA-Z0-9-]+', '-', 'g')), '-'), ''), 'comedian');
  v_slug text := v_base;
  v_n int := 1;
begin
  while exists (select 1 from public.comedians where slug = v_slug)
     or exists (select 1 from public.comedy_groups where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comedians. p_rows: [{name, name_ar, bio, home_country_id, instagram_url,
-- tiktok_url, youtube_url, facebook_url, slug_base}]. Names already on the site
-- are skipped. Returns {"comedians": n, "skipped": n}, or null when not allowed.
-- ---------------------------------------------------------------------------
create or replace function public.admin_import_comedians(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_name text;
  v_added int := 0;
  v_skipped int := 0;
begin
  if not private.is_super_admin() or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
    return null;
  end if;
  perform set_config('comedyradar.bulk_import', 'on', true);

  for r in select * from jsonb_array_elements(p_rows) loop
    v_name := btrim(regexp_replace(coalesce(r ->> 'name', ''), '\s+', ' ', 'g'));
    if length(v_name) not between 2 and 80 then
      raise exception 'bad name' using errcode = '22023';
    end if;
    if exists (select 1 from public.comedians where lower(name) = lower(v_name)) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    insert into public.comedians (name, name_ar, slug, bio, home_country_id, instagram_url, tiktok_url, youtube_url, facebook_url,
                                  status, seeded, created_by)
    values (v_name, nullif(r ->> 'name_ar', ''), private.free_comedian_slug(r ->> 'slug_base'), nullif(r ->> 'bio', ''),
            nullif(r ->> 'home_country_id', '')::uuid,
            nullif(r ->> 'instagram_url', ''), nullif(r ->> 'tiktok_url', ''), nullif(r ->> 'youtube_url', ''), nullif(r ->> 'facebook_url', ''),
            'published', true, (select auth.uid()));
    v_added := v_added + 1;
  end loop;

  perform set_config('comedyradar.bulk_import', 'off', true);
  return jsonb_build_object('comedians', v_added, 'skipped', v_skipped);
end;
$$;

revoke all on function public.admin_import_comedians(jsonb) from public, anon;
grant execute on function public.admin_import_comedians(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Shows. p_rows: the values the preview worked out (see src/lib/bulk-import.ts,
-- ShowValuesOut): title, slug_base, starts_at, city_id, venue_id or new_venue,
-- zone, market_country_id, performers [{kind: comedian|group|new, id, name}] …
-- Returns {"shows": n, "venues": n, "comedians": n}, or null when not allowed.
-- ---------------------------------------------------------------------------
create or replace function public.admin_import_shows(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  p jsonb;
  v_uid uuid := (select auth.uid());
  v_show uuid;
  v_venue uuid;
  v_perf uuid;
  v_name text;
  v_city_slug text;
  v_base text;
  v_slug text;
  v_n int;
  v_order int;
  v_shows int := 0;
  v_venues int := 0;
  v_comedians int := 0;
begin
  if not private.is_super_admin() or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
    return null;
  end if;
  perform set_config('comedyradar.bulk_import', 'on', true);

  for r in select * from jsonb_array_elements(p_rows) loop
    -- Venue: one on the site, or a new Pending one (once, even if several rows name it).
    v_venue := nullif(r ->> 'venue_id', '')::uuid;
    if v_venue is null and jsonb_typeof(r -> 'new_venue') = 'object' then
      v_name := btrim(regexp_replace(coalesce(r -> 'new_venue' ->> 'name', ''), '\s+', ' ', 'g'));
      select id into v_venue from public.venues
      where city_id = (r ->> 'city_id')::uuid and lower(name) = lower(v_name) and status <> 'archived'
      limit 1;
      if v_venue is null then
        select slug into v_city_slug from public.cities where id = (r ->> 'city_id')::uuid;
        v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
        v_base := coalesce(nullif(v_base, ''), 'venue') || '-' || coalesce(v_city_slug, 'city');
        v_slug := v_base;
        v_n := 1;
        while exists (select 1 from public.venues where slug = v_slug) loop
          v_n := v_n + 1;
          v_slug := v_base || '-' || v_n;
        end loop;
        insert into public.venues (city_id, name, slug, address, status, created_by)
        values ((r ->> 'city_id')::uuid, v_name, v_slug, nullif(r -> 'new_venue' ->> 'address', ''), 'pending', v_uid)
        returning id into v_venue;
        v_venues := v_venues + 1;
      end if;
    end if;

    -- The show, with a free slug ("title-2026-12-11").
    v_base := coalesce(nullif(btrim(lower(regexp_replace(coalesce(r ->> 'slug_base', ''), '[^a-zA-Z0-9-]+', '-', 'g')), '-'), ''), 'show');
    v_slug := v_base;
    v_n := 1;
    while exists (select 1 from public.shows where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;

    insert into public.shows (
      slug, title, description, starts_at, doors_at, venue_id, city_id, zone, market_country_id, tour_id,
      price_min, price_max, currency, ticket_url, language, age_rating, good_to_know,
      source_type, source_url, status, signal, created_by, updated_by)
    values (
      v_slug, r ->> 'title', nullif(r ->> 'description', ''), (r ->> 'starts_at')::timestamptz, nullif(r ->> 'doors_at', '')::timestamptz,
      v_venue, (r ->> 'city_id')::uuid, (r ->> 'zone')::public.show_zone, (r ->> 'market_country_id')::uuid, nullif(r ->> 'tour_id', '')::uuid,
      nullif(r ->> 'price_min', '')::numeric, nullif(r ->> 'price_max', '')::numeric, coalesce(nullif(r ->> 'currency', ''), 'EGP'),
      nullif(r ->> 'ticket_url', ''), nullif(r ->> 'language', ''), nullif(r ->> 'age_rating', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(r -> 'good_to_know', '[]'::jsonb))), '{}'),
      'aggregated', nullif(r ->> 'source_url', ''), 'pending', coalesce(nullif(r ->> 'signal', ''), 'new')::public.show_signal, v_uid, v_uid)
    returning id into v_show;
    v_shows := v_shows + 1;

    -- Performers in order; the first is the headliner.
    v_order := 0;
    for p in select * from jsonb_array_elements(coalesce(r -> 'performers', '[]'::jsonb)) loop
      v_order := v_order + 1;
      if p ->> 'kind' = 'group' then
        insert into public.show_performers (show_id, group_id, billing_order) values (v_show, (p ->> 'id')::uuid, v_order);
        continue;
      end if;
      if p ->> 'kind' = 'comedian' then
        v_perf := (p ->> 'id')::uuid;
      else
        v_name := btrim(regexp_replace(coalesce(p ->> 'name', ''), '\s+', ' ', 'g'));
        if length(v_name) not between 2 and 80 then
          raise exception 'bad performer name' using errcode = '22023';
        end if;
        select id into v_perf from public.comedians where lower(name) = lower(v_name) order by created_at limit 1;
        if v_perf is null then
          insert into public.comedians (name, slug, status, seeded, created_by)
          values (v_name, private.free_comedian_slug(lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'))), 'pending', true, v_uid)
          returning id into v_perf;
          v_comedians := v_comedians + 1;
        end if;
      end if;
      insert into public.show_performers (show_id, comedian_id, billing_order) values (v_show, v_perf, v_order)
      on conflict do nothing;
    end loop;
  end loop;

  perform set_config('comedyradar.bulk_import', 'off', true);
  return jsonb_build_object('shows', v_shows, 'venues', v_venues, 'comedians', v_comedians);
end;
$$;

revoke all on function public.admin_import_shows(jsonb) from public, anon;
grant execute on function public.admin_import_shows(jsonb) to authenticated;
