-- Creator dashboard, part 6 (spec 11.4 item 6): Team and access.
-- An owner invites someone by email to "All profiles in this dashboard" (one
-- role) or to "Selected profiles only" (a role per profile). The invitation is
-- a private link; it expires after 7 days and only works for the account with
-- the invited email. Accepting it is the only way to become an active member.

alter table public.dashboard_members
  add column token uuid not null default gen_random_uuid(),
  add column selected jsonb not null default '[]'::jsonb,
  add column accepted_at timestamptz;

create unique index dashboard_members_token on public.dashboard_members (token);
-- One open invitation or membership per email in a dashboard.
create unique index dashboard_members_one_open_per_email
  on public.dashboard_members (owner_account_id, invite_email)
  where status in ('invited', 'active');

alter table public.dashboard_members
  add constraint dashboard_members_selected_is_list
  check (jsonb_typeof(selected) = 'array' and jsonb_array_length(selected) <= 100);

comment on column public.dashboard_members.token is
  'Private invitation link token; a new one is made when the invitation is sent again.';
comment on column public.dashboard_members.selected is
  'For scope "selected": the profiles to share, as [{"kind": "comedian"|"group", "id": uuid, "role": "admin"|"moderator"}]. Turned into profile_access rows when the invitation is accepted.';

-- ---------------------------------------------------------------------------
-- Owners cannot activate a membership, pick its account, or change its email.
-- They can change the access, remove the person, or send the invitation again
-- (a new token and 7 more days).
-- ---------------------------------------------------------------------------
create or replace function private.guard_dashboard_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_restricted_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_account_id := (select auth.uid());
    new.member_account_id := null;
    new.status := 'invited';
    new.invited_at := now();
    new.expires_at := now() + interval '7 days';
    new.accepted_at := null;
    new.token := gen_random_uuid();
    new.invite_email := lower(btrim(new.invite_email));
    if new.invite_email is null or new.invite_email !~ '^[^@\s]+@[^@\s]+$' then
      raise exception 'A valid email is needed to invite someone' using errcode = '22023';
    end if;
    return new;
  end if;

  new.owner_account_id := old.owner_account_id;
  new.member_account_id := old.member_account_id;
  new.invite_email := old.invite_email;
  new.accepted_at := old.accepted_at;

  if new.status is distinct from old.status
     and not (new.status = 'removed' or (new.status = 'invited' and old.status = 'expired')) then
    raise exception 'Only the invited person can accept an invitation' using errcode = '42501';
  end if;

  if new.token is distinct from old.token or (new.status = 'invited' and old.status = 'expired') then
    -- Send again: only an open or expired invitation.
    if old.status not in ('invited', 'expired') then
      raise exception 'Only an open invitation can be sent again' using errcode = '42501';
    end if;
    new.token := gen_random_uuid();
    new.status := 'invited';
    new.invited_at := now();
    new.expires_at := now() + interval '7 days';
  else
    new.token := old.token;
    new.invited_at := old.invited_at;
    new.expires_at := old.expires_at;
  end if;
  return new;
end;
$$;

create trigger guard_dashboard_member before insert or update on public.dashboard_members
  for each row execute function private.guard_dashboard_member();

