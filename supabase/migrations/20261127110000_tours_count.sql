-- Comedy Radar: "Tours" count for the homepage On tour section (admin Settings > Homepage).
-- Adds the tours_count setting (default 4, allowed 2 to 12) and lets the
-- super admin save it. Everything else in admin_save_setting is unchanged.

insert into public.site_settings (key, value) values ('tours_count', '4'::jsonb)
on conflict (key) do nothing;

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

  if p_key in ('coming_up_count', 'track_count', 'tours_count', 'new_signal_days') then
    if jsonb_typeof(p_value) <> 'number' then
      return 'bad_value';
    end if;
    v_int := (p_value #>> '{}')::numeric::int;
    if (p_key = 'coming_up_count' and v_int not between 4 and 24)
       or (p_key = 'track_count' and v_int not between 3 and 12)
       or (p_key = 'tours_count' and v_int not between 2 and 12)
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
