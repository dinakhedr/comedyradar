-- Two posters for shows and tours (Dina, 2026-11-27).
--   poster_url       = the WIDE poster (16:9). Used everywhere: Spotlight, cards, lists, search, tour banners.
--   poster_tall_url  = the TALL poster (4:5). Used only on the single show page and single tour page.
-- If only one is there, it is used everywhere (the site shows it whole with a blurred fill).
-- Existing posters stay in poster_url, so they become the wide one.
-- A tour date with any poster of its own uses its own; otherwise it uses the tour's.

alter table public.shows add column if not exists poster_tall_url text;
alter table public.tours add column if not exists poster_tall_url text;

-- Cards and lists: the wide poster, else the tall one.
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

create or replace view public.v_tours
with (security_invoker = true)
as
select
  t.id,
  t.slug,
  t.name,
  t.description,
  coalesce(t.poster_url, t.poster_tall_url) as poster_url,
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
;

-- Admin lists: a show or tour with only a tall poster still counts as having a poster.
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
           s.tour_id, coalesce(s.poster_url, s.poster_tall_url) as poster_url,
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
      select t.id, t.slug, t.name, t.status::text as status, coalesce(t.poster_url, t.poster_tall_url) as poster_url,
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

-- Tours tab > pencil: name, wide poster and tall poster for the whole tour.
-- Empty poster = keep the current one. (The 3-argument version stays for the live site.)
create or replace function public.admin_update_tour(p_id uuid, p_name text, p_poster_url text, p_poster_tall_url text)
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
         poster_url = coalesce(nullif(btrim(coalesce(p_poster_url, '')), ''), poster_url),
         poster_tall_url = coalesce(nullif(btrim(coalesce(p_poster_tall_url, '')), ''), poster_tall_url)
   where id = p_id;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- Ticked tour dates drop both their own posters and show the tour posters again.
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
     set poster_url = null, poster_tall_url = null, updated_by = (select auth.uid())
   where id = any(p_ids) and tour_id is not null
     and (poster_url is not null or poster_tall_url is not null);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.admin_update_tour(uuid, text, text, text) from public;
grant execute on function public.admin_update_tour(uuid, text, text, text) to authenticated;
revoke execute on function public.admin_update_tour(uuid, text, text, text) from anon;

-- Review queue: a show with only a tall poster still counts as having a poster.
create or replace function public.admin_review_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pending jsonb;
  v_done jsonb;
