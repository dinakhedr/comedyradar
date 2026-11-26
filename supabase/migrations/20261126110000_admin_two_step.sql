-- Super admin panel, part 1 (spec 11.5): a super admin needs 2-step
-- verification. Super admin rights apply only when the session passed the
-- second step (aal2 in the sign-in token); with a password alone the
-- account is treated like any other account.

create or replace function private.is_super_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists (
      select 1 from public.accounts a
      where a.id = (select auth.uid())
        and a.is_super_admin
        and not a.is_suspended
    );
$$;

-- ---------------------------------------------------------------------------
-- Admin overview (spec 11.5 item 1): every number on the page in one call.
-- Returns null unless the caller is a super admin with 2-step verification.
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
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

  return jsonb_build_object(
    'upcoming_shows', (select count(*) from public.shows where status in ('published', 'sold_out') and starts_at >= now()),
    'active_tours', (select count(*) from public.tours t where t.status = 'published'
                       and exists (select 1 from public.shows s where s.tour_id = t.id and s.starts_at >= now() and s.status in ('published', 'sold_out'))),
    'profiles', (select count(*) from public.comedians) + (select count(*) from public.comedy_groups),
    'profiles_verified', (select count(*) from public.comedians where verified) + (select count(*) from public.comedy_groups where verified),
    'profiles_no_admin',
      (select count(*) from public.comedians c where c.status = 'published' and not exists (
         select 1 from public.profile_access pa where pa.comedian_id = c.id and pa.status = 'active' and pa.role = 'admin'))
      + (select count(*) from public.comedy_groups g where g.status = 'published' and not exists (
         select 1 from public.profile_access pa where pa.group_id = g.id and pa.status = 'active' and pa.role = 'admin')),
    'creator_accounts', (select count(*) from public.accounts where not is_super_admin),
    'views_30', (select coalesce(sum(count), 0) from public.page_stats where day >= v_since and kind like '%\_view'),
    'clicks_30', (select coalesce(sum(count), 0) from public.page_stats where day >= v_since and kind = 'ticket_click'),
    'subscribers', (select count(*) from public.newsletter_subscribers),
    'spotlight_clicks_30', (select coalesce(sum(clicks), 0) from public.spotlight_placements where ends_at >= now() - interval '30 days'),
    'queue', jsonb_build_array(
      (select jsonb_build_object('type', 'claims', 'count', count(*), 'oldest', min(created_at))
         from public.access_requests where type = 'claim' and status = 'pending'),
      (select jsonb_build_object('type', 'profiles', 'count', count(*), 'oldest', min(created_at))
         from (select created_at from public.comedians where status = 'pending'
               union all select created_at from public.comedy_groups where status = 'pending') p),
      (select jsonb_build_object('type', 'shows', 'count', count(*), 'oldest', min(created_at))
         from public.shows where status = 'pending'),
      (select jsonb_build_object('type', 'venues', 'count', count(*), 'oldest', null)
         from public.venues where status = 'pending'),
      (select jsonb_build_object('type', 'names', 'count', count(*), 'oldest', min(created_at))
         from public.profile_name_changes where status = 'pending')
    ),
    'no_ticket_soon', coalesce((
      select jsonb_agg(jsonb_build_object('title', s.title, 'slug', s.slug, 'starts_at', s.starts_at) order by s.starts_at)
      from (select title, slug, starts_at from public.shows
            where status in ('published', 'sold_out') and ticket_url is null
              and starts_at between now() and now() + interval '7 days'
            order by starts_at limit 5) s), '[]'::jsonb),
    'no_ticket_soon_count', (select count(*) from public.shows where status in ('published', 'sold_out') and ticket_url is null
                               and starts_at between now() and now() + interval '7 days'),
    'seeded_no_admin', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug) order by c.name)
      from public.comedians c
      where c.seeded and c.status = 'published'
        and not exists (select 1 from public.profile_access pa where pa.comedian_id = c.id and pa.status = 'active' and pa.role = 'admin')
        and exists (select 1 from public.show_performers sp join public.shows s on s.id = sp.show_id
                    where sp.comedian_id = c.id and s.starts_at >= now() and s.status in ('published', 'sold_out'))), '[]'::jsonb),
    'spotlight_now', coalesce((
      select jsonb_agg(jsonb_build_object('title', s.title, 'slug', s.slug, 'is_paid', sp.is_paid, 'ends_at', sp.ends_at) order by sp.priority desc, sp.starts_at)
      from (select * from public.spotlight_placements where starts_at <= now() and ends_at > now() order by priority desc, starts_at limit 5) sp
      join public.shows s on s.id = sp.show_id), '[]'::jsonb),
    'recent_activity', coalesce((
      select jsonb_agg(jsonb_build_object('who', coalesce(a.display_name, 'System'), 'action', l.action, 'entity_type', l.entity_type, 'at', l.created_at) order by l.created_at desc)
      from (select * from public.activity_log order by created_at desc limit 8) l
      left join public.accounts a on a.id = l.account_id), '[]'::jsonb),
    'new_accounts_7', (select count(*) from public.accounts where created_at >= now() - interval '7 days'),
    'claims_approved_7', (select count(*) from public.access_requests where type = 'claim' and status = 'approved' and created_at >= now() - interval '7 days')
  );
end;
$$;

revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;
