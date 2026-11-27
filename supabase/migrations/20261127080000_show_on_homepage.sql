-- "Show on homepage" flag for shows and tour dates (Dina, 2026-11-27).
-- The homepage "Coming up" section lists only shows with the flag on.
-- Every show starts with the flag on: new shows, new tour dates and all existing shows.
-- Only the super admin turns it off (house icon in Admin > Shows and tours).

alter table public.shows add column if not exists on_homepage boolean not null default true;

-- Creators cannot change the flag: a new show always starts on, an edit keeps the old value.
create or replace function private.guard_show_homepage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_restricted_user() then
    if tg_op = 'INSERT' then
      new.on_homepage := true;
    else
      new.on_homepage := old.on_homepage;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_show_homepage on public.shows;
create trigger guard_show_homepage before insert or update on public.shows
  for each row execute function private.guard_show_homepage();

-- Public list of upcoming shows: same as before, plus on_homepage at the end.
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
  case when s.poster_url is not null or s.poster_tall_url is not null
       then coalesce(s.poster_url, s.poster_tall_url)
       else coalesce(t.poster_url, t.poster_tall_url) end as poster_url,
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
  s.language,
  s.on_homepage
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


-- Admin list rows: same as before, plus on_homepage.
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

-- Turn the flag on or off for one show (super admin only).
create or replace function public.admin_set_show_homepage(p_id uuid, p_on boolean)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not private.is_super_admin() or p_on is null then
    return 0;
  end if;
  update public.shows
  set on_homepage = p_on, updated_by = (select auth.uid())
  where id = p_id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.admin_set_show_homepage(uuid, boolean) from public, anon;
grant execute on function public.admin_set_show_homepage(uuid, boolean) to authenticated;
