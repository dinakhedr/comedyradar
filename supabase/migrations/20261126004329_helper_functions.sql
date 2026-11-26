-- Comedy Radar: helper functions used by the security rules (RLS).
-- They live in the "private" schema, which the Data API does not expose,
-- so nobody can call them directly over the API. They are SECURITY DEFINER
-- so the rules can look up access without running into RLS themselves;
-- each one only answers questions about the signed-in user (auth.uid()).

grant usage on schema private to anon, authenticated, service_role;

-- Is the signed-in user an active super admin?
create or replace function private.is_super_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = (select auth.uid())
      and a.is_super_admin
      and not a.is_suspended
  );
$$;

-- Is the signed-in user an account that is not suspended?
create or replace function private.is_active_account()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = (select auth.uid()) and not a.is_suspended
  );
$$;

-- The highest role an account has on a profile (comedian OR group), or null.
-- (a) an active profile_access row, or
-- (b) an active dashboard team membership with scope 'all' whose owner is
--     admin of the profile (gives all_role).
-- Note: in the enum, 'admin' sorts before 'moderator', so min() = highest.
create or replace function private.profile_role_for(p_account uuid, p_comedian uuid, p_group uuid)
returns public.profile_role
language sql stable security definer set search_path = ''
as $$
  select min(r.role) from (
    select pa.role
    from public.profile_access pa
    join public.accounts acc on acc.id = pa.account_id and not acc.is_suspended
    where pa.account_id = p_account
      and pa.status = 'active'
      and (pa.comedian_id = p_comedian or pa.group_id = p_group)
    union all
    select dm.all_role
    from public.dashboard_members dm
    join public.accounts acc on acc.id = dm.member_account_id and not acc.is_suspended
    join public.profile_access owner_pa
      on owner_pa.account_id = dm.owner_account_id
     and owner_pa.status = 'active'
     and owner_pa.role = 'admin'
     and (owner_pa.comedian_id = p_comedian or owner_pa.group_id = p_group)
    where dm.member_account_id = p_account
      and dm.status = 'active'
      and dm.scope = 'all'
  ) r;
$$;

-- Admin or moderator of a comedian profile (signed-in user).
create or replace function private.can_manage_comedian(p_comedian uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.profile_role_for((select auth.uid()), p_comedian, null) is not null;
$$;

create or replace function private.can_manage_group(p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.profile_role_for((select auth.uid()), null, p_group) is not null;
$$;

-- Admin of a comedian / group profile (signed-in user).
create or replace function private.is_comedian_admin(p_comedian uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.profile_role_for((select auth.uid()), p_comedian, null) = 'admin';
$$;

create or replace function private.is_group_admin(p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.profile_role_for((select auth.uid()), null, p_group) = 'admin';
$$;

-- Generic versions taking either id (exactly one is not null).
create or replace function private.can_manage(p_comedian uuid, p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.profile_role_for((select auth.uid()), p_comedian, p_group) is not null;
$$;

create or replace function private.is_profile_admin(p_comedian uuid, p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.profile_role_for((select auth.uid()), p_comedian, p_group) = 'admin';
$$;

-- Can the signed-in user manage this tour (moderator or admin of its owner)?
create or replace function private.can_manage_tour(p_tour uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tours t
    where t.id = p_tour and private.can_manage(t.comedian_id, t.group_id)
  );
$$;

-- Can the signed-in user manage this show?
-- Yes when they manage one of its performers, the owner of its tour, or
-- they created it themselves (needed while a new show has no performers yet).
create or replace function private.can_manage_show(p_show uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.shows s
    where s.id = p_show
      and (
        s.created_by = (select auth.uid())
        or (s.tour_id is not null and private.can_manage_tour(s.tour_id))
        or exists (
          select 1 from public.show_performers sp
          where sp.show_id = s.id
            and private.can_manage(sp.comedian_id, sp.group_id)
        )
      )
  ) and private.is_active_account();
$$;

-- Does the show have a verified performer the signed-in user manages?
-- (Show publishing rule: verified profiles publish instantly.)
create or replace function private.show_has_verified_managed_performer(p_show uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.show_performers sp
    left join public.comedians c on c.id = sp.comedian_id
    left join public.comedy_groups g on g.id = sp.group_id
    where sp.show_id = p_show
      and coalesce(c.verified, g.verified, false)
      and private.can_manage(sp.comedian_id, sp.group_id)
  );
$$;

-- Is a podcast managed by the signed-in user (admin of an accepted host, or its creator)?
create or replace function private.can_manage_podcast(p_podcast uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.podcasts p
    where p.id = p_podcast
      and (
        p.created_by = (select auth.uid())
        or exists (
          select 1 from public.podcast_hosts ph
          where ph.podcast_id = p.id
            and ph.link_status = 'accepted'
            and private.is_comedian_admin(ph.comedian_id)
        )
      )
  ) and private.is_active_account();
$$;

-- Is a show publicly visible (used by rules on child tables)?
create or replace function private.show_is_public(p_show uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.shows s
    where s.id = p_show and s.status in ('published', 'sold_out', 'cancelled')
  );
$$;

-- Is a comedian or group profile publicly visible?
create or replace function private.profile_is_public(p_comedian uuid, p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.comedians c where c.id = p_comedian and c.status = 'published')
      or exists (select 1 from public.comedy_groups g where g.id = p_group and g.status = 'published');
$$;

-- Lock the functions down: only the database roles that evaluate the rules may run them.
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;
