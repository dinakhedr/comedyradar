-- Super admin: add a venue to a city from Settings > Locations and venues.
-- Venues get an optional website. A venue added here is published at once.

alter table public.venues add column if not exists website text;

-- Returns 'ok', 'exists', 'bad_value' or 'forbidden'.
create or replace function public.admin_add_venue(p_city_id uuid, p_name text, p_website text, p_map_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_web text := nullif(btrim(coalesce(p_website, '')), '');
  v_map text := btrim(coalesce(p_map_url, ''));
  v_city text;
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select slug into v_city from public.cities where id = p_city_id;
  if v_city is null
     or length(v_name) not between 2 and 120
     or (v_web is not null and (length(v_web) > 500 or v_web !~* '^https?://[^\s/]+\.[^\s]+$'))
     or length(v_map) > 500
     or v_map !~* '^https://((www\.)?google\.[a-z.]+/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl/maps)[^\s]*$' then
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

  insert into public.venues (city_id, name, slug, website, map_url, status, created_by)
  values (p_city_id, v_name, v_slug, v_web, v_map, 'published', (select auth.uid()));
  return 'ok';
end;
$$;

revoke all on function public.admin_add_venue(uuid, text, text, text) from public;
grant execute on function public.admin_add_venue(uuid, text, text, text) to authenticated;

-- The Venues tab also shows the website.
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
      select v.id, v.name, v.name_ar, v.status::text as status, c.name as city, co.code as country_code,
             v.address, v.map_url, v.website,
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
