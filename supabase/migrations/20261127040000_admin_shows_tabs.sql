-- Admin > Shows and tours: "Single shows" and "Tours" tabs (Dina, 2026-11-27).
-- admin_shows gets p_kind ('single' = not on a tour, 'tour' = on a tour, '' = all)
-- and returns each show's tour id and posters. admin_tours returns the poster.
-- New: admin_update_tour (name and poster for all its dates at once) and
-- admin_use_tour_poster (ticked dates drop their own poster).

-- The old 5-argument admin_shows stays until this is live (the current site still calls it).

create or replace function public.admin_shows(p_q text, p_zone text, p_status text, p_city uuid, p_period text, p_kind text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_period text := coalesce(nullif(p_period, ''), 'upcoming');
  v_kind text := coalesce(p_kind, '');
  v_stats jsonb;
  v_quality jsonb;
  v_cities jsonb;
  v_rows jsonb;
begin
  if not private.is_super_admin() then
    return null;
  end if;

  select jsonb_build_object(
           'upcoming', count(*) filter (where s.status in ('published', 'sold_out')),
           'local', count(*) filter (where s.status in ('published', 'sold_out') and s.zone = 'local'),
           'outbound', count(*) filter (where s.status in ('published', 'sold_out') and s.zone = 'outbound'),
           'inbound', count(*) filter (where s.status in ('published', 'sold_out') and s.zone = 'inbound'),
           'missing_ticket', count(*) filter (where s.status = 'published' and coalesce(btrim(s.ticket_url), '') = ''),
           'cancelled', count(*) filter (where s.status = 'cancelled'),
           'single', count(*) filter (where s.status in ('published', 'sold_out') and s.tour_id is null),
           'on_tours', count(*) filter (where s.status in ('published', 'sold_out') and s.tour_id is not null)),
         jsonb_build_object(
           'no_venue', count(*) filter (where s.status in ('published', 'sold_out', 'pending') and s.venue_id is null))
  into v_stats, v_quality
  from public.shows s
  where s.starts_at >= now();

  v_quality := v_quality || jsonb_build_object(
    'signal_requests', (select count(*) from public.shows s
                        where s.signal_request is not null and s.signal_request <> s.signal and s.starts_at >= now()),
    'tours_no_tickets', (select count(distinct t.id) from public.tours t join public.shows s on s.tour_id = t.id
                         where t.status = 'published' and s.status = 'published' and s.starts_at >= now()
                           and coalesce(btrim(s.ticket_url), '') = ''),
    'new_signal_days', coalesce((select (st.value #>> '{}')::int from public.site_settings st where st.key = 'new_signal_days'), 7));

  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'country_code', co.code) order by co.code <> 'EG', co.name, c.name), '[]'::jsonb)
  into v_cities
  from public.cities c join public.countries co on co.id = c.country_id
  where exists (select 1 from public.shows s where s.city_id = c.id);

  select coalesce(jsonb_agg(r order by
           case when v_period = 'past' then null else r.starts_at end asc,
           case when v_period = 'past' then r.starts_at end desc), '[]'::jsonb)
  into v_rows
  from (
    select s.id, s.slug, s.title, s.starts_at, s.status::text as status, s.signal::text as signal,
           s.signal_request::text as signal_request, s.zone::text as zone, s.ticket_url, s.source_type,
           c.name as city, co.code as country_code, v.name as venue, t.name as tour,
           s.tour_id, s.poster_url, t.poster_url as tour_poster_url,
           (select string_agg(coalesce(cm.name, g.name), ', ' order by sp.billing_order)
              from public.show_performers sp
              left join public.comedians cm on cm.id = sp.comedian_id
              left join public.comedy_groups g on g.id = sp.group_id
             where sp.show_id = s.id) as performers,
           case when s.source_type = 'aggregated' then 'Comedy Radar'
                else coalesce(a.display_name, u.email) end as added_by
    from public.shows s
    join public.cities c on c.id = s.city_id
    join public.countries co on co.id = c.country_id
    left join public.venues v on v.id = s.venue_id
    left join public.tours t on t.id = s.tour_id
    left join public.accounts a on a.id = s.created_by
    left join auth.users u on u.id = s.created_by
    where (v_kind = '' or (v_kind = 'single' and s.tour_id is null) or (v_kind = 'tour' and s.tour_id is not null))
      and (coalesce(p_zone, '') = '' or s.zone::text = p_zone)
      and (coalesce(p_status, '') = ''
           or (p_status = 'asked' and s.signal_request is not null and s.signal_request <> s.signal)
           or s.status::text = p_status)
      and (p_city is null or s.city_id = p_city)
      and (v_period = 'all'
           or (v_period = 'upcoming' and s.starts_at >= now())
           or (v_period = 'week' and s.starts_at >= now() and s.starts_at < now() + interval '7 days')
           or (v_period = 'month' and s.starts_at >= now() and s.starts_at < now() + interval '30 days')
           or (v_period = 'past' and s.starts_at < now()))
      and (v_q is null or s.title ilike '%' || v_q || '%' or c.name ilike '%' || v_q || '%'
           or coalesce(v.name, '') ilike '%' || v_q || '%'
           or coalesce(t.name, '') ilike '%' || v_q || '%'
           or exists (select 1 from public.show_performers sp
                      left join public.comedians cm on cm.id = sp.comedian_id
                      left join public.comedy_groups g on g.id = sp.group_id
                      where sp.show_id = s.id and coalesce(cm.name, g.name) ilike '%' || v_q || '%'))
    order by case when v_period = 'past' then null else s.starts_at end asc,
             case when v_period = 'past' then s.starts_at end desc
    limit 500
  ) r;

  return jsonb_build_object('stats', v_stats, 'quality', v_quality, 'cities', v_cities, 'rows', v_rows);
end;
$$;

create or replace function public.admin_tours(p_q text, p_status text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_super_admin() then null else coalesce((
    select jsonb_agg(r order by r.first_at desc nulls last, lower(r.name))
    from (
      select t.id, t.slug, t.name, t.status::text as status, t.poster_url,
             coalesce(cm.name, g.name) as owner, case when t.group_id is null then 'comedian' else 'group' end as owner_kind,
             count(s.id) filter (where s.status <> 'cancelled') as shows,
             count(s.id) filter (where s.status in ('published', 'sold_out') and s.starts_at >= now()) as upcoming,
             count(s.id) filter (where s.status = 'published' and s.starts_at >= now() and coalesce(btrim(s.ticket_url), '') = '') as missing_ticket,
             count(distinct co.id) filter (where s.status <> 'cancelled') as countries,
             min(s.starts_at) filter (where s.status <> 'cancelled') as first_at,
             max(s.starts_at) filter (where s.status <> 'cancelled') as last_at
      from public.tours t
      left join public.comedians cm on cm.id = t.comedian_id
      left join public.comedy_groups g on g.id = t.group_id
      left join public.shows s on s.tour_id = t.id
      left join public.cities c on c.id = s.city_id
      left join public.countries co on co.id = c.country_id
      where (coalesce(p_status, '') = '' or t.status::text = p_status)
        and (nullif(btrim(coalesce(p_q, '')), '') is null
             or t.name ilike '%' || btrim(p_q) || '%' or coalesce(cm.name, g.name) ilike '%' || btrim(p_q) || '%')
      group by t.id, cm.name, g.name
      limit 300
    ) r
  ), '[]'::jsonb) end;
$$;

-- Tour name and/or poster, once for the whole tour. Its dates show the tour
-- poster unless they have their own. Returns 'ok', 'bad_name' or 'not_found'.
create or replace function public.admin_update_tour(p_id uuid, p_name text, p_poster_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if not private.is_super_admin() then
    raise exception 'not allowed';
  end if;
  if v_name = '' or length(v_name) > 120 then
    return 'bad_name';
  end if;
  update public.tours
     set name = v_name,
         poster_url = coalesce(nullif(btrim(coalesce(p_poster_url, '')), ''), poster_url)
   where id = p_id;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- Ticked tour dates drop their own poster and show the tour poster again.
create or replace function public.admin_use_tour_poster(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not private.is_super_admin() then
    raise exception 'not allowed';
  end if;
  update public.shows
     set poster_url = null, updated_by = (select auth.uid())
   where id = any(p_ids) and tour_id is not null and poster_url is not null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.admin_shows(text, text, text, uuid, text, text) from public;
revoke all on function public.admin_update_tour(uuid, text, text) from public;
revoke all on function public.admin_use_tour_poster(uuid[]) from public;
grant execute on function public.admin_shows(text, text, text, uuid, text, text) to authenticated;
grant execute on function public.admin_update_tour(uuid, text, text) to authenticated;
grant execute on function public.admin_use_tour_poster(uuid[]) to authenticated;

revoke execute on function public.admin_shows(text, text, text, uuid, text, text), public.admin_update_tour(uuid, text, text), public.admin_use_tour_poster(uuid[]) from anon;
