-- Ticket link referrals: count "Get tickets" clicks per ticket site
-- (ticketsmarche.com, tazkarti.com, ...) so the super admin can show ticket
-- sites how many buyers Comedy Radar sends them.
-- Like page_stats, only daily totals are kept; nothing about the visitor.

-- ---------------------------------------------------------------------------
-- One counter per day, show and ticket site.
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_clicks (
  day date not null default (now() at time zone 'Africa/Cairo')::date,
  show_id uuid not null references public.shows (id) on delete cascade,
  site text not null check (length(site) between 1 and 253),
  count integer not null default 0,
  primary key (show_id, site, day)
);
create index if not exists ticket_clicks_day_idx on public.ticket_clicks (day);
alter table public.ticket_clicks enable row level security;
-- No policies: read and written only through the functions below.
revoke all on public.ticket_clicks from anon, authenticated;

-- "ticketsmarche.com" from a ticket link (lower case, no "www."), or null.
create or replace function private.ticket_site(p_url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(lower(substring(p_url from '^[A-Za-z][A-Za-z0-9+.-]*://(?:[^@/?#]*@)?([^/:?#]+)')), '^www\.', ''), '');
$$;

-- ---------------------------------------------------------------------------
-- record_page_stat: same as before, and a ticket click also adds one to the
-- show's ticket site. The site is read from the show's own ticket link in the
-- database, never from the visitor's browser.
-- ---------------------------------------------------------------------------
create or replace function public.record_page_stat(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site text;
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

  if p_kind = 'ticket_click' then
    select private.ticket_site(s.ticket_url) into v_site from public.shows s where s.id = p_id;
    if v_site is not null then
      insert into public.ticket_clicks (show_id, site, count)
      values (p_id, v_site, 1)
      on conflict (show_id, site, day) do update set count = public.ticket_clicks.count + 1;
    end if;
  end if;
end;
$$;

revoke all on function public.record_page_stat(text, uuid) from public;
grant execute on function public.record_page_stat(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin overview: ticket clicks per ticket site in the last 30 days, most
-- clicks first. Returns null unless the caller is a super admin.
-- ---------------------------------------------------------------------------
create or replace function public.admin_ticket_sites()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since date := (now() at time zone 'Africa/Cairo')::date - 29;
begin
  if not private.is_super_admin() then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('site', t.site, 'clicks', t.clicks, 'shows', t.shows) order by t.clicks desc, t.site)
    from (select site, sum(count)::int as clicks, count(distinct show_id)::int as shows
          from public.ticket_clicks
          where day >= v_since
          group by site
          order by sum(count) desc, site
          limit 8) t), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_ticket_sites() from public;
grant execute on function public.admin_ticket_sites() to authenticated;
