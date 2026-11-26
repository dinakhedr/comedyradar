-- Comedy Radar: helper views (docs/website-spec.md, section 10).
-- All views use security_invoker, so the RLS rules of the person asking apply.

-- Upcoming public shows with venue, city, country and headliner.
-- display_signal: 'new' only lasts for new_signal_days (site setting, default 7).
create view public.v_upcoming_shows
with (security_invoker = true)
as
select
  s.id,
  s.slug,
  s.title,
  s.starts_at,
  s.ends_at,
  s.status,
  s.zone,
  s.signal,
  case
    when s.signal = 'new'
     and s.created_at < now() - make_interval(days => coalesce(
           (select (st.value #>> '{}')::int from public.site_settings st where st.key = 'new_signal_days'), 7))
    then 'none'::public.show_signal
    else s.signal
  end as display_signal,
  s.ticket_url,
  s.poster_url,
  s.tour_id,
  s.created_at,
  c.id   as city_id,
  c.name as city_name,
  c.slug as city_slug,
  co.code as country_code,
  co.name as country_name,
  v.name as venue_name,
  v.slug as venue_slug,
  h.performer_type as headliner_type,
  h.performer_id   as headliner_id,
  h.name           as headliner_name,
  h.slug           as headliner_slug,
  h.photo_url      as headliner_photo_url,
  coalesce(p.comedian_ids, '{}') as comedian_ids,
  coalesce(p.group_ids, '{}')    as group_ids,
  coalesce(p.performer_count, 0) as performer_count
from public.shows s
join public.cities c on c.id = s.city_id
join public.countries co on co.id = c.country_id
left join public.venues v on v.id = s.venue_id and v.status = 'published'
left join lateral (
  select
    case when sp.group_id is not null then 'group' else 'comedian' end as performer_type,
    coalesce(g.id, cm.id) as performer_id,
    coalesce(g.name, cm.name) as name,
    coalesce(g.slug, cm.slug) as slug,
    coalesce(g.photo_url, cm.photo_url) as photo_url
  from public.show_performers sp
  left join public.comedy_groups g on g.id = sp.group_id and g.status = 'published'
  left join public.comedians cm on cm.id = sp.comedian_id and cm.status = 'published'
  where sp.show_id = s.id
    and sp.link_status = 'accepted'
    and coalesce(g.id, cm.id) is not null
  order by sp.billing_order, sp.id
  limit 1
) h on true
left join lateral (
  select
    array_agg(sp.comedian_id) filter (where sp.comedian_id is not null) as comedian_ids,
    array_agg(sp.group_id) filter (where sp.group_id is not null) as group_ids,
    count(*)::int as performer_count
  from public.show_performers sp
  left join public.comedy_groups g on g.id = sp.group_id and g.status = 'published'
  left join public.comedians cm on cm.id = sp.comedian_id and cm.status = 'published'
  where sp.show_id = s.id
    and sp.link_status = 'accepted'
    and coalesce(g.id, cm.id) is not null
) p on true
where s.status in ('published', 'sold_out')
  and s.starts_at >= now()
order by s.starts_at;

-- Tours with owner, date range, number of shows and cities;
-- only tours with at least one upcoming show.
create view public.v_tours
with (security_invoker = true)
as
select
  t.id,
  t.slug,
  t.name,
  t.description,
  t.poster_url,
  t.created_at,
  case when t.group_id is not null then 'group' else 'comedian' end as owner_type,
  coalesce(g.id, cm.id)               as owner_id,
  coalesce(g.name, cm.name)           as owner_name,
  coalesce(g.slug, cm.slug)           as owner_slug,
  coalesce(g.photo_url, cm.photo_url) as owner_photo_url,
  stats.first_show_at,
  stats.last_show_at,
  stats.next_show_at,
  stats.show_count,
  stats.upcoming_count,
  stats.country_count,
  stats.cities,
  next_city.city_name as next_city_name
from public.tours t
left join public.comedy_groups g on g.id = t.group_id
left join public.comedians cm on cm.id = t.comedian_id
join lateral (
  select
    min(s.starts_at) as first_show_at,
    max(s.starts_at) as last_show_at,
    min(s.starts_at) filter (where s.starts_at >= now()) as next_show_at,
    count(*)::int as show_count,
    (count(*) filter (where s.starts_at >= now()))::int as upcoming_count,
    count(distinct c.country_id)::int as country_count,
    (
      select array_agg(x.name order by x.first_at)
      from (
        select c2.name, min(s2.starts_at) as first_at
        from public.shows s2
        join public.cities c2 on c2.id = s2.city_id
        where s2.tour_id = t.id and s2.status in ('published', 'sold_out')
        group by c2.name
      ) x
    ) as cities
  from public.shows s
  join public.cities c on c.id = s.city_id
  where s.tour_id = t.id and s.status in ('published', 'sold_out')
) stats on true
left join lateral (
  select c3.name as city_name
  from public.shows s3
  join public.cities c3 on c3.id = s3.city_id
  where s3.tour_id = t.id and s3.status in ('published', 'sold_out') and s3.starts_at >= now()
  order by s3.starts_at
  limit 1
) next_city on true
where t.status = 'published'
  and coalesce(g.status, cm.status) = 'published'
  and stats.upcoming_count > 0
order by stats.next_show_at;

-- Active spotlight placements with show data, ordered by priority then date.
-- The fallback (strong signal shows, then soonest shows) runs in server code.
create view public.v_spotlight
with (security_invoker = true)
as
select
  sp.id as placement_id,
  sp.priority,
  sp.preferred_slide,
  sp.is_paid,
  sp.starts_at as placement_starts_at,
  sp.ends_at   as placement_ends_at,
  u.*
from public.spotlight_placements sp
join public.v_upcoming_shows u on u.id = sp.show_id
where now() between sp.starts_at and sp.ends_at
  and u.starts_at > now()
order by sp.priority desc, u.starts_at;

-- For each comedian: their solo / lineup shows plus the shows of groups
-- they currently belong to (via_group = true).
create view public.v_comedian_shows
with (security_invoker = true)
as
select
  sp.comedian_id,
  false as via_group,
  null::uuid as group_id,
  s.id as show_id,
  s.slug,
  s.title,
  s.starts_at,
  s.status,
  s.tour_id
from public.show_performers sp
join public.shows s on s.id = sp.show_id
where sp.comedian_id is not null
  and sp.link_status = 'accepted'
union all
select
  gm.comedian_id,
  true as via_group,
  gm.group_id,
  s.id as show_id,
  s.slug,
  s.title,
  s.starts_at,
  s.status,
  s.tour_id
from public.group_members gm
join public.show_performers sp on sp.group_id = gm.group_id and sp.link_status = 'accepted'
join public.shows s on s.id = sp.show_id
where gm.link_status = 'accepted'
  and gm.left_on is null;

grant select on public.v_upcoming_shows, public.v_tours, public.v_spotlight, public.v_comedian_shows
  to anon, authenticated, service_role;
