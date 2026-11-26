-- Creator dashboard, part 3 (spec 11.4 item 5): edit a profile.
-- Name changes on verified profiles wait for the super admin; "Request archive";
-- the side panel (last edit, people with access).

-- ---------------------------------------------------------------------------
-- Name changes on verified profiles (spec 11.3 / 11.4 item 5)
-- ---------------------------------------------------------------------------
create table public.profile_name_changes (
  id uuid primary key default gen_random_uuid(),
  comedian_id uuid references public.comedians(id) on delete cascade,
  group_id uuid references public.comedy_groups(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  name_ar text check (char_length(name_ar) <= 80),
  old_name text,
  old_name_ar text,
  requested_by uuid references public.accounts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references public.accounts(id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check ((comedian_id is null) <> (group_id is null))
);
create unique index profile_name_changes_one_pending_comedian
  on public.profile_name_changes (comedian_id) where status = 'pending';
create unique index profile_name_changes_one_pending_group
  on public.profile_name_changes (group_id) where status = 'pending';
create index on public.profile_name_changes (requested_by);
create index on public.profile_name_changes (decided_by);
create index on public.profile_name_changes (status, created_at);

alter table public.profile_name_changes enable row level security;
revoke all on public.profile_name_changes from anon, authenticated;
grant select, update, delete on public.profile_name_changes to authenticated;
grant all on public.profile_name_changes to service_role;

-- Written only by the profile trigger below (as the database owner); read by the
-- profile's team; decided by the super admin.
create policy "Profile team reads name changes" on public.profile_name_changes
  for select to authenticated
  using (private.can_manage(comedian_id, group_id) or (select private.is_super_admin()));
create policy "Super admin decides name changes" on public.profile_name_changes
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy "Super admin deletes name changes" on public.profile_name_changes
  for delete to authenticated
  using ((select private.is_super_admin()));

comment on table public.profile_name_changes is
  'Name changes asked for on verified profiles; the profile keeps its old name until the super admin approves.';

-- Saves (or replaces) the one pending name change of a profile.
create or replace function private.queue_name_change(
  p_comedian uuid, p_group uuid, p_name text, p_name_ar text, p_old_name text, p_old_name_ar text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.is_profile_admin(p_comedian, p_group) or private.is_super_admin()) then
    raise exception 'Only a profile admin can change its name' using errcode = '42501';
  end if;
  update public.profile_name_changes
  set name = p_name, name_ar = p_name_ar, requested_by = (select auth.uid()), created_at = now()
  where status = 'pending'
    and comedian_id is not distinct from p_comedian
    and group_id is not distinct from p_group;
  if not found then
    insert into public.profile_name_changes (comedian_id, group_id, name, name_ar, old_name, old_name_ar, requested_by)
    values (p_comedian, p_group, p_name, p_name_ar, p_old_name, p_old_name_ar, (select auth.uid()));
  end if;
end;
$$;
revoke all on function private.queue_name_change(uuid, uuid, text, text, text, text) from public;
-- Called by the profile trigger, which runs as the signed-in account.
grant execute on function private.queue_name_change(uuid, uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- "Request archive": the admin asks, only the super admin archives or deletes.
-- ---------------------------------------------------------------------------
alter table public.comedians
  add column archive_requested_at timestamptz;
alter table public.comedy_groups
  add column archive_requested_at timestamptz;

-- ---------------------------------------------------------------------------
-- Profile guard, extended (replaces the version in 20261126004407_triggers.sql):
-- - only the super admin publishes, archives, verifies;
-- - an archived profile stays archived;
-- - name changes on verified profiles are queued instead of saved;
-- - archive_requested_at can only be set to "now" or cleared.
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
    new.archive_requested_at := null;
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
    if new.status = 'archived' or old.status = 'archived' then
      new.status := old.status;
    end if;
    if new.archive_requested_at is distinct from old.archive_requested_at
       and new.archive_requested_at is not null then
      new.archive_requested_at := now();
    end if;

    if old.verified
       and (new.name is distinct from old.name or new.name_ar is distinct from old.name_ar) then
      perform private.queue_name_change(
        case when tg_table_name = 'comedians' then old.id end,
        case when tg_table_name = 'comedy_groups' then old.id end,
        new.name, new.name_ar, old.name, old.name_ar
      );
      new.name := old.name;
      new.name_ar := old.name_ar;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Side panel: last edit and the people with access (names only), for anyone
-- on the profile's team.
-- ---------------------------------------------------------------------------
create or replace function public.profile_panel(p_comedian uuid, p_group uuid)
returns table (last_edit_at timestamptz, last_edit_by text, people jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select l.created_at from public.activity_log l
      where l.entity_id = coalesce(p_comedian, p_group) and l.entity_type in ('comedian', 'group')
      order by l.created_at desc limit 1),
    (select a.display_name from public.activity_log l
      left join public.accounts a on a.id = l.account_id
      where l.entity_id = coalesce(p_comedian, p_group) and l.entity_type in ('comedian', 'group')
      order by l.created_at desc limit 1),
    coalesce((
      select jsonb_agg(jsonb_build_object('name', coalesce(a.display_name, 'A team member'), 'role', pa.role,
                                          'me', pa.account_id = (select auth.uid()))
                       order by pa.role, a.display_name)
      from public.profile_access pa
      join public.accounts a on a.id = pa.account_id
      where pa.status = 'active'
        and (pa.comedian_id = p_comedian or pa.group_id = p_group)
    ), '[]'::jsonb)
  where (p_comedian is null) <> (p_group is null)
    and private.can_manage(p_comedian, p_group);
$$;

revoke all on function public.profile_panel(uuid, uuid) from public;
grant execute on function public.profile_panel(uuid, uuid) to authenticated;
