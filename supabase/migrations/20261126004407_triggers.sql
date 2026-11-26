-- Comedy Radar: triggers that enforce the business rules from section 10/11
-- of docs/website-spec.md, on top of the RLS policies.
--
-- "API user" below means a request made through the Data API with the
-- publishable key (roles anon / authenticated). The server (secret key,
-- role service_role) and the database owner are not limited by these guards.

create or replace function private.is_api_user()
returns boolean
language sql stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

create or replace function private.is_restricted_user()
returns boolean
language sql stable
set search_path = ''
as $$
  select private.is_api_user() and not private.is_super_admin();
$$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.comedians
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.comedy_groups
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.shows
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.site_settings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Accounts: one row per signed-up user; protected columns.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_type text := new.raw_user_meta_data ->> 'account_type';
begin
  -- Metadata is user-editable: it is used only for display name and
  -- onboarding type, never for permissions.
  insert into public.accounts (id, display_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case when v_type in ('comedian', 'manager') then v_type else 'comedian' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.guard_accounts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_api_user() then
    -- is_super_admin is never writable through the API, not even by a super admin.
    new.is_super_admin := old.is_super_admin;
    new.id := old.id;
    new.created_at := old.created_at;
    if not private.is_super_admin() then
      new.is_suspended := old.is_suspended;
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_accounts before update on public.accounts
  for each row execute function private.guard_accounts();

-- ---------------------------------------------------------------------------
-- Comedian and group profiles
-- ---------------------------------------------------------------------------
create or replace function private.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_restricted_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.verified := false;
    new.seeded := false;
    if new.status not in ('draft', 'pending') then
      new.status := 'pending';
    end if;
  else
    -- Only the super admin sets verified / seeded and approves (publishes) profiles.
    new.verified := old.verified;
    new.seeded := old.seeded;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.status = 'published' and old.status <> 'published' then
      new.status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_profile before insert or update on public.comedians
  for each row execute function private.guard_profile();
create trigger guard_profile before insert or update on public.comedy_groups
  for each row execute function private.guard_profile();

-- The account that creates a profile becomes its admin automatically.
create or replace function private.grant_creator_admin()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (select 1 from public.accounts where id = v_uid) then
    return new;
  end if;
  if tg_table_name = 'comedians' then
    insert into public.profile_access (account_id, comedian_id, role, status)
    values (v_uid, new.id, 'admin', 'active')
    on conflict do nothing;
  else
    insert into public.profile_access (account_id, group_id, role, status)
    values (v_uid, new.id, 'admin', 'active')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger grant_creator_admin after insert on public.comedians
  for each row execute function private.grant_creator_admin();
create trigger grant_creator_admin after insert on public.comedy_groups
  for each row execute function private.grant_creator_admin();

-- ---------------------------------------------------------------------------
-- Venues: suggestions wait for the super admin.
-- ---------------------------------------------------------------------------
create or replace function private.guard_venue()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_restricted_user() then
    new.created_by := (select auth.uid());
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger guard_venue before insert on public.venues
  for each row execute function private.guard_venue();

-- ---------------------------------------------------------------------------
-- Tours: verified owners publish instantly, others go to review.
-- ---------------------------------------------------------------------------
create or replace function private.guard_tour()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_verified boolean;
begin
  if not private.is_restricted_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    select coalesce(c.verified, g.verified, false) into v_verified
    from (select 1) x
    left join public.comedians c on c.id = new.comedian_id
    left join public.comedy_groups g on g.id = new.group_id;
    if not coalesce(v_verified, false) then
      new.status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_tour before insert or update on public.tours
  for each row execute function private.guard_tour();

-- ---------------------------------------------------------------------------
-- Shows: publishing rule, signals, authorship.
-- ---------------------------------------------------------------------------
create or replace function private.guard_show()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_restricted_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.source_type := 'creator';
    new.signal := 'new';            -- Strong / Fading are set only by the super admin
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.signal := old.signal;
  end if;
  new.updated_by := (select auth.uid());

  -- A show becomes public only when it has a verified performer the user manages.
  -- On insert it has no performers yet, so it is saved as pending; the
  -- dashboard publishes it after adding the performers.
  if new.status in ('published', 'sold_out')
     and (tg_op = 'INSERT' or old.status not in ('published', 'sold_out')) then
    if tg_op = 'INSERT' or not private.show_has_verified_managed_performer(new.id) then
      new.status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_show before insert or update on public.shows
  for each row execute function private.guard_show();

-- ---------------------------------------------------------------------------
-- Consent for links between profiles (group members, lineup tags, co-hosts).
-- A link to a profile the user does not manage is saved as 'pending' and only
-- that profile's admin (or the super admin) can accept it.
-- ---------------------------------------------------------------------------
create or replace function private.guard_link_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_can_accept boolean;
begin
  if not private.is_restricted_user() then
    return new;
  end if;

  if tg_table_name = 'show_performers' then
    v_can_accept := private.can_manage(new.comedian_id, new.group_id);
  else
    v_can_accept := private.is_comedian_admin(new.comedian_id);
  end if;

  if tg_op = 'INSERT' then
    if not v_can_accept then
      new.link_status := 'pending';
    end if;
  elsif new.link_status = 'accepted' and old.link_status <> 'accepted' and not v_can_accept then
    raise exception 'Only an admin of the tagged profile can accept this link'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_link_status before insert or update on public.group_members
  for each row execute function private.guard_link_status();
create trigger guard_link_status before insert or update on public.podcast_hosts
  for each row execute function private.guard_link_status();
create trigger guard_link_status before insert or update on public.show_performers
  for each row execute function private.guard_link_status();

-- ---------------------------------------------------------------------------
-- Profile access: a profile must keep at least one admin.
-- ---------------------------------------------------------------------------
create or replace function private.keep_one_admin()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Only requests from the API are checked; the super admin may reassign.
  if current_setting('role', true) not in ('anon', 'authenticated') or private.is_super_admin() then
    return coalesce(new, old);
  end if;

  if old.role = 'admin' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active')
     and not exists (
       select 1 from public.profile_access pa
       where pa.id <> old.id
         and pa.role = 'admin' and pa.status = 'active'
         and (pa.comedian_id = old.comedian_id or pa.group_id = old.group_id)
     ) then
    raise exception 'A profile must always keep at least one admin'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger keep_one_admin before update or delete on public.profile_access
  for each row execute function private.keep_one_admin();

-- Removing (or expiring) a dashboard team member removes every access granted through it.
create or replace function private.revoke_dashboard_access()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status in ('removed', 'expired') and old.status not in ('removed', 'expired') then
    delete from public.profile_access where via_dashboard_member_id = new.id;
  end if;
  return new;
end;
$$;

create trigger revoke_dashboard_access after update on public.dashboard_members
  for each row execute function private.revoke_dashboard_access();

-- ---------------------------------------------------------------------------
-- Activity log: every create, edit, publish, cancel and access change.
-- ---------------------------------------------------------------------------
create or replace function private.log_activity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_account uuid;
  v_action text;
  v_entity text;
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
begin
  select id into v_account from public.accounts where id = v_uid;

  v_entity := case tg_table_name
    when 'comedians' then 'comedian'
    when 'comedy_groups' then 'group'
    when 'shows' then 'show'
    when 'tours' then 'tour'
    when 'podcasts' then 'podcast'
    when 'venues' then 'venue'
    else 'access'
  end;

  if tg_op = 'INSERT' then
    v_action := 'create';
    v_new := to_jsonb(new);
    v_changes := null;
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_old := to_jsonb(old);
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select jsonb_object_agg(k, jsonb_build_object('from', v_old -> k, 'to', v_new -> k))
      into v_changes
    from jsonb_object_keys(v_new) k
    where k not in ('updated_at', 'updated_by')
      and (v_old -> k) is distinct from (v_new -> k);

    if v_changes is null then
      return new;
    end if;

    v_action := case
      when v_changes ? 'status' and (v_new ->> 'status') = 'published' then 'publish'
      when v_changes ? 'status' and (v_new ->> 'status') = 'cancelled' then 'cancel'
      when v_changes ? 'role' then 'role_change'
      when v_changes ? 'status' and (v_new ->> 'status') = 'approved' then 'approve'
      else 'update'
    end;
  end if;

  insert into public.activity_log (account_id, action, entity_type, entity_id, details)
  values (
    v_account,
    v_action,
    v_entity,
    coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid),
    jsonb_build_object('table', tg_table_name, 'changes', v_changes)
  );
  return coalesce(new, old);
end;
$$;

create trigger log_activity after insert or update or delete on public.comedians
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.comedy_groups
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.shows
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.tours
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.podcasts
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.venues
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.profile_access
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.access_requests
  for each row execute function private.log_activity();

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;
