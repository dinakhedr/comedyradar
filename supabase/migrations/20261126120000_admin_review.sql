-- Super admin panel, part 2 (spec 11.5 item 2): Review queue.
-- One call lists everything waiting (claims, new profiles, shows from
-- unverified profiles, venues, name changes) with what the decision needs;
-- one function per type records the decision. All of them need a super
-- admin with 2-step verification (private.is_super_admin).

alter table public.access_requests add column decided_at timestamptz;
comment on column public.access_requests.decided_at is 'When the super admin approved or rejected it.';

-- ---------------------------------------------------------------------------
-- The queue: {"pending": [...], "done": [...]}. Oldest first.
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pending jsonb;
  v_done jsonb;
begin
  if not private.is_super_admin() then
    return null;
  end if;

  with items as (
    -- Claims
    select 'claims'::text as type, r.id, r.created_at,
           coalesce(c.name, g.name) as title,
           coalesce(a.display_name, u.email) as sub,
           case r.proof_method
             when 'official_dm' then 'DM from @' || coalesce(r.proof_value, '?')
             when 'comedian_confirms' then case when r.confirmed_at is not null then 'Confirmed by ' || r.confirmed_by_name else 'Not confirmed yet' end
             when 'document' then 'Document uploaded'
             else coalesce(r.proof_method, 'No proof')
           end as flag,
           jsonb_build_object(
             'profile', jsonb_build_object(
               'kind', case when r.comedian_id is not null then 'comedian' else 'group' end,
               'id', coalesce(r.comedian_id, r.group_id),
               'name', coalesce(c.name, g.name), 'slug', coalesce(c.slug, g.slug),
               'status', coalesce(c.status, g.status), 'verified', coalesce(c.verified, g.verified),
               'instagram_url', coalesce(c.instagram_url, g.instagram_url),
               'admins', (select count(*) from public.profile_access pa
                          where pa.status = 'active' and pa.role = 'admin'
                            and (pa.comedian_id = r.comedian_id or pa.group_id = r.group_id))),
             'claimant', jsonb_build_object(
               'name', a.display_name, 'email', u.email, 'account_type', a.account_type,
               'email_confirmed', u.email_confirmed_at is not null, 'created_at', a.created_at,
               'profiles', (select count(*) from public.profile_access pa where pa.account_id = r.account_id and pa.status = 'active')),
             'claim', jsonb_build_object(
               'relation', r.relation, 'role', r.role, 'proof_method', r.proof_method, 'proof_value', r.proof_value,
               'proof_file_path', r.proof_file_path, 'confirmed_at', r.confirmed_at, 'confirmed_by_name', r.confirmed_by_name,
               'decision_reason', r.decision_reason, 'admin_note', r.admin_note),
             'checks', jsonb_build_object(
               'other_open_claims', (select count(*) from public.access_requests o
                                     where o.type = 'claim' and o.status = 'pending' and o.id <> r.id
                                       and (o.comedian_id = r.comedian_id or o.group_id = r.group_id)),
               'handle_matches', r.proof_method = 'official_dm' and r.proof_value is not null
                                 and lower(coalesce(c.instagram_url, g.instagram_url, '')) ~ ('instagram\.com/' || lower(r.proof_value) || '/?$'))
           ) as detail
    from public.access_requests r
    left join public.comedians c on c.id = r.comedian_id
    left join public.comedy_groups g on g.id = r.group_id
    left join public.accounts a on a.id = r.account_id
    left join auth.users u on u.id = r.account_id
    where r.type = 'claim' and r.status = 'pending'

    union all
    -- New profiles (comedians and groups waiting for review)
    select 'profiles', p.id, p.created_at, p.name,
           coalesce(a.display_name, u.email, 'Unknown'),
           p.kind,
           jsonb_build_object(
             'kind', p.kind, 'name', p.name, 'name_ar', p.name_ar, 'slug', p.slug, 'bio', p.bio,
             'photo_url', p.photo_url, 'instagram_url', p.instagram_url,
             'created_by', coalesce(a.display_name, u.email), 'created_by_email', u.email,
             'same_name', (select count(*) from public.comedians x where lower(x.name) = lower(p.name) and x.id <> p.id)
                        + (select count(*) from public.comedy_groups x where lower(x.name) = lower(p.name) and x.id <> p.id))
    from (
      select 'comedian'::text as kind, id, created_at, name, name_ar, slug, bio, photo_url, instagram_url, created_by
      from public.comedians where status = 'pending'
      union all
      select 'group', id, created_at, name, name_ar, slug, bio, photo_url, instagram_url, created_by
      from public.comedy_groups where status = 'pending'
    ) p
    left join public.accounts a on a.id = p.created_by
    left join auth.users u on u.id = p.created_by

    union all
    -- Shows waiting for review
    select 'shows', s.id, s.created_at, s.title,
           coalesce(perf.names, 'No performer'),
           case when s.ticket_url is null then 'No ticket link' else 'Ticket link' end,
           jsonb_build_object(
             'title', s.title, 'slug', s.slug, 'starts_at', s.starts_at, 'city', ci.name, 'venue', v.name,
             'ticket_url', s.ticket_url, 'price_min', s.price_min, 'price_max', s.price_max, 'currency', s.currency,
             'performers', perf.names, 'any_verified', coalesce(perf.any_verified, false),
             'created_by', coalesce(a.display_name, u.email), 'poster_url', s.poster_url)
    from public.shows s
    left join public.cities ci on ci.id = s.city_id
    left join public.venues v on v.id = s.venue_id
    left join public.accounts a on a.id = s.created_by
    left join auth.users u on u.id = s.created_by
    left join lateral (
      select string_agg(coalesce(c.name, g.name), ', ' order by sp.billing_order) as names,
             bool_or(coalesce(c.verified, g.verified)) as any_verified
      from public.show_performers sp
      left join public.comedians c on c.id = sp.comedian_id
      left join public.comedy_groups g on g.id = sp.group_id
      where sp.show_id = s.id
    ) perf on true
    where s.status = 'pending'

    union all
    -- Venues suggested by creators
    select 'venues', v.id, null::timestamptz, v.name, ci.name, 'Suggested venue',
           jsonb_build_object('name', v.name, 'city', ci.name, 'address', v.address, 'map_url', v.map_url,
                              'suggested_by', coalesce(a.display_name, u.email),
                              'same_name', (select count(*) from public.venues x where lower(x.name) = lower(v.name) and x.id <> v.id))
    from public.venues v
    join public.cities ci on ci.id = v.city_id
    left join public.accounts a on a.id = v.created_by
    left join auth.users u on u.id = v.created_by
    where v.status = 'pending'

    union all
    -- Name changes on verified profiles
    select 'names', n.id, n.created_at, coalesce(n.old_name, '?') || ' → ' || n.name,
           coalesce(a.display_name, u.email, 'Unknown'),
           case when n.comedian_id is not null then 'comedian' else 'group' end,
           jsonb_build_object('kind', case when n.comedian_id is not null then 'comedian' else 'group' end,
                              'old_name', n.old_name, 'name', n.name, 'old_name_ar', n.old_name_ar, 'name_ar', n.name_ar,
                              'slug', coalesce(c.slug, g.slug), 'requested_by', coalesce(a.display_name, u.email))
    from public.profile_name_changes n
    left join public.comedians c on c.id = n.comedian_id
    left join public.comedy_groups g on g.id = n.group_id
    left join public.accounts a on a.id = n.requested_by
    left join auth.users u on u.id = n.requested_by
    where n.status = 'pending'
  )
  select coalesce(jsonb_agg(jsonb_build_object('type', type, 'id', id, 'created_at', created_at, 'title', title, 'sub', sub, 'flag', flag, 'detail', detail)
                            order by created_at nulls last), '[]'::jsonb)
  into v_pending
  from (select * from items order by created_at nulls last limit 300) i;

  -- Done: the latest decided claims and name changes.
  select coalesce(jsonb_agg(d order by (d ->> 'decided_at') desc), '[]'::jsonb)
  into v_done
  from (select d from (
    select jsonb_build_object('type', 'claims', 'id', r.id, 'title', coalesce(c.name, g.name), 'sub', coalesce(a.display_name, 'Unknown'),
                              'status', r.status, 'decided_at', r.decided_at, 'reason', r.decision_reason) as d
    from public.access_requests r
    left join public.comedians c on c.id = r.comedian_id
    left join public.comedy_groups g on g.id = r.group_id
    left join public.accounts a on a.id = r.account_id
    where r.type = 'claim' and r.status in ('approved', 'rejected') and r.decided_at is not null
    union all
    select jsonb_build_object('type', 'names', 'id', n.id, 'title', coalesce(n.old_name, '?') || ' → ' || n.name, 'sub', coalesce(a.display_name, 'Unknown'),
                              'status', n.status, 'decided_at', n.decided_at, 'reason', n.decision_reason)
    from public.profile_name_changes n
    left join public.accounts a on a.id = n.requested_by
    where n.status in ('approved', 'rejected') and n.decided_at is not null
  ) u order by (d ->> 'decided_at') desc limit 50) x;

  return jsonb_build_object('pending', v_pending, 'done', v_done);
