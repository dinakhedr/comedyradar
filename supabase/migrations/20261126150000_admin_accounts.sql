-- Super admin panel, part 5 (spec 11.5 item 5): Accounts.
-- List and filter accounts, see one account, sign it out of all devices and
-- suspend it. Passwords are never visible: only Supabase Auth holds them.
-- Every function needs a super admin with 2-step verification.

-- One account as a row (used by the list and the detail).
create or replace function private.admin_account_row(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'name', a.display_name,
    'email', u.email,
    'type', a.account_type,
    'created_at', coalesce(u.created_at, a.created_at),
    'last_sign_in_at', u.last_sign_in_at,
    'confirmed', u.email_confirmed_at is not null,
    'confirmed_at', u.email_confirmed_at,
    'provider', coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
    'two_step', exists (select 1 from auth.mfa_factors f where f.user_id = a.id and f.status = 'verified'),
    'suspended', a.is_suspended,
    'super_admin', a.is_super_admin,
    'team_member', exists (select 1 from public.dashboard_members dm where dm.member_account_id = a.id and dm.status = 'active'),
    'status', case when a.is_suspended then 'suspended' when u.email_confirmed_at is null then 'unconfirmed' else 'active' end,
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object('name', coalesce(c.name, g.name), 'kind', case when pa.group_id is null then 'comedian' else 'group' end,
                                          'slug', coalesce(c.slug, g.slug), 'role', pa.role, 'via_team', pa.via_dashboard_member_id is not null)
                       order by pa.role, lower(coalesce(c.name, g.name)))
      from public.profile_access pa
      left join public.comedians c on c.id = pa.comedian_id
      left join public.comedy_groups g on g.id = pa.group_id
      where pa.account_id = a.id and pa.status = 'active'), '[]'::jsonb))
  from public.accounts a
  left join auth.users u on u.id = a.id
  where a.id = p_id;
$$;
revoke all on function private.admin_account_row(uuid) from public;

-- ---------------------------------------------------------------------------
-- The list. p_type: '' | 'comedian' | 'manager' | 'team';
-- p_status: '' | 'active' | 'unconfirmed' | 'suspended'.
-- Returns {"stats", "rows"} (at most 300 rows, newest first).
-- ---------------------------------------------------------------------------
create or replace function public.admin_accounts(p_q text, p_type text, p_status text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_stats jsonb;
  v_rows jsonb;
begin
  if not private.is_super_admin() then
    return null;
  end if;

  select jsonb_build_object(
           'total', count(*),
           'comedians', count(*) filter (where a.account_type = 'comedian'),
           'managers', count(*) filter (where a.account_type = 'manager'),
           'unconfirmed', count(*) filter (where u.email_confirmed_at is null and not a.is_suspended),
           'suspended', count(*) filter (where a.is_suspended),
           'new_7', count(*) filter (where coalesce(u.created_at, a.created_at) >= now() - interval '7 days'))
  into v_stats
  from public.accounts a left join auth.users u on u.id = a.id;

  select coalesce(jsonb_agg(private.admin_account_row(x.id) order by x.created desc), '[]'::jsonb)
  into v_rows
  from (
    select a.id, coalesce(u.created_at, a.created_at) as created
    from public.accounts a
    left join auth.users u on u.id = a.id
    where (coalesce(p_type, '') = ''
           or (p_type in ('comedian', 'manager') and a.account_type = p_type)
           or (p_type = 'team' and exists (select 1 from public.dashboard_members dm
                                           where dm.member_account_id = a.id and dm.status = 'active')))
      and (coalesce(p_status, '') = ''
           or (p_status = 'suspended' and a.is_suspended)
           or (p_status = 'unconfirmed' and not a.is_suspended and u.email_confirmed_at is null)
           or (p_status = 'active' and not a.is_suspended and u.email_confirmed_at is not null))
      and (v_q is null or coalesce(a.display_name, '') ilike '%' || v_q || '%' or coalesce(u.email, '') ilike '%' || v_q || '%')
    order by coalesce(u.created_at, a.created_at) desc
    limit 300
  ) x;

  return jsonb_build_object('stats', v_stats, 'rows', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- One account, with its team: who is on its team, and whose teams it is on.
-- ---------------------------------------------------------------------------
create or replace function public.admin_account(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_super_admin() then null else
    private.admin_account_row(p_id) || jsonb_build_object(
      'team', coalesce((
        select jsonb_agg(jsonb_build_object('name', coalesce(ma.display_name, dm.invite_email), 'status', dm.status) order by dm.invited_at)
        from public.dashboard_members dm left join public.accounts ma on ma.id = dm.member_account_id
        where dm.owner_account_id = p_id and dm.status in ('invited', 'active')), '[]'::jsonb),
      'member_of', coalesce((
        select jsonb_agg(jsonb_build_object('name', oa.display_name, 'scope', dm.scope) order by dm.invited_at)
        from public.dashboard_members dm join public.accounts oa on oa.id = dm.owner_account_id
        where dm.member_account_id = p_id and dm.status = 'active'), '[]'::jsonb))
  end
  where exists (select 1 from public.accounts where id = p_id);
$$;

-- ---------------------------------------------------------------------------
-- Actions. p_action: 'signout' (end every session on every device),
-- 'suspend' (block the account and sign it out) or 'unsuspend'.
-- Super admin accounts cannot be suspended or signed out from here.
-- Returns 'ok', 'protected', 'not_found' or 'forbidden'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_account_action(p_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_super boolean;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select is_super_admin into v_super from public.accounts where id = p_id;
  if not found or p_action not in ('signout', 'suspend', 'unsuspend') then
    return 'not_found';
  end if;
  if v_super and p_action <> 'unsuspend' then
    return 'protected';
  end if;

  if p_action in ('suspend', 'unsuspend') then
    update public.accounts set is_suspended = (p_action = 'suspend') where id = p_id;
  end if;
  if p_action in ('signout', 'suspend') then
    -- Ends the sessions: no new sign-in tokens. A token already given out
    -- stops working when it expires (one hour at most).
    delete from auth.sessions where user_id = p_id;
  end if;
  return 'ok';
end;
$$;

revoke all on function public.admin_accounts(text, text, text) from public;
revoke all on function public.admin_account(uuid) from public;
revoke all on function public.admin_account_action(uuid, text) from public;
grant execute on function public.admin_accounts(text, text, text) to authenticated;
grant execute on function public.admin_account(uuid) to authenticated;
grant execute on function public.admin_account_action(uuid, text) to authenticated;
