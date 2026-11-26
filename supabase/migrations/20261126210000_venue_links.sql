-- Venues get optional Instagram and Facebook links, shown on the public venue page
-- (/venues/[slug]) with the Google Maps link and the website. The super admin can
-- now also edit a venue's details from Shows and tours > Venues.

alter table public.venues add column if not exists instagram_url text;
alter table public.venues add column if not exists facebook_url text;

-- A clean link from what was typed: an Instagram handle or link, a Facebook page
-- name or link. Returns null when empty and '!' when it is not a valid link.
create or replace function private.venue_social_url(p_kind text, p_raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := btrim(coalesce(p_raw, ''));
  m text[];
begin
  if v = '' then
    return null;
  end if;
  if length(v) > 300 or v ~ '\s' then
    return '!';
  end if;
  if p_kind = 'instagram' then
    m := regexp_match(v, '^(?:https?://)?(?:www\.)?instagram\.com/([A-Za-z0-9._]{1,30})/?(?:[?#].*)?$', 'i');
    if m is null then
      m := regexp_match(v, '^@?([A-Za-z0-9._]{1,30})$');
    end if;
    return case when m is null then '!' else 'https://www.instagram.com/' || m[1] end;
  elsif p_kind = 'facebook' then
    m := regexp_match(v, '^(?:https?://)?(?:www\.|m\.|web\.)?(?:facebook|fb)\.com/([^?#]+?)/?(?:[?#].*)?$', 'i');
    if m is not null then
      return 'https://www.facebook.com/' || m[1];
    end if;
    m := regexp_match(v, '^@?([A-Za-z0-9.]{2,50})$');
    return case when m is null then '!' else 'https://www.facebook.com/' || m[1] end;
  end if;
  return '!';
end;
$$;

-- Checks shared by adding and editing: true when every field is valid.
create or replace function private.venue_fields_ok(p_name text, p_website text, p_map_url text, p_instagram text, p_facebook text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select length(p_name) between 2 and 120
     and (p_website is null or (length(p_website) <= 500 and p_website ~* '^https?://[^\s/]+\.[^\s]+$'))
     and length(coalesce(p_map_url, '')) <= 500
     and coalesce(p_map_url, '') ~* '^https://((www\.)?google\.[a-z.]+/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl/maps)[^\s]*$'
     and coalesce(p_instagram, '') <> '!'
     and coalesce(p_facebook, '') <> '!';
$$;

drop function if exists public.admin_add_venue(uuid, text, text, text);

-- Returns 'ok', 'exists', 'bad_value' or 'forbidden'.
create or replace function public.admin_add_venue(
  p_city_id uuid, p_name text, p_website text, p_map_url text, p_instagram text, p_facebook text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_web text := nullif(btrim(coalesce(p_website, '')), '');
  v_map text := btrim(coalesce(p_map_url, ''));
  v_ig text := private.venue_social_url('instagram', p_instagram);
  v_fb text := private.venue_social_url('facebook', p_facebook);
  v_city text;
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select slug into v_city from public.cities where id = p_city_id;
  if v_city is null or not private.venue_fields_ok(v_name, v_web, v_map, v_ig, v_fb) then
    return 'bad_value';
  end if;
  if exists (select 1 from public.venues where city_id = p_city_id and lower(name) = lower(v_name)) then
    return 'exists';
  end if;

  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  v_base := coalesce(nullif(v_base, ''), 'venue') || '-' || v_city;
  v_slug := v_base;
  while exists (select 1 from public.venues where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.venues (city_id, name, slug, website, map_url, instagram_url, facebook_url, status, created_by)
  values (p_city_id, v_name, v_slug, v_web, v_map, v_ig, v_fb, 'published', (select auth.uid()));
  return 'ok';
end;
$$;

-- Edit a venue's details (the address stays as it is when left empty).
-- Returns 'ok', 'exists', 'bad_value', 'not_found' or 'forbidden'.
create or replace function public.admin_update_venue(
  p_id uuid, p_name text, p_address text, p_website text, p_map_url text, p_instagram text, p_facebook text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_address text := nullif(btrim(regexp_replace(coalesce(p_address, ''), '\s+', ' ', 'g')), '');
  v_web text := nullif(btrim(coalesce(p_website, '')), '');
  v_map text := btrim(coalesce(p_map_url, ''));
  v_ig text := private.venue_social_url('instagram', p_instagram);
  v_fb text := private.venue_social_url('facebook', p_facebook);
  v_city uuid;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select city_id into v_city from public.venues where id = p_id;
  if v_city is null then
    return 'not_found';
  end if;
  if not private.venue_fields_ok(v_name, v_web, v_map, v_ig, v_fb) or length(coalesce(v_address, '')) > 200 then
    return 'bad_value';
  end if;
  if exists (select 1 from public.venues where city_id = v_city and id <> p_id and lower(name) = lower(v_name)) then
    return 'exists';
  end if;
  update public.venues
     set name = v_name, address = v_address, website = v_web, map_url = v_map,
         instagram_url = v_ig, facebook_url = v_fb
   where id = p_id;
  return 'ok';
end;
$$;

revoke all on function private.venue_social_url(text, text) from public;
revoke all on function private.venue_fields_ok(text, text, text, text, text) from public;
revoke all on function public.admin_add_venue(uuid, text, text, text, text, text) from public;
revoke all on function public.admin_update_venue(uuid, text, text, text, text, text, text) from public;
grant execute on function public.admin_add_venue(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_update_venue(uuid, text, text, text, text, text, text) to authenticated;

-- The Venues tab also returns the links, the slug, the city id and the country name
-- (for the country and city filters, and the venues listed under each city in Settings).
create or replace function public.admin_venues(p_q text, p_status text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_super_admin() then null else coalesce((
    select jsonb_agg(r order by r.status <> 'pending', r.country_code <> 'EG', lower(r.city), lower(r.name))
    from (
      select v.id, v.name, v.name_ar, v.slug, v.status::text as status, v.city_id, c.name as city,
             co.code as country_code, co.name as country_name,
             v.address, v.map_url, v.website, v.instagram_url, v.facebook_url,
             (select count(*) from public.shows s where s.venue_id = v.id and s.starts_at >= now()
                and s.status in ('published', 'sold_out')) as upcoming,
             coalesce(a.display_name, u.email) as added_by
      from public.venues v
      join public.cities c on c.id = v.city_id
      join public.countries co on co.id = c.country_id
      left join public.accounts a on a.id = v.created_by
      left join auth.users u on u.id = v.created_by
      where (coalesce(p_status, '') = '' or v.status::text = p_status)
        and (nullif(btrim(coalesce(p_q, '')), '') is null or v.name ilike '%' || btrim(p_q) || '%'
             or coalesce(v.name_ar, '') ilike '%' || btrim(p_q) || '%' or c.name ilike '%' || btrim(p_q) || '%')
      limit 300
    ) r
  ), '[]'::jsonb) end;
$$;