end;
$$;

-- ---------------------------------------------------------------------------
-- Claims. p_decision: 'admin' | 'moderator' (approve with that role),
-- 'more_proof' (stays waiting, the reason is the message), 'reject'.
-- Returns 'ok', 'not_found' or 'forbidden'.
-- ---------------------------------------------------------------------------
create or replace function public.admin_decide_claim(p_id uuid, p_decision text, p_verify boolean, p_reason text, p_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_r public.access_requests%rowtype;
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 1000), '');
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 1000), '');
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select * into v_r from public.access_requests where id = p_id and type = 'claim' for update;
  if not found or v_r.status <> 'pending' then
    return 'not_found';
  end if;

  if p_decision = 'more_proof' then
    update public.access_requests set decision_reason = v_reason, admin_note = coalesce(v_note, admin_note) where id = p_id;
    return 'ok';
  end if;

  if p_decision = 'reject' then
    update public.access_requests
    set status = 'rejected', decided_by = v_uid, decided_at = now(), decision_reason = v_reason, admin_note = coalesce(v_note, admin_note)
    where id = p_id;
    return 'ok';
  end if;

  if p_decision not in ('admin', 'moderator') then
    return 'not_found';
  end if;

  update public.access_requests
  set status = 'approved', role = p_decision::public.profile_role, decided_by = v_uid, decided_at = now(),
      decision_reason = v_reason, admin_note = coalesce(v_note, admin_note)
  where id = p_id;

  -- The claimant gets the role (an existing row for the same profile is updated).
  update public.profile_access
  set role = p_decision::public.profile_role, status = 'active'
  where account_id = v_r.account_id
    and (comedian_id = v_r.comedian_id or group_id = v_r.group_id);
  if not found then
    insert into public.profile_access (account_id, comedian_id, group_id, role, status, invited_by)
    values (v_r.account_id, v_r.comedian_id, v_r.group_id, p_decision::public.profile_role, 'active', v_uid);
  end if;

  if p_verify then
    update public.comedians set verified = true where id = v_r.comedian_id;
    update public.comedy_groups set verified = true where id = v_r.group_id;
  end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- New profile: approve (published, optionally verified) or send back to draft.
