-- Creator dashboard, part 7 (spec 11.4 item 7): Requests.
-- A link between profiles (group member, lineup tag, podcast co-host) shows
-- publicly only after the tagged comedian's admin accepts it. These functions
-- list the requests with readable names, answer them and cancel them, keeping
-- the request and the link row in step.

alter table public.link_requests add column decided_at timestamptz;

comment on column public.link_requests.decided_at is 'When the request was accepted or declined.';

-- ---------------------------------------------------------------------------
-- Requests for the signed-in account: "incoming" (to a comedian it is admin
-- of) and "sent" (by this account), with the names needed to show them.
-- ---------------------------------------------------------------------------
create or replace function public.my_link_requests()
returns table (
  id uuid,
  direction text,
  type text,
  status text,
  created_at timestamptz,
  decided_at timestamptz,
  from_name text,
  target_name text,
  target_slug text,
  group_name text,
  group_slug text,
  show_title text,
  show_slug text,
  show_starts_at timestamptz,
  show_city text,
  podcast_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select lr.*, 'incoming'::text as direction
    from public.link_requests lr
    where lr.from_account_id <> (select auth.uid())
      and private.is_comedian_admin(lr.target_comedian_id)
    union all
    select lr.*, 'sent'::text
    from public.link_requests lr
    where lr.from_account_id = (select auth.uid())
  )
  select m.id, m.direction, m.type, m.status, m.created_at, m.decided_at,
         coalesce(a.display_name, 'A Comedy Radar user'),
         c.name, c.slug, g.name, g.slug,
         s.title, s.slug, s.starts_at, ci.name,
         p.name
  from mine m
  join public.comedians c on c.id = m.target_comedian_id
  left join public.accounts a on a.id = m.from_account_id
  left join public.comedy_groups g on g.id = m.group_id
  left join public.shows s on s.id = m.show_id
  left join public.cities ci on ci.id = s.city_id
  left join public.podcasts p on p.id = m.podcast_id
  where private.is_active_account()
  order by m.status = 'pending' desc, coalesce(m.decided_at, m.created_at) desc
  limit 300;
$$;

-- ---------------------------------------------------------------------------
-- Accept or decline. Returns 'ok', 'not_found', 'forbidden' or 'suspended'.
-- ---------------------------------------------------------------------------
create or replace function public.answer_link_request(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_lr public.link_requests%rowtype;
  v_status text := case when p_accept then 'accepted' else 'declined' end;
begin
  if v_uid is null or not private.is_active_account() then
    return 'suspended';
  end if;

  select * into v_lr from public.link_requests where id = p_id for update;
  if not found or v_lr.status <> 'pending' then
    return 'not_found';
  end if;
  if not coalesce(private.is_comedian_admin(v_lr.target_comedian_id) or private.is_super_admin(), false) then
    return 'forbidden';
  end if;

  update public.link_requests
  set status = v_status, decided_by = v_uid, decided_at = now()
  where id = p_id;

  if v_lr.type = 'group_member' then
    update public.group_members set link_status = v_status
    where group_id = v_lr.group_id and comedian_id = v_lr.target_comedian_id and link_status = 'pending';
  elsif v_lr.type = 'lineup_tag' then
    update public.show_performers set link_status = v_status
    where show_id = v_lr.show_id and comedian_id = v_lr.target_comedian_id and link_status = 'pending';
  elsif v_lr.type = 'podcast_cohost' then
    update public.podcast_hosts set link_status = v_status
    where podcast_id = v_lr.podcast_id and comedian_id = v_lr.target_comedian_id and link_status = 'pending';
  end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- The sender cancels a request still waiting: the request and the waiting
-- link go. Returns 'ok' or 'not_found'.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_link_request(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lr public.link_requests%rowtype;
begin
  select * into v_lr from public.link_requests
  where id = p_id and from_account_id = (select auth.uid()) and status = 'pending'
  for update;
  if not found or not private.is_active_account() then
    return 'not_found';
  end if;

  if v_lr.type = 'group_member' then
    delete from public.group_members
    where group_id = v_lr.group_id and comedian_id = v_lr.target_comedian_id and link_status = 'pending';
  elsif v_lr.type = 'lineup_tag' then
    delete from public.show_performers
    where show_id = v_lr.show_id and comedian_id = v_lr.target_comedian_id and link_status = 'pending';
  elsif v_lr.type = 'podcast_cohost' then
    delete from public.podcast_hosts
    where podcast_id = v_lr.podcast_id and comedian_id = v_lr.target_comedian_id and link_status = 'pending';
  end if;
  delete from public.link_requests where id = p_id;
  return 'ok';
end;
$$;

revoke all on function public.my_link_requests() from public;
revoke all on function public.answer_link_request(uuid, boolean) from public;
revoke all on function public.cancel_link_request(uuid) from public;
grant execute on function public.my_link_requests() to authenticated;
grant execute on function public.answer_link_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_link_request(uuid) to authenticated;
