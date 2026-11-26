-- Creator dashboard, part 1 (spec 11.4 item 3): page views and ticket clicks,
-- and the list of profiles the signed-in account manages.

-- ---------------------------------------------------------------------------
-- Page views and ticket clicks: one counter per day, kind and page.
-- No visitor data is stored, only the totals.
-- ---------------------------------------------------------------------------
create table public.page_stats (
  day date not null default (now() at time zone 'Africa/Cairo')::date,
  kind text not null check (kind in ('comedian_view', 'group_view', 'show_view', 'tour_view', 'ticket_click')),
  entity_id uuid not null,
  count integer not null default 0,
  primary key (entity_id, kind, day)
);
alter table public.page_stats enable row level security;
-- No policies: the table is read and written only through the functions below.
revoke all on public.page_stats from anon, authenticated;

-- Adds one to a counter. Called by the website when a public page opens or
-- "Get tickets" is pressed; only public pages are counted.
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

revoke all on function public.record_page_stat(text, uuid) from public;
grant execute on function public.record_page_stat(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles the signed-in account manages, with its role on each
-- (direct access, or a dashboard team membership with "All profiles").
-- ---------------------------------------------------------------------------
create or replace function public.my_profiles()
returns table (
  kind text,
  id uuid,
  name text,
  slug text,
  photo_url text,
  status public.content_status,
  verified boolean,
  role public.profile_role
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'comedian', c.id, c.name, c.slug, c.photo_url, c.status, c.verified,
         private.profile_role_for((select auth.uid()), c.id, null)
  from public.comedians c
  where private.profile_role_for((select auth.uid()), c.id, null) is not null
  union all
  select 'group', g.id, g.name, g.slug, g.photo_url, g.status, g.verified,
         private.profile_role_for((select auth.uid()), null, g.id)
  from public.comedy_groups g
  where private.profile_role_for((select auth.uid()), null, g.id) is not null
  order by 3;
$$;

revoke all on function public.my_profiles() from public;
grant execute on function public.my_profiles() to authenticated;

-- ---------------------------------------------------------------------------
-- Totals for the pages the signed-in account manages, since p_since.
-- ---------------------------------------------------------------------------
create or replace function public.my_page_stats(p_since date)
returns table (kind text, entity_id uuid, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select s.kind, s.entity_id, sum(s.count)::bigint
  from public.page_stats s
  where s.day >= p_since
    and private.is_active_account()
    and case s.kind
          when 'comedian_view' then private.can_manage_comedian(s.entity_id)
          when 'group_view' then private.can_manage_group(s.entity_id)
          when 'tour_view' then private.can_manage_tour(s.entity_id)
          else private.can_manage_show(s.entity_id)
        end
  group by s.kind, s.entity_id;
$$;

revoke all on function public.my_page_stats(date) from public;
grant execute on function public.my_page_stats(date) to authenticated;

comment on table public.page_stats is
  'Daily totals of public page views and "Get tickets" clicks, for the creator dashboard.';