-- ---------------------------------------------------------------------------
create or replace function public.admin_decide_profile(p_kind text, p_id uuid, p_approve boolean, p_verify boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if p_kind = 'comedian' then
    update public.comedians
    set status = case when p_approve then 'published'::public.content_status else 'draft'::public.content_status end,
        verified = verified or (p_approve and p_verify)
    where id = p_id and status = 'pending';
  elsif p_kind = 'group' then
    update public.comedy_groups
    set status = case when p_approve then 'published'::public.content_status else 'draft'::public.content_status end,
        verified = verified or (p_approve and p_verify)
    where id = p_id and status = 'pending';
  else
    return 'not_found';
  end if;
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- Show: approve (published) or send back to draft.
create or replace function public.admin_decide_show(p_id uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  update public.shows
  set status = case when p_approve then 'published'::public.show_status else 'draft'::public.show_status end
  where id = p_id and status = 'pending';
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- Venue: approve (published, shown to everyone) or archive.
create or replace function public.admin_decide_venue(p_id uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  update public.venues
  set status = case when p_approve then 'published'::public.content_status else 'archived'::public.content_status end
  where id = p_id and status = 'pending';
  return case when found then 'ok' else 'not_found' end;
end;
$$;

-- Name change: approve (the profile takes the new name) or reject.
create or replace function public.admin_decide_name_change(p_id uuid, p_approve boolean, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n public.profile_name_changes%rowtype;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  select * into v_n from public.profile_name_changes where id = p_id for update;
  if not found or v_n.status <> 'pending' then
    return 'not_found';
  end if;
  update public.profile_name_changes
  set status = case when p_approve then 'approved' else 'rejected' end,
      decided_by = (select auth.uid()), decided_at = now(),
      decision_reason = nullif(left(btrim(coalesce(p_reason, '')), 1000), '')
  where id = p_id;
  if p_approve then
    update public.comedians set name = v_n.name, name_ar = v_n.name_ar where id = v_n.comedian_id;
    update public.comedy_groups set name = v_n.name, name_ar = v_n.name_ar where id = v_n.group_id;
  end if;
  return 'ok';
end;
$$;

revoke all on function public.admin_review_queue() from public;
revoke all on function public.admin_decide_claim(uuid, text, boolean, text, text) from public;
revoke all on function public.admin_decide_profile(text, uuid, boolean, boolean) from public;
revoke all on function public.admin_decide_show(uuid, boolean) from public;
revoke all on function public.admin_decide_venue(uuid, boolean) from public;
revoke all on function public.admin_decide_name_change(uuid, boolean, text) from public;
grant execute on function public.admin_review_queue() to authenticated;
grant execute on function public.admin_decide_claim(uuid, text, boolean, text, text) to authenticated;
grant execute on function public.admin_decide_profile(text, uuid, boolean, boolean) to authenticated;
grant execute on function public.admin_decide_show(uuid, boolean) to authenticated;
grant execute on function public.admin_decide_venue(uuid, boolean) to authenticated;
grant execute on function public.admin_decide_name_change(uuid, boolean, text) to authenticated;