-- ---------------------------------------------------------------------------
-- The invitation behind a link, for the accept page (no account needed to see it).
-- ---------------------------------------------------------------------------
create or replace function public.team_invite(p_token uuid)
returns table (
  owner_name text,
  invite_email text,
  scope text,
  all_role public.profile_role,
  profiles jsonb,
  status text,
  for_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(o.display_name, 'A Comedy Radar user'),
    dm.invite_email,
    dm.scope,
    dm.all_role,
    case when dm.scope = 'all' then
      coalesce((
        select jsonb_agg(jsonb_build_object('name', coalesce(c.name, g.name), 'kind', case when pa.group_id is null then 'comedian' else 'group' end) order by coalesce(c.name, g.name))
        from public.profile_access pa
        left join public.comedians c on c.id = pa.comedian_id
        left join public.comedy_groups g on g.id = pa.group_id
        where pa.account_id = dm.owner_account_id and pa.status = 'active' and pa.role = 'admin'
      ), '[]'::jsonb)
    else
      coalesce((
        select jsonb_agg(jsonb_build_object('name', coalesce(c.name, g.name), 'kind', s->>'kind', 'role', s->>'role') order by coalesce(c.name, g.name))
        from jsonb_array_elements(dm.selected) s
        left join public.comedians c on s->>'kind' = 'comedian' and c.id = private.try_uuid(s->>'id')
        left join public.comedy_groups g on s->>'kind' = 'group' and g.id = private.try_uuid(s->>'id')
        where coalesce(c.name, g.name) is not null
      ), '[]'::jsonb)
    end,
    case when dm.status = 'invited' and dm.expires_at < now() then 'expired' else dm.status end,
    exists (
      select 1 from auth.users u
      where u.id = (select auth.uid()) and lower(u.email) = dm.invite_email
    )
  from public.dashboard_members dm
  left join public.accounts o on o.id = dm.owner_account_id
  where dm.token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- Accept or decline an invitation. Returns 'ok', 'signin', 'not_found',
-- 'expired', 'wrong_email', 'own' or 'suspended'.
-- ---------------------------------------------------------------------------
create or replace function public.answer_team_invite(p_token uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_dm public.dashboard_members%rowtype;
  v_item jsonb;
  v_kind text;
  v_id uuid;
  v_role public.profile_role;
begin
  if v_uid is null then
    return 'signin';
  end if;
  if not private.is_active_account() then
    return 'suspended';
  end if;

  select * into v_dm from public.dashboard_members where token = p_token for update;
  if not found or v_dm.status not in ('invited', 'expired') then
    return 'not_found';
  end if;
  if v_dm.status = 'expired' or v_dm.expires_at < now() then
    update public.dashboard_members set status = 'expired' where id = v_dm.id;
    return 'expired';
  end if;
  if v_dm.owner_account_id = v_uid then
    return 'own';
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is distinct from v_dm.invite_email then
    return 'wrong_email';
  end if;

  if not p_accept then
    update public.dashboard_members set status = 'removed' where id = v_dm.id;
    return 'ok';
  end if;

  -- An old, removed membership of the same person in this dashboard makes way.
  delete from public.dashboard_members
  where owner_account_id = v_dm.owner_account_id and member_account_id = v_uid and id <> v_dm.id;

  update public.dashboard_members
  set member_account_id = v_uid, status = 'active', accepted_at = now()
  where id = v_dm.id;

  if v_dm.scope = 'selected' then
    for v_item in select * from jsonb_array_elements(v_dm.selected) loop
      v_kind := v_item->>'kind';
      v_id := private.try_uuid(v_item->>'id');
      v_role := case when v_item->>'role' = 'admin' then 'admin'::public.profile_role else 'moderator'::public.profile_role end;
      -- Only profiles the owner is still an admin of are shared.
      if v_id is not null and exists (
        select 1 from public.profile_access pa
        where pa.account_id = v_dm.owner_account_id and pa.status = 'active' and pa.role = 'admin'
          and ((v_kind = 'comedian' and pa.comedian_id = v_id) or (v_kind = 'group' and pa.group_id = v_id))
      ) then
        insert into public.profile_access (account_id, comedian_id, group_id, role, status, invited_by, via_dashboard_member_id)
        values (v_uid,
                case when v_kind = 'comedian' then v_id end,
                case when v_kind = 'group' then v_id end,
                v_role, 'active', v_dm.owner_account_id, v_dm.id)
        on conflict do nothing;
      end if;
    end loop;
  end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- The people in the signed-in owner's dashboard, with their names.
-- ---------------------------------------------------------------------------
create or replace function public.my_team()
returns table (
  id uuid,
  invite_email text,
  member_account_id uuid,
  member_name text,
  scope text,
  all_role public.profile_role,
  selected jsonb,
  status text,
  token uuid,
  invited_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select dm.id, dm.invite_email, dm.member_account_id, a.display_name, dm.scope, dm.all_role, dm.selected,
         case when dm.status = 'invited' and dm.expires_at < now() then 'expired' else dm.status end,
         case when dm.status in ('invited', 'expired') then dm.token end,
         dm.invited_at, dm.expires_at, dm.accepted_at
  from public.dashboard_members dm
  left join public.accounts a on a.id = dm.member_account_id
  where dm.owner_account_id = (select auth.uid())
    and dm.status <> 'removed'
    and private.is_active_account()
  order by dm.status = 'active' desc, dm.invited_at desc;
$$;

-- Invitations waiting for the signed-in account (for the Requests page).
create or replace function public.my_team_invites()
returns table (token uuid, owner_name text, scope text, all_role public.profile_role, invited_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select dm.token, coalesce(o.display_name, 'A Comedy Radar user'), dm.scope, dm.all_role, dm.invited_at, dm.expires_at
  from public.dashboard_members dm
  join auth.users u on u.id = (select auth.uid()) and lower(u.email) = dm.invite_email
  left join public.accounts o on o.id = dm.owner_account_id
  where dm.status = 'invited' and dm.expires_at >= now()
  order by dm.invited_at desc;
$$;

revoke all on function public.team_invite(uuid) from public;
revoke all on function public.answer_team_invite(uuid, boolean) from public;
revoke all on function public.my_team() from public;
revoke all on function public.my_team_invites() from public;
grant execute on function public.team_invite(uuid) to anon, authenticated;
grant execute on function public.answer_team_invite(uuid, boolean) to authenticated;
grant execute on function public.my_team() to authenticated;
grant execute on function public.my_team_invites() to authenticated;
