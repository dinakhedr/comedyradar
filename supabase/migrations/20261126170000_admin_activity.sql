-- Super admin panel, part 7 (spec 11.5 item 7): Activity log.
-- Also logs Spotlight placements and team invitations (spec 11.4: "every
-- create, edit, publish, cancel, invite and role change is recorded"), and
-- keeps entries for 24 months.

-- ---------------------------------------------------------------------------
-- The logging trigger, now also for spotlight_placements and dashboard_members.
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
    when 'spotlight_placements' then 'spotlight'
    when 'dashboard_members' then 'team'
    else 'access'
  end;

  if tg_op = 'INSERT' then
    v_action := case when tg_table_name = 'dashboard_members' then 'invite' else 'create' end;
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
    where k not in ('updated_at', 'updated_by', 'impressions', 'clicks', 'token')
      and (v_old -> k) is distinct from (v_new -> k);

    if v_changes is null then
      return new;
    end if;

    v_action := case
      when v_changes ? 'status' and (v_new ->> 'status') = 'published' then 'publish'
      when v_changes ? 'status' and (v_new ->> 'status') = 'cancelled' then 'cancel'
      when v_changes ? 'role' or v_changes ? 'all_role' then 'role_change'
      when v_changes ? 'status' and (v_new ->> 'status') in ('approved', 'active') then 'approve'
      else 'update'
    end;
  end if;

  insert into public.activity_log (account_id, action, entity_type, entity_id, details)
  values (
    v_account,
    v_action,
    v_entity,
    coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid),
    jsonb_build_object('table', tg_table_name, 'changes', v_changes,
                       'name', coalesce(v_new ->> 'name', v_new ->> 'title', v_old ->> 'name', v_old ->> 'title',
                                        v_new ->> 'invite_email', v_old ->> 'invite_email'))
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists log_activity on public.spotlight_placements;
create trigger log_activity after insert or update or delete on public.spotlight_placements
  for each row execute function private.log_activity();
drop trigger if exists log_activity on public.dashboard_members;
create trigger log_activity after insert or update or delete on public.dashboard_members
  for each row execute function private.log_activity();

-- ---------------------------------------------------------------------------
-- One page of the log, newest first.
-- p_who: null or an account id; p_type: '' or an entity type;
-- p_action: '' or an action; p_period: 'today' | '7d' | '30d' | '12m' | 'all';
-- p_before: null or an entry id (for "Load older"); p_limit: 1–5000.
-- Returns {"rows", "people", "more"}. Entries older than 24 months are removed.
-- ---------------------------------------------------------------------------
create or replace function public.admin_activity(
  p_q text, p_who uuid, p_type text, p_action text, p_period text, p_before bigint, p_limit int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 5000);
  v_since timestamptz := case coalesce(p_period, '')
    when 'today' then date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
    when '7d' then now() - interval '7 days'
    when '30d' then now() - interval '30 days'
    when '12m' then now() - interval '12 months'
    else null end;
  v_rows jsonb;
  v_people jsonb;
begin
  if not private.is_super_admin() then
    return null;
  end if;

  -- Kept for 24 months (spec 11.5 item 7).
  delete from public.activity_log where created_at < now() - interval '24 months';

  with e as (
    select l.id, l.created_at, l.action, l.entity_type, l.entity_id, l.account_id,
           l.details -> 'changes' as changes, l.details ->> 'table' as tbl,
           coalesce(a.display_name, u.email) as who,
           case when l.account_id is null then 'System'
                when a.is_super_admin then 'Super admin'
                else 'Creator' end as role,
           coalesce(
             case l.entity_type
               when 'comedian' then (select name from public.comedians where id = l.entity_id)
               when 'group' then (select name from public.comedy_groups where id = l.entity_id)
               when 'show' then (select title from public.shows where id = l.entity_id)
               when 'tour' then (select name from public.tours where id = l.entity_id)
               when 'podcast' then (select name from public.podcasts where id = l.entity_id)
               when 'venue' then (select name from public.venues where id = l.entity_id)
               when 'spotlight' then (select s.title from public.spotlight_placements sp join public.shows s on s.id = sp.show_id where sp.id = l.entity_id)
               when 'access' then coalesce(
                 (select coalesce(c.name, g.name) from public.profile_access pa
                    left join public.comedians c on c.id = pa.comedian_id left join public.comedy_groups g on g.id = pa.group_id
                   where pa.id = l.entity_id),
                 (select coalesce(c.name, g.name) from public.access_requests ar
                    left join public.comedians c on c.id = ar.comedian_id left join public.comedy_groups g on g.id = ar.group_id
                   where ar.id = l.entity_id))
               when 'team' then (select coalesce(ma.display_name, dm.invite_email) from public.dashboard_members dm
                                   left join public.accounts ma on ma.id = dm.member_account_id where dm.id = l.entity_id)
             end,
             l.details ->> 'name') as target
    from public.activity_log l
    left join public.accounts a on a.id = l.account_id
    left join auth.users u on u.id = l.account_id
    where (p_before is null or l.id < p_before)
      and (v_since is null or l.created_at >= v_since)
      and (p_who is null or l.account_id = p_who)
      and (coalesce(p_type, '') = '' or l.entity_type = p_type)
      and (coalesce(p_action, '') = '' or l.action = p_action)
  ), f as (
    select * from e
    where v_q is null or coalesce(target, '') ilike '%' || v_q || '%' or coalesce(who, '') ilike '%' || v_q || '%'
    order by id desc
    limit v_limit + 1
  )
  select coalesce(jsonb_agg(to_jsonb(f) order by f.id desc), '[]'::jsonb) into v_rows from f;

  select coalesce(jsonb_agg(jsonb_build_object('id', x.account_id, 'name', x.name) order by lower(x.name)), '[]'::jsonb)
  into v_people
  from (select distinct l.account_id, coalesce(a.display_name, u.email, 'Unknown') as name
        from public.activity_log l
        join public.accounts a on a.id = l.account_id
        left join auth.users u on u.id = l.account_id
        where l.created_at >= now() - interval '12 months') x;

  return jsonb_build_object(
    'rows', (select coalesce(jsonb_agg(r order by i), '[]'::jsonb) from jsonb_array_elements(v_rows) with ordinality t(r, i) where i <= v_limit),
    'people', v_people,
    'more', jsonb_array_length(v_rows) > v_limit);
end;
$$;

revoke all on function public.admin_activity(text, uuid, text, text, text, bigint, int) from public;
grant execute on function public.admin_activity(text, uuid, text, text, text, bigint, int) to authenticated;
