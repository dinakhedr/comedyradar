-- Venues get an area and a square logo (profile photo), shown on the public venue page and
-- on the new public venues list (/venues). Only the super admin uploads logos,
-- from Settings > Locations and venues and from Shows and tours > Venues.
--
-- Files live in the public "venues" bucket at venues/<venue_id>/logo-<time>.webp.
-- The browser crops every logo to a square and shrinks it before upload.

alter table public.venues add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('venues', 'venues', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Anyone can read the public image buckets (now with venues).
-- Writing stays with private.can_write_object, which lets only the super admin
-- write to buckets it does not name (such as "venues").
drop policy if exists "Public images are readable" on storage.objects;
create policy "Public images are readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('posters', 'comedians', 'groups', 'podcasts', 'venues'));

-- Sets or removes (null) a venue's logo. The address must be a file in the
-- public venues bucket of this project. Returns 'ok', 'bad_value', 'not_found' or 'forbidden'.
create or replace function public.admin_set_venue_logo(p_id uuid, p_logo_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := nullif(btrim(coalesce(p_logo_url, '')), '');
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if v_url is not null and (
       length(v_url) > 500
       or v_url !~ ('^https://[^/\s]+/storage/v1/object/public/venues/' || p_id::text || '/[A-Za-z0-9._-]+$')) then
    return 'bad_value';
  end if;
  update public.venues set logo_url = v_url where id = p_id;
  return case when found then 'ok' else 'not_found' end;
end;
$$;


-- Venues get an area inside their city (cities are large: Sheikh Zayed in Giza,
-- New Cairo in Cairo). Free text, optional, up to 60 characters.
alter table public.venues add column if not exists area text;
alter table public.venues drop constraint if exists venues_area_length;
alter table public.venues add constraint venues_area_length check (area is null or length(area) <= 60);

-- Adding and editing a venue now also take the area (optional, so the
-- live site keeps working until the new code is deployed).
drop function if exists public.admin_add_venue(uuid, text, text, text, text, text);
drop function if exists public.admin_update_venue(uuid, text, text, text, text, text, text);

create or replace function public.admin_add_venue(
  p_city_id uuid, p_name text, p_website text, p_map_url text, p_instagram text, p_facebook text, p_area text default null)
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
  v_area text := nullif(btrim(regexp_replace(coalesce(p_area, ''), '\s+', ' ', 'g')), '');
  v_city text;
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select slug into v_city from public.cities where id = p_city_id;
  if v_city is null or not private.venue_fields_ok(v_name, v_web, v_map, v_ig, v_fb) or length(coalesce(v_area, '')) > 60 then
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

  insert into public.venues (city_id, name, slug, area, website, map_url, instagram_url, facebook_url, status, created_by)
  values (p_city_id, v_name, v_slug, v_area, v_web, v_map, v_ig, v_fb, 'published', (select auth.uid()));
  return 'ok';
end;
$$;

-- Edit a venue's details (the address stays as it is when left empty).
-- Returns 'ok', 'exists', 'bad_value', 'not_found' or 'forbidden'.
create or replace function public.admin_update_venue(
  p_id uuid, p_name text, p_address text, p_website text, p_map_url text, p_instagram text, p_facebook text, p_area text default null)
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
  v_area text := nullif(btrim(regexp_replace(coalesce(p_area, ''), '\s+', ' ', 'g')), '');
  v_city uuid;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select city_id into v_city from public.venues where id = p_id;
  if v_city is null then
    return 'not_found';
  end if;
  if not private.venue_fields_ok(v_name, v_web, v_map, v_ig, v_fb) or length(coalesce(v_address, '')) > 200
     or length(coalesce(v_area, '')) > 60 then
    return 'bad_value';
  end if;
  if exists (select 1 from public.venues where city_id = v_city and id <> p_id and lower(name) = lower(v_name)) then
    return 'exists';
  end if;
  update public.venues
     set name = v_name, address = v_address, area = v_area, website = v_web, map_url = v_map,
         instagram_url = v_ig, facebook_url = v_fb
   where id = p_id;
  return 'ok';
end;
$$;

revoke all on function public.admin_add_venue(uuid, text, text, text, text, text, text) from public;
revoke all on function public.admin_update_venue(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.admin_add_venue(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_update_venue(uuid, text, text, text, text, text, text, text) to authenticated;

revoke all on function public.admin_set_venue_logo(uuid, text) from public;
grant execute on function public.admin_set_venue_logo(uuid, text) to authenticated;

-- The admin venue list also returns the area and the logo.
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
             v.address, v.map_url, v.website, v.instagram_url, v.facebook_url, v.area, v.logo_url,
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

-- Only Comedy Radar adds venues (Dina, 2026-11-26): creators pick from the list
-- and can no longer suggest new ones.
drop policy if exists "Accounts suggest venues" on public.venues;
drop policy if exists "Super admin adds venues" on public.venues;
create policy "Super admin adds venues" on public.venues
  for insert to authenticated
  with check ((select private.is_super_admin()));
