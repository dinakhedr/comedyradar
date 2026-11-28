-- Admin > Shows filters: a Comedian filter (replaces Zone in the page) and a
-- many-city filter (country + city checklist) instead of one city.
-- New 7-argument admin_shows. The old 6-argument one stays until this is live,
-- because the current site still calls it.

create or replace function public.admin_shows(p_q text, p_zone text, p_status text, p_cities uuid[], p_comedian uuid, p_period text, p_kind text)
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
  v_comedians jsonb;
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

  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'country_code', co.code, 'country', co.name)
                            order by co.code <> 'EG', co.name, c.name), '[]'::jsonb)
  into v_cities
  from public.cities c join public.countries co on co.id = c.country_id
  where exists (select 1 from public.shows s where s.city_id = c.id);

  -- Comedians who are on at least one show, with how many upcoming shows they have.
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'photo_url', x.photo_url, 'upcoming', x.upcoming)
                            order by lower(x.name)), '[]'::jsonb)
  into v_comedians
  from (
    select cm.id, cm.name, cm.photo_url,
           count(distinct s.id) filter (where s.starts_at >= now()) as upcoming
    from public.comedians cm
    join public.show_performers sp on sp.comedian_id = cm.id
    join public.shows s on s.id = sp.show_id
    group by cm.id
  ) x;

  select coalesce(jsonb_agg(r order by
           case when v_period = 'past' then null else r.starts_at end asc,
           case when v_period = 'past' then r.starts_at end desc), '[]'::jsonb)
  into v_rows
  from (
    select s.id, s.slug, s.title, s.starts_at, s.status::text as status, s.signal::text as signal,
           s.signal_request::text as signal_request, s.zone::text as zone, s.ticket_url, s.source_type,
           c.name as city, co.code as country_code, v.name as venue, t.name as tour,
           s.tour_id, s.on_homepage, coalesce(s.poster_url, s.poster_tall_url) as poster_url,
           coalesce(t.poster_url, t.poster_tall_url) as tour_poster_url,
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
      and (coalesce(cardinality(p_cities), 0) = 0 or s.city_id = any(p_cities))
      and (p_comedian is null or exists (select 1 from public.show_performers sp
                                         where sp.show_id = s.id and sp.comedian_id = p_comedian))
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

  return jsonb_build_object('stats', v_stats, 'quality', v_quality, 'cities', v_cities, 'comedians', v_comedians, 'rows', v_rows);
end;
$$;

revoke all on function public.admin_shows(text, text, text, uuid[], uuid, text, text) from public;
revoke execute on function public.admin_shows(text, text, text, uuid[], uuid, text, text) from anon;
grant execute on function public.admin_shows(text, text, text, uuid[], uuid, text, text) to authenticated;
