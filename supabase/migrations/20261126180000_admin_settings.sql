-- Super admin panel, part 8 (spec 11.5 item 8): Settings.
-- Reads the settings page data, saves the settings the website uses, and adds
-- cities. Super admins are still added only in the database.

-- ---------------------------------------------------------------------------
-- Everything the Settings page shows.
-- ---------------------------------------------------------------------------
create or replace function public.admin_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_super_admin() then null else jsonb_build_object(
    'settings', coalesce((select jsonb_object_agg(key, value) from public.site_settings), '{}'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', co.id, 'code', co.code, 'name', co.name, 'region', co.region, 'is_market', co.is_market,
               'cities', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug,
                                                                         'venues', (select count(*) from public.venues v where v.city_id = c.id))
                                                    order by c.name)
                                   from public.cities c where c.country_id = co.id), '[]'::jsonb))
             order by co.is_market desc, co.region nulls last, co.name)
      from public.countries co), '[]'::jsonb),
    'venues', jsonb_build_object(
      'published', (select count(*) from public.venues where status = 'published'),
      'pending', (select count(*) from public.venues where status = 'pending')),
    'super_admins', coalesce((
      select jsonb_agg(jsonb_build_object('name', a.display_name, 'email', u.email,
                                          'two_step', exists (select 1 from auth.mfa_factors f where f.user_id = a.id and f.status = 'verified'))
                       order by a.created_at)
      from public.accounts a left join auth.users u on u.id = a.id
      where a.is_super_admin), '[]'::jsonb)
  ) end;
$$;

-- ---------------------------------------------------------------------------
-- Save one setting. Only the keys the website reads, each within limits.
-- Returns 'ok', 'bad_value' or 'forbidden'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_setting(p_key text, p_value jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_int int;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;

  if p_key in ('coming_up_count', 'track_count', 'new_signal_days') then
    if jsonb_typeof(p_value) <> 'number' then
      return 'bad_value';
    end if;
    v_int := (p_value #>> '{}')::numeric::int;
    if (p_key = 'coming_up_count' and v_int not between 4 and 24)
       or (p_key = 'track_count' and v_int not between 3 and 12)
       or (p_key = 'new_signal_days' and v_int not between 1 and 30) then
      return 'bad_value';
    end if;
    p_value := to_jsonb(v_int);
  elsif p_key = 'default_city' then
    if jsonb_typeof(p_value) <> 'string'
       or not exists (select 1 from public.cities c join public.countries co on co.id = c.country_id
                      where c.slug = p_value #>> '{}' and co.code = 'EG') then
      return 'bad_value';
    end if;
  else
    return 'bad_value';
  end if;

  insert into public.site_settings (key, value, updated_by, updated_at)
  values (p_key, p_value, (select auth.uid()), now())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Add a city to a country. Returns 'ok', 'exists', 'bad_value' or 'forbidden'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_add_city(p_country_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_slug text;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  v_slug := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if length(v_name) not between 2 and 60 or v_slug = ''
     or not exists (select 1 from public.countries where id = p_country_id) then
    return 'bad_value';
  end if;
  if exists (select 1 from public.cities where country_id = p_country_id and (slug = v_slug or lower(name) = lower(v_name))) then
    return 'exists';
  end if;
  insert into public.cities (country_id, name, slug) values (p_country_id, v_name, v_slug);
  return 'ok';
end;
$$;

revoke all on function public.admin_settings() from public;
revoke all on function public.admin_save_setting(text, jsonb) from public;
revoke all on function public.admin_add_city(uuid, text) from public;
grant execute on function public.admin_settings() to authenticated;
grant execute on function public.admin_save_setting(text, jsonb) to authenticated;
grant execute on function public.admin_add_city(uuid, text) to authenticated;
