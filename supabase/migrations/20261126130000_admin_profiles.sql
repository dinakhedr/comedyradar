-- Super admin panel, part 3 (spec 11.5 item 3): Profiles.
-- List and filter every comedian and group profile, and manage one profile:
-- status, verified, and who has access with which role. Every function needs
-- a super admin with 2-step verification (private.is_super_admin).

-- ---------------------------------------------------------------------------
-- The list. p_kind: 'all' | 'comedian' | 'group'; p_status: '' or a status;
-- p_verified: '' | 'verified' | 'not_verified' | 'no_admin'.
-- Returns {"stats": {...}, "rows": [...]} (at most 300 rows, by name).
-- ---------------------------------------------------------------------------
create or replace function public.admin_profiles(p_kind text, p_q text, p_status text, p_verified text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_rows jsonb;
  v_stats jsonb;
begin
  if not private.is_super_admin() then
    return null;
  end if;

  with p as (
    select 'comedian'::text as kind, c.id, c.name, c.name_ar, c.slug, c.status::text as status, c.verified, c.seeded, c.created_at,
           (select count(*) from public.profile_access pa where pa.comedian_id = c.id and pa.status = 'active' and pa.role = 'admin') as admins,
           (select count(*) from public.profile_access pa where pa.comedian_id = c.id and pa.status = 'active') as people,
           (select count(*) from public.show_performers sp join public.shows s on s.id = sp.show_id
             where sp.comedian_id = c.id and s.starts_at >= now() and s.status in ('published', 'sold_out')) as upcoming
    from public.comedians c
    union all
    select 'group', g.id, g.name, g.name_ar, g.slug, g.status::text, g.verified, g.seeded, g.created_at,
           (select count(*) from public.profile_access pa where pa.group_id = g.id and pa.status = 'active' and pa.role = 'admin'),
           (select count(*) from public.profile_access pa where pa.group_id = g.id and pa.status = 'active'),
           (select count(*) from public.show_performers sp join public.shows s on s.id = sp.show_id
             where sp.group_id = g.id and s.starts_at >= now() and s.status in ('published', 'sold_out'))
    from public.comedy_groups g
  )
  select
    jsonb_build_object(
      'comedians', count(*) filter (where kind = 'comedian'),
      'groups', count(*) filter (where kind = 'group'),
      'no_admin', count(*) filter (where admins = 0 and status <> 'archived'),
      'pending', count(*) filter (where status = 'pending')),
    coalesce(jsonb_agg(to_jsonb(p) order by lower(p.name)) filter (
      where (coalesce(p_kind, 'all') = 'all' or kind = p_kind)
        and (v_q is null or name ilike '%' || v_q || '%' or coalesce(name_ar, '') ilike '%' || v_q || '%' or slug ilike '%' || v_q || '%')
        and (coalesce(p_status, '') = '' or status = p_status)
        and (coalesce(p_verified, '') = ''
             or (p_verified = 'verified' and verified)
             or (p_verified = 'not_verified' and not verified)
             or (p_verified = 'no_admin' and admins = 0))
    ), '[]'::jsonb)
  into v_stats, v_rows
  from p;

  -- Keep the page light: the first 300 matches.
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_rows
  from (select e from jsonb_array_elements(v_rows) e limit 300) x;

  return jsonb_build_object('stats', v_stats, 'rows', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- People with access to one profile.
-- ---------------------------------------------------------------------------
create or replace function public.admin_profile_access(p_kind text, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_super_admin() then null else coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', pa.id, 'name', a.display_name, 'email', u.email, 'role', pa.role, 'status', pa.status,
             'via_team', pa.via_dashboard_member_id is not null, 'since', pa.created_at)
           order by pa.role, lower(coalesce(a.display_name, u.email)))
    from public.profile_access pa
    join public.accounts a on a.id = pa.account_id
    left join auth.users u on u.id = pa.account_id
    where pa.status <> 'removed'
      and ((p_kind = 'comedian' and pa.comedian_id = p_id) or (p_kind = 'group' and pa.group_id = p_id))
  ), '[]'::jsonb) end;
$$;

-- ---------------------------------------------------------------------------
-- Status and verified. p_status: 'draft' | 'pending' | 'published' | 'archived'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_profile(p_kind text, p_id uuid, p_status text, p_verified boolean)
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
  if p_kind = 'comedian' then
    update public.comedians set status = p_status::public.content_status, verified = coalesce(p_verified, verified) where id = p_id;
  elsif p_kind = 'group' then
    update public.comedy_groups set status = p_status::public.content_status, verified = coalesce(p_verified, verified) where id = p_id;
  else
    return 'not_found';
  end if;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Give a person access by the email of their account. Returns 'ok',
-- 'no_account' (nobody signed up with that email) or 'not_found'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_grant_access(p_kind text, p_id uuid, p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if p_role not in ('admin', 'moderator') or p_kind not in ('comedian', 'group') then
    return 'not_found';
  end if;
  if not exists (select 1 from public.comedians where p_kind = 'comedian' and id = p_id)
     and not exists (select 1 from public.comedy_groups where p_kind = 'group' and id = p_id) then
    return 'not_found';
  end if;
  select u.id into v_account from auth.users u join public.accounts a on a.id = u.id
  where lower(u.email) = lower(btrim(coalesce(p_email, '')));
  if v_account is null then
    return 'no_account';
  end if;

  update public.profile_access
  set role = p_role::public.profile_role, status = 'active'
  where account_id = v_account
    and ((p_kind = 'comedian' and comedian_id = p_id) or (p_kind = 'group' and group_id = p_id));
  if not found then
    insert into public.profile_access (account_id, comedian_id, group_id, role, status, invited_by)
    values (v_account,
            case when p_kind = 'comedian' then p_id end,
            case when p_kind = 'group' then p_id end,
            p_role::public.profile_role, 'active', (select auth.uid()));
  end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Change one person's role, or remove them. p_role: 'admin' | 'moderator' | 'remove'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_change_access(p_access_id uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if p_role = 'remove' then
    update public.profile_access set status = 'removed' where id = p_access_id and status <> 'removed';
  elsif p_role in ('admin', 'moderator') then
    update public.profile_access set role = p_role::public.profile_role where id = p_access_id and status <> 'removed';
  else
    return 'not_found';
  end if;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

revoke all on function public.admin_profiles(text, text, text, text) from public;
revoke all on function public.admin_profile_access(text, uuid) from public;
revoke all on function public.admin_set_profile(text, uuid, text, boolean) from public;
revoke all on function public.admin_grant_access(text, uuid, text, text) from public;
revoke all on function public.admin_change_access(uuid, text) from public;
grant execute on function public.admin_profiles(text, text, text, text) to authenticated;
grant execute on function public.admin_profile_access(text, uuid) to authenticated;
grant execute on function public.admin_set_profile(text, uuid, text, boolean) to authenticated;
grant execute on function public.admin_grant_access(text, uuid, text, text) to authenticated;
grant execute on function public.admin_change_access(uuid, text) to authenticated;