begin
  if not private.is_super_admin() then
    return null;
  end if;

  with items as (
    -- Claims
    select 'claims'::text as type, r.id, r.created_at,
           coalesce(c.name, g.name) as title,
           coalesce(a.display_name, u.email) as sub,
           case r.proof_method
             when 'official_dm' then 'DM from @' || coalesce(r.proof_value, '?')
             when 'comedian_confirms' then case when r.confirmed_at is not null then 'Confirmed by ' || r.confirmed_by_name else 'Not confirmed yet' end
             when 'document' then 'Document uploaded'
             else coalesce(r.proof_method, 'No proof')
           end as flag,
           jsonb_build_object(
             'profile', jsonb_build_object(
               'kind', case when r.comedian_id is not null then 'comedian' else 'group' end,
               'id', coalesce(r.comedian_id, r.group_id),
               'name', coalesce(c.name, g.name), 'slug', coalesce(c.slug, g.slug),
               'status', coalesce(c.status, g.status), 'verified', coalesce(c.verified, g.verified),
               'instagram_url', coalesce(c.instagram_url, g.instagram_url),
               'admins', (select count(*) from public.profile_access pa
                          where pa.status = 'active' and pa.role = 'admin'
                            and (pa.comedian_id = r.comedian_id or pa.group_id = r.group_id))),
             'claimant', jsonb_build_object(
               'name', a.display_name, 'email', u.email, 'account_type', a.account_type,
               'email_confirmed', u.email_confirmed_at is not null, 'created_at', a.created_at,
               'profiles', (select count(*) from public.profile_access pa where pa.account_id = r.account_id and pa.status = 'active')),
             'claim', jsonb_build_object(
               'relation', r.relation, 'role', r.role, 'proof_method', r.proof_method, 'proof_value', r.proof_value,
               'proof_file_path', r.proof_file_path, 'confirmed_at', r.confirmed_at, 'confirmed_by_name', r.confirmed_by_name,
               'decision_reason', r.decision_reason, 'admin_note', r.admin_note),
             'checks', jsonb_build_object(
               'other_open_claims', (select count(*) from public.access_requests o
                                     where o.type = 'claim' and o.status = 'pending' and o.id <> r.id
                                       and (o.comedian_id = r.comedian_id or o.group_id = r.group_id)),
               'handle_matches', r.proof_method = 'official_dm' and r.proof_value is not null
                                 and lower(coalesce(c.instagram_url, g.instagram_url, '')) ~ ('instagram\.com/' || lower(r.proof_value) || '/?$'))
           ) as detail
    from public.access_requests r
    left join public.comedians c on c.id = r.comedian_id
    left join public.comedy_groups g on g.id = r.group_id
    left join public.accounts a on a.id = r.account_id
    left join auth.users u on u.id = r.account_id
    where r.type = 'claim' and r.status = 'pending'

    union all
    -- New profiles (comedians and groups waiting for review)
    select 'profiles', p.id, p.created_at, p.name,
           coalesce(a.display_name, u.email, 'Unknown'),
           p.kind,
           jsonb_build_object(
             'kind', p.kind, 'name', p.name, 'name_ar', p.name_ar, 'slug', p.slug, 'bio', p.bio,
             'photo_url', p.photo_url, 'instagram_url', p.instagram_url,
             'created_by', coalesce(a.display_name, u.email), 'created_by_email', u.email,
             'same_name', (select count(*) from public.comedians x where lower(x.name) = lower(p.name) and x.id <> p.id)
                        + (select count(*) from public.comedy_groups x where lower(x.name) = lower(p.name) and x.id <> p.id))
    from (
      select 'comedian'::text as kind, id, created_at, name, name_ar, slug, bio, photo_url, instagram_url, created_by
      from public.comedians where status = 'pending'
      union all
      select 'group', id, created_at, name, name_ar, slug, bio, photo_url, instagram_url, created_by
      from public.comedy_groups where status = 'pending'
    ) p
    left join public.accounts a on a.id = p.created_by
    left join auth.users u on u.id = p.created_by

    union all
    -- Shows waiting for review
    select 'shows', s.id, s.created_at, s.title,
           coalesce(perf.names, 'No performer'),
           case when s.ticket_url is null then 'No ticket link' else 'Ticket link' end,
           jsonb_build_object(
             'title', s.title, 'slug', s.slug, 'starts_at', s.starts_at, 'city', ci.name, 'venue', v.name,
             'ticket_url', s.ticket_url, 'price_min', s.price_min, 'price_max', s.price_max, 'currency', s.currency,
             'performers', perf.names, 'any_verified', coalesce(perf.any_verified, false),
             'created_by', coalesce(a.display_name, u.email), 'poster_url', coalesce(s.poster_url, s.poster_tall_url))
    from public.shows s
    left join public.cities ci on ci.id = s.city_id
    left join public.venues v on v.id = s.venue_id
    left join public.accounts a on a.id = s.created_by
    left join auth.users u on u.id = s.created_by
    left join lateral (
      select string_agg(coalesce(c.name, g.name), ', ' order by sp.billing_order) as names,
             bool_or(coalesce(c.verified, g.verified)) as any_verified
      from public.show_performers sp
      left join public.comedians c on c.id = sp.comedian_id
      left join public.comedy_groups g on g.id = sp.group_id
      where sp.show_id = s.id
    ) perf on true
    where s.status = 'pending'

    union all
    -- Venues suggested by creators
    select 'venues', v.id, null::timestamptz, v.name, ci.name, 'Suggested venue',
           jsonb_build_object('name', v.name, 'city', ci.name, 'address', v.address, 'map_url', v.map_url,
                              'suggested_by', coalesce(a.display_name, u.email),
                              'same_name', (select count(*) from public.venues x where lower(x.name) = lower(v.name) and x.id <> v.id))
    from public.venues v
    join public.cities ci on ci.id = v.city_id
    left join public.accounts a on a.id = v.created_by
    left join auth.users u on u.id = v.created_by
    where v.status = 'pending'

    union all
    -- Name changes on verified profiles
    select 'names', n.id, n.created_at, coalesce(n.old_name, '?') || ' → ' || n.name,
           coalesce(a.display_name, u.email, 'Unknown'),
           case when n.comedian_id is not null then 'comedian' else 'group' end,
           jsonb_build_object('kind', case when n.comedian_id is not null then 'comedian' else 'group' end,
                              'old_name', n.old_name, 'name', n.name, 'old_name_ar', n.old_name_ar, 'name_ar', n.name_ar,
                              'slug', coalesce(c.slug, g.slug), 'requested_by', coalesce(a.display_name, u.email))
    from public.profile_name_changes n
    left join public.comedians c on c.id = n.comedian_id
    left join public.comedy_groups g on g.id = n.group_id
    left join public.accounts a on a.id = n.requested_by
    left join auth.users u on u.id = n.requested_by
    where n.status = 'pending'
  )
  select coalesce(jsonb_agg(jsonb_build_object('type', type, 'id', id, 'created_at', created_at, 'title', title, 'sub', sub, 'flag', flag, 'detail', detail)
                            order by created_at nulls last), '[]'::jsonb)
  into v_pending
  from (select * from items order by created_at nulls last limit 300) i;

  -- Done: the latest decided claims and name changes.
  select coalesce(jsonb_agg(d order by (d ->> 'decided_at') desc), '[]'::jsonb)
  into v_done
  from (select d from (
    select jsonb_build_object('type', 'claims', 'id', r.id, 'title', coalesce(c.name, g.name), 'sub', coalesce(a.display_name, 'Unknown'),
                              'status', r.status, 'decided_at', r.decided_at, 'reason', r.decision_reason) as d
    from public.access_requests r
    left join public.comedians c on c.id = r.comedian_id
    left join public.comedy_groups g on g.id = r.group_id
    left join public.accounts a on a.id = r.account_id
    where r.type = 'claim' and r.status in ('approved', 'rejected') and r.decided_at is not null
    union all
    select jsonb_build_object('type', 'names', 'id', n.id, 'title', coalesce(n.old_name, '?') || ' → ' || n.name, 'sub', coalesce(a.display_name, 'Unknown'),
                              'status', n.status, 'decided_at', n.decided_at, 'reason', n.decision_reason)
    from public.profile_name_changes n
    left join public.accounts a on a.id = n.requested_by
    where n.status in ('approved', 'rejected') and n.decided_at is not null
  ) u order by (d ->> 'decided_at') desc limit 50) x;

  return jsonb_build_object('pending', v_pending, 'done', v_done);
end;
$$;
