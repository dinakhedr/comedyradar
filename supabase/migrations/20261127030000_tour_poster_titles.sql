-- Tour dates use the tour's poster when the show has none of its own
-- (Dina, 2026-11-27). A show's own poster still wins.
-- Also: tour-date titles no longer get " — City" added; fix the old ones.

create or replace view public.v_upcoming_shows
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
  coalesce(s.poster_url, t.poster_url) as poster_url,
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
  coalesce(p.performer_count, 0) as performer_count,
  s.language
from public.shows s
join public.cities c on c.id = s.city_id
join public.countries co on co.id = c.country_id
left join public.venues v on v.id = s.venue_id and v.status = 'published'
left join public.tours t on t.id = s.tour_id
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

-- "Ana zay el fol maly — Giza" → "Ana zay el fol maly" (only titles made by the old pattern).
update public.shows s
set title = t.name
from public.tours t, public.cities c
where t.id = s.tour_id
  and c.id = s.city_id
  and s.title = t.name || ' — ' || c.name;
