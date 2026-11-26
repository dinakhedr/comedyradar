-- Super admin: delete a comedian or group for good (Admin > Profiles > Edit).
-- What goes with it:
--   * shows where this profile is the only performer are deleted;
--   * on other shows it is only taken off the lineup (the show stays);
--   * its tours are deleted (any show left in them stays, without a tour);
--   * podcasts where it is the only host are deleted;
--   * access, group memberships, requests and claims go with the profile.
-- Archive (status) is the way to only hide a profile.

-- What a delete would remove, for the confirm step. Null when not allowed or not found.
create or replace function public.admin_profile_delete_impact(p_kind text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not private.is_super_admin() or p_kind not in ('comedian', 'group') then
    return null;
  end if;
  if p_kind = 'comedian' then
    select name into v_name from public.comedians where id = p_id;
  else
    select name into v_name from public.comedy_groups where id = p_id;
  end if;
  if v_name is null then
    return null;
  end if;

  return jsonb_build_object(
    'name', v_name,
    'solo_shows', (
      select count(*) from public.shows s
      where exists (select 1 from public.show_performers sp where sp.show_id = s.id
                      and (case when p_kind = 'comedian' then sp.comedian_id else sp.group_id end) = p_id)
        and not exists (select 1 from public.show_performers sp where sp.show_id = s.id
                      and (case when p_kind = 'comedian' then sp.comedian_id else sp.group_id end) is distinct from p_id)),
    'shared_shows', (
      select count(distinct sp.show_id) from public.show_performers sp
      where (case when p_kind = 'comedian' then sp.comedian_id else sp.group_id end) = p_id
        and exists (select 1 from public.show_performers o where o.show_id = sp.show_id
                      and (case when p_kind = 'comedian' then o.comedian_id else o.group_id end) is distinct from p_id)),
    'tours', (
      select count(*) from public.tours t
      where (case when p_kind = 'comedian' then t.comedian_id else t.group_id end) = p_id),
    'solo_podcasts', (
      case when p_kind = 'comedian' then (
        select count(*) from public.podcast_hosts h
        where h.comedian_id = p_id
          and not exists (select 1 from public.podcast_hosts o where o.podcast_id = h.podcast_id and o.comedian_id <> p_id))
      else 0 end)
  );
end;
$$;

revoke all on function public.admin_profile_delete_impact(text, uuid) from public, anon;
grant execute on function public.admin_profile_delete_impact(text, uuid) to authenticated;

-- Deletes the profile and what goes with it (see above). Returns 'ok', 'not_found' or 'forbidden'.
create or replace function public.admin_delete_profile(p_kind text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() or p_kind not in ('comedian', 'group') then
    return 'forbidden';
  end if;
  if (p_kind = 'comedian' and not exists (select 1 from public.comedians where id = p_id))
     or (p_kind = 'group' and not exists (select 1 from public.comedy_groups where id = p_id)) then
    return 'not_found';
  end if;

  -- Shows where this profile is the only performer.
  delete from public.shows s
  where exists (select 1 from public.show_performers sp where sp.show_id = s.id
                  and (case when p_kind = 'comedian' then sp.comedian_id else sp.group_id end) = p_id)
    and not exists (select 1 from public.show_performers sp where sp.show_id = s.id
                  and (case when p_kind = 'comedian' then sp.comedian_id else sp.group_id end) is distinct from p_id);

  -- Its tours: shows still in them stay, without a tour.
  update public.shows set tour_id = null
  where tour_id in (select id from public.tours t where (case when p_kind = 'comedian' then t.comedian_id else t.group_id end) = p_id);
  delete from public.tours t where (case when p_kind = 'comedian' then t.comedian_id else t.group_id end) = p_id;

  -- Podcasts where this comedian is the only host.
  if p_kind = 'comedian' then
    delete from public.podcasts pod
    where exists (select 1 from public.podcast_hosts h where h.podcast_id = pod.id and h.comedian_id = p_id)
      and not exists (select 1 from public.podcast_hosts h where h.podcast_id = pod.id and h.comedian_id <> p_id);
    delete from public.comedians where id = p_id;
  else
    delete from public.comedy_groups where id = p_id;
  end if;
  return 'ok';
end;
$$;

revoke all on function public.admin_delete_profile(text, uuid) from public, anon;
grant execute on function public.admin_delete_profile(text, uuid) to authenticated;
