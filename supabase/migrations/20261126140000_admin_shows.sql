-- Super admin panel, part 4 (spec 11.5 item 4): Shows and tours.
-- Tabs Shows / Tours / Podcasts / Venues. Every function needs a super admin
-- with 2-step verification (private.is_super_admin).

-- ---------------------------------------------------------------------------
-- Shows list.
-- p_zone: '' | 'local' | 'outbound' | 'inbound'
-- p_status: '' | a show status | 'asked' (a signal change was asked)
-- p_city: null or a city id
-- p_period: 'upcoming' | 'week' | 'month' | 'past' | 'all'
-- Returns {"stats", "quality", "cities", "rows"} (at most 300 rows).
-- ---------------------------------------------------------------------------
create or replace function public.admin_shows(p_q text, p_zone text, p_status text, p_city uuid, p_period text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_period text := coalesce(nullif(p_period, ''), 'upcoming');
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
           'cancelled', count(*) filter (where s.status = 'cancelled')),
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
    where (coalesce(p_zone, '') = '' or s.zone::text = p_zone)
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
           or exists (select 1 from public.show_performers sp
                      left join public.comedians cm on cm.id = sp.comedian_id
                      left join public.comedy_groups g on g.id = sp.group_id
                      where sp.show_id = s.id and coalesce(cm.name, g.name) ilike '%' || v_q || '%'))
    order by case when v_period = 'past' then null else s.starts_at end asc,
             case when v_period = 'past' then s.starts_at end desc
    limit 300
  ) r;

  return jsonb_build_object('stats', v_stats, 'quality', v_quality, 'cities', v_cities, 'rows', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- Set the signal of one or more shows. Setting a signal also answers any
-- signal change request. Returns the number of shows changed.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_show_signal(p_ids uuid[], p_signal text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not private.is_super_admin() or p_signal not in ('none', 'new', 'strong', 'fading') then
    return 0;
  end if;
  update public.shows
  set signal = p_signal::public.show_signal, signal_request = null, updated_by = (select auth.uid())
  where id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Decline a signal change request (the signal stays as it is).
create or replace function public.admin_decline_signal_request(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  update public.shows set signal_request = null where id = p_id and signal_request is not null;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status of one or more shows. p_status: a show status. Bulk "Unpublish"
-- sends 'draft'. Returns the number of shows changed.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_show_status(p_ids uuid[], p_status text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not private.is_super_admin() or p_status not in ('draft', 'pending', 'published', 'sold_out', 'cancelled') then
    return 0;
  end if;
  update public.shows
  set status = p_status::public.show_status, updated_by = (select auth.uid())
  where id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Ticket link of one show ('' removes it). Only http(s) links.
create or replace function public.admin_set_ticket_link(p_id uuid, p_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if v_url is not null and (v_url !~* '^https?://[^\s/]+\.[^\s]+$' or length(v_url) > 500) then
    return 'bad_url';
  end if;
  update public.shows set ticket_url = v_url, updated_by = (select auth.uid()) where id = p_id;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tours, podcasts and venues lists. p_status: '' or a content status.
-- ---------------------------------------------------------------------------
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
      select t.id, t.slug, t.name, t.status::text as status,
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

create or replace function public.admin_podcasts(p_q text, p_status text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_super_admin() then null else coalesce((
    select jsonb_agg(r order by lower(r.name))
    from (
      select p.id, p.slug, p.name, p.status::text as status, p.is_active,
             (select string_agg(cm.name, ', ' order by ph.display_order)
                from public.podcast_hosts ph join public.comedians cm on cm.id = ph.comedian_id
               where ph.podcast_id = p.id and ph.link_status = 'accepted') as hosts,
             (num_nonnulls(nullif(p.apple_podcasts_url, ''), nullif(p.spotify_url, ''), nullif(p.anghami_url, ''),
                           nullif(p.podu_url, ''), nullif(p.youtube_url, ''))) as links
      from public.podcasts p
      where (coalesce(p_status, '') = '' or p.status::text = p_status)
        and (nullif(btrim(coalesce(p_q, '')), '') is null or p.name ilike '%' || btrim(p_q) || '%'
             or exists (select 1 from public.podcast_hosts ph join public.comedians cm on cm.id = ph.comedian_id
                        where ph.podcast_id = p.id and cm.name ilike '%' || btrim(p_q) || '%'))
      limit 300
    ) r
  ), '[]'::jsonb) end;
$$;

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
             v.address, v.map_url,
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

-- Status of a tour, podcast or venue. p_kind: 'tour' | 'podcast' | 'venue'.
create or replace function public.admin_set_content_status(p_kind text, p_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if p_status not in ('draft', 'pending', 'published', 'archived') then
    return 'not_found';
  end if;
  if p_kind = 'tour' then
    update public.tours set status = p_status::public.content_status where id = p_id;
  elsif p_kind = 'podcast' then
    update public.podcasts set status = p_status::public.content_status where id = p_id;
  elsif p_kind = 'venue' then
    update public.venues set status = p_status::public.content_status where id = p_id;
  else
    return 'not_found';
  end if;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

revoke all on function public.admin_shows(text, text, text, uuid, text) from public;
revoke all on function public.admin_set_show_signal(uuid[], text) from public;
revoke all on function public.admin_decline_signal_request(uuid) from public;
revoke all on function public.admin_set_show_status(uuid[], text) from public;
revoke all on function public.admin_set_ticket_link(uuid, text) from public;
revoke all on function public.admin_tours(text, text) from public;
revoke all on function public.admin_podcasts(text, text) from public;
revoke all on function public.admin_venues(text, text) from public;
revoke all on function public.admin_set_content_status(text, uuid, text) from public;
grant execute on function public.admin_shows(text, text, text, uuid, text) to authenticated;
grant execute on function public.admin_set_show_signal(uuid[], text) to authenticated;
grant execute on function public.admin_decline_signal_request(uuid) to authenticated;
grant execute on function public.admin_set_show_status(uuid[], text) to authenticated;
grant execute on function public.admin_set_ticket_link(uuid, text) to authenticated;
grant execute on function public.admin_tours(text, text) to authenticated;
grant execute on function public.admin_podcasts(text, text) to authenticated;
grant execute on function public.admin_venues(text, text) to authenticated;
grant execute on function public.admin_set_content_status(text, uuid, text) to authenticated;
