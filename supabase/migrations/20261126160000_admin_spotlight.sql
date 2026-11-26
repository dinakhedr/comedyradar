-- Super admin panel, part 6 (spec 11.5 item 6) and Spotlight tracking
-- (spec 9, rule 8): views and ticket clicks per placement, placements,
-- the order of the live slides, and the carousel settings.

-- ---------------------------------------------------------------------------
-- Tracking. The homepage carousel sends 'spotlight_view' (a placement's slide
-- was shown) and 'spotlight_click' (a link on it was pressed). They add one to
-- the show's live placement. Other kinds work as before.
-- ---------------------------------------------------------------------------
create or replace function public.record_page_stat(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_id is null then
    return;
  end if;

  if p_kind in ('spotlight_view', 'spotlight_click') then
    update public.spotlight_placements sp
    set impressions = sp.impressions + case when p_kind = 'spotlight_view' then 1 else 0 end,
        clicks = sp.clicks + case when p_kind = 'spotlight_click' then 1 else 0 end
    where sp.id = (select p.id from public.spotlight_placements p
                   where p.show_id = p_id and now() between p.starts_at and p.ends_at
                   order by p.priority desc, p.starts_at limit 1);
    return;
  end if;

  if not (
    (p_kind = 'comedian_view' and exists (select 1 from public.comedians where id = p_id and status = 'published'))
    or (p_kind = 'group_view' and exists (select 1 from public.comedy_groups where id = p_id and status = 'published'))
    or (p_kind = 'tour_view' and exists (select 1 from public.tours where id = p_id and status = 'published'))
    or (p_kind in ('show_view', 'ticket_click')
        and exists (select 1 from public.shows where id = p_id and status in ('published', 'sold_out', 'cancelled')))
  ) then
    return;
  end if;

  insert into public.page_stats (kind, entity_id, count)
  values (p_kind, p_id, 1)
  on conflict (entity_id, kind, day) do update set count = public.page_stats.count + 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- The Spotlight page. Returns {"stats", "live", "placements", "settings"}.
-- live = placements showing now, in carousel order (priority, then date).
-- ---------------------------------------------------------------------------
create or replace function public.admin_spotlight()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select sp.*, s.title, s.slug, s.starts_at as show_at, s.status::text as show_status, c.name as city,
           case when now() between sp.starts_at and sp.ends_at and s.starts_at > now() and s.status = 'published' then 'live'
                when sp.starts_at > now() and sp.ends_at > now() then 'scheduled'
                else 'ended' end as state
    from public.spotlight_placements sp
    join public.shows s on s.id = sp.show_id
    join public.cities c on c.id = s.city_id
  )
  select case when not private.is_super_admin() then null else jsonb_build_object(
    'stats', jsonb_build_object(
      'live', (select count(*) from p where state = 'live'),
      'scheduled', (select count(*) from p where state = 'scheduled'),
      'views', (select coalesce(sum(impressions), 0) from p where ends_at >= now() - interval '30 days'),
      'clicks', (select coalesce(sum(clicks), 0) from p where ends_at >= now() - interval '30 days'),
      'revenue', (select coalesce(sum(amount), 0) from p where is_paid and currency = 'EGP')),
    'live', coalesce((select jsonb_agg(to_jsonb(p) order by p.priority desc, p.show_at) from p where state = 'live'), '[]'::jsonb),
    'placements', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.state <> 'live', x.state <> 'scheduled', x.starts_at desc)
      from (select * from p order by (state = 'ended'), starts_at desc limit 200) x), '[]'::jsonb),
    'settings', jsonb_build_object(
      'slides', coalesce((select (value #>> '{}')::int from public.site_settings where key = 'spotlight_slides'), 5),
      'seconds', coalesce((select (value #>> '{}')::int from public.site_settings where key = 'spotlight_autoadvance_s'), 6))
  ) end;
$$;

-- Upcoming published shows for the "New placement" picker.
create or replace function public.admin_spotlight_shows(p_q text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_super_admin() then null else coalesce((
    select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'starts_at', s.starts_at, 'city', c.name) order by s.starts_at)
    from (select * from public.shows s
          where s.status = 'published' and s.starts_at > now()
            and (nullif(btrim(coalesce(p_q, '')), '') is null or s.title ilike '%' || btrim(p_q) || '%')
          order by s.starts_at limit 20) s
    join public.cities c on c.id = s.city_id), '[]'::jsonb) end;
$$;

-- ---------------------------------------------------------------------------
-- Add or change a placement. p_id null = new. The end is never later than the
-- show start (a placement ends automatically when the show begins).
-- Returns 'ok', 'bad_dates', 'not_found' or 'forbidden'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_placement(
  p_id uuid, p_show_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_priority int,
  p_preferred_slide int, p_is_paid boolean, p_amount numeric, p_currency text, p_client text, p_notes text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_show_at timestamptz;
  v_start timestamptz := coalesce(p_starts_at, now());
  v_end timestamptz;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select starts_at into v_show_at from public.shows where id = p_show_id and status = 'published';
  if v_show_at is null then
    return 'not_found';
  end if;
  v_end := least(coalesce(p_ends_at, v_show_at), v_show_at);
  if v_end <= v_start or v_show_at <= now() then
    return 'bad_dates';
  end if;

  if p_id is null then
    insert into public.spotlight_placements (show_id, starts_at, ends_at, priority, preferred_slide, is_paid, amount, currency, client_name, notes)
    values (p_show_id, v_start, v_end, coalesce(p_priority, 0),
            case when p_preferred_slide between 1 and 5 then p_preferred_slide end,
            coalesce(p_is_paid, false), case when p_is_paid then p_amount end,
            coalesce(nullif(btrim(p_currency), ''), 'EGP'),
            nullif(btrim(coalesce(p_client, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''));
  else
    update public.spotlight_placements
    set show_id = p_show_id, starts_at = v_start, ends_at = v_end, priority = coalesce(p_priority, 0),
        preferred_slide = case when p_preferred_slide between 1 and 5 then p_preferred_slide end,
        is_paid = coalesce(p_is_paid, false), amount = case when p_is_paid then p_amount end,
        currency = coalesce(nullif(btrim(p_currency), ''), 'EGP'),
        client_name = nullif(btrim(coalesce(p_client, '')), ''), notes = nullif(btrim(coalesce(p_notes, '')), '')
    where id = p_id;
    if not found then
      return 'not_found';
    end if;
  end if;
  return 'ok';
end;
$$;

-- End a placement now (live), or remove it (scheduled, not started yet).
create or replace function public.admin_end_placement(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  delete from public.spotlight_placements where id = p_id and starts_at > now();
  if found then
    return 'removed';
  end if;
  update public.spotlight_placements set ends_at = now() where id = p_id and ends_at > now();
  return case when found then 'ended' else 'not_found' end;
end;
$$;

-- Move a live slide one place earlier ('up') or later ('down'). The live
-- slides get fresh priorities in their new order, highest first.
create or replace function public.admin_move_placement(p_id uuid, p_dir text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_i int;
  v_j int;
  v_tmp uuid;
  v_n int;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select array_agg(sp.id order by sp.priority desc, s.starts_at) into v_ids
  from public.spotlight_placements sp join public.shows s on s.id = sp.show_id
  where now() between sp.starts_at and sp.ends_at and s.starts_at > now() and s.status = 'published';
  v_i := array_position(v_ids, p_id);
  if v_i is null then
    return 'not_found';
  end if;
  v_j := case when p_dir = 'up' then v_i - 1 when p_dir = 'down' then v_i + 1 end;
  v_n := array_length(v_ids, 1);
  if v_j is null or v_j < 1 or v_j > v_n then
    return 'ok';
  end if;
  v_tmp := v_ids[v_i];
  v_ids[v_i] := v_ids[v_j];
  v_ids[v_j] := v_tmp;
  update public.spotlight_placements sp
  set priority = (v_n - array_position(v_ids, sp.id) + 1) * 10
  where sp.id = any(v_ids);
  return 'ok';
end;
$$;

-- Carousel settings: number of slides (1–5) and auto-advance seconds (3–20).
create or replace function public.admin_spotlight_settings(p_slides int, p_seconds int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if p_slides not between 1 and 5 or p_seconds not between 3 and 20 then
    return 'bad_value';
  end if;
  insert into public.site_settings (key, value, updated_by, updated_at)
  values ('spotlight_slides', to_jsonb(p_slides), (select auth.uid()), now()),
         ('spotlight_autoadvance_s', to_jsonb(p_seconds), (select auth.uid()), now())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  return 'ok';
end;
$$;

revoke all on function public.admin_spotlight() from public;
revoke all on function public.admin_spotlight_shows(text) from public;
revoke all on function public.admin_save_placement(uuid, uuid, timestamptz, timestamptz, int, int, boolean, numeric, text, text, text) from public;
revoke all on function public.admin_end_placement(uuid) from public;
revoke all on function public.admin_move_placement(uuid, text) from public;
revoke all on function public.admin_spotlight_settings(int, int) from public;
grant execute on function public.admin_spotlight() to authenticated;
grant execute on function public.admin_spotlight_shows(text) to authenticated;
grant execute on function public.admin_save_placement(uuid, uuid, timestamptz, timestamptz, int, int, boolean, numeric, text, text, text) to authenticated;
grant execute on function public.admin_end_placement(uuid) to authenticated;
grant execute on function public.admin_move_placement(uuid, text) to authenticated;
grant execute on function public.admin_spotlight_settings(int, int) to authenticated;
