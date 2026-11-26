-- Comedy Radar: Row Level Security policies (docs/website-spec.md, section 10).
--
-- Summary
-- - Public (anon): reads published content only; may insert newsletter
--   sign-ups and contact messages.
-- - Signed-in accounts: create draft/pending profiles (and become admin),
--   claims, their own tracks; read their own access, requests and activity.
-- - Profile moderators: shows and tours of profiles they manage.
-- - Profile admins: also the profile itself, members, podcasts and team.
-- - Super admin: everything.

-- ---------------------------------------------------------------------------
-- Table privileges for the Data API roles. RLS decides which rows.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on
  public.countries, public.cities, public.venues, public.comedians,
  public.comedy_groups, public.group_members, public.tours, public.shows,
  public.show_performers, public.podcasts, public.podcast_hosts,
  public.spotlight_placements, public.site_settings
to anon, authenticated;

grant insert on public.newsletter_subscribers, public.contact_messages to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Countries and cities: public read, super admin writes.
-- ---------------------------------------------------------------------------
create policy "Anyone can read countries" on public.countries
  for select to anon, authenticated using (true);
create policy "Super admin manages countries" on public.countries
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

create policy "Anyone can read cities" on public.cities
  for select to anon, authenticated using (true);
create policy "Super admin manages cities" on public.cities
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Venues: published ones are public; signed-in accounts suggest new ones.
-- ---------------------------------------------------------------------------
create policy "Anyone can read published venues" on public.venues
  for select to anon, authenticated
  using (status = 'published');
create policy "Accounts read venues they suggested" on public.venues
  for select to authenticated
  using (created_by = (select auth.uid()) or (select private.is_super_admin()));
create policy "Accounts suggest venues" on public.venues
  for insert to authenticated
  with check ((select private.is_active_account()) and created_by = (select auth.uid()) and status = 'pending'
              or (select private.is_super_admin()));
create policy "Super admin updates venues" on public.venues
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy "Super admin deletes venues" on public.venues
  for delete to authenticated
  using ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Comedians and groups
-- ---------------------------------------------------------------------------
create policy "Anyone can read published comedians" on public.comedians
  for select to anon, authenticated
  using (status = 'published');
create policy "Managers read their comedians" on public.comedians
  for select to authenticated
  using (created_by = (select auth.uid()) or private.can_manage_comedian(id) or (select private.is_super_admin()));
create policy "Accounts create comedian profiles" on public.comedians
  for insert to authenticated
  with check ((select private.is_active_account()));
create policy "Admins update comedian profiles" on public.comedians
  for update to authenticated
  using (private.is_comedian_admin(id) or (select private.is_super_admin()))
  with check (private.is_comedian_admin(id) or (select private.is_super_admin()));
create policy "Super admin deletes comedians" on public.comedians
  for delete to authenticated
  using ((select private.is_super_admin()));

create policy "Anyone can read published groups" on public.comedy_groups
  for select to anon, authenticated
  using (status = 'published');
create policy "Managers read their groups" on public.comedy_groups
  for select to authenticated
  using (created_by = (select auth.uid()) or private.can_manage_group(id) or (select private.is_super_admin()));
create policy "Accounts create group profiles" on public.comedy_groups
  for insert to authenticated
  with check ((select private.is_active_account()));
create policy "Admins update group profiles" on public.comedy_groups
  for update to authenticated
  using (private.is_group_admin(id) or (select private.is_super_admin()))
  with check (private.is_group_admin(id) or (select private.is_super_admin()));
create policy "Super admin deletes groups" on public.comedy_groups
  for delete to authenticated
  using ((select private.is_super_admin()));

-- Group members
create policy "Anyone can read accepted group members" on public.group_members
  for select to anon, authenticated
  using (link_status = 'accepted'
         and private.profile_is_public(comedian_id, null)
         and private.profile_is_public(null, group_id));
create policy "Managers read their group links" on public.group_members
  for select to authenticated
  using (private.can_manage_group(group_id) or private.can_manage_comedian(comedian_id)
         or (select private.is_super_admin()));
create policy "Group admins add members" on public.group_members
  for insert to authenticated
  with check (private.is_group_admin(group_id) or (select private.is_super_admin()));
create policy "Group or comedian admins update membership" on public.group_members
  for update to authenticated
  using (private.is_group_admin(group_id) or private.is_comedian_admin(comedian_id)
         or (select private.is_super_admin()))
  with check (private.is_group_admin(group_id) or private.is_comedian_admin(comedian_id)
              or (select private.is_super_admin()));
create policy "Group or comedian admins remove membership" on public.group_members
  for delete to authenticated
  using (private.is_group_admin(group_id) or private.is_comedian_admin(comedian_id)
         or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Tours
-- ---------------------------------------------------------------------------
create policy "Anyone can read published tours" on public.tours
  for select to anon, authenticated
  using (status = 'published');
create policy "Managers read their tours" on public.tours
  for select to authenticated
  using (private.can_manage(comedian_id, group_id) or (select private.is_super_admin()));
create policy "Managers create tours" on public.tours
  for insert to authenticated
  with check (((select private.is_active_account()) and private.can_manage(comedian_id, group_id))
              or (select private.is_super_admin()));
create policy "Managers update tours" on public.tours
  for update to authenticated
  using (((select private.is_active_account()) and private.can_manage(comedian_id, group_id))
         or (select private.is_super_admin()))
  with check (((select private.is_active_account()) and private.can_manage(comedian_id, group_id))
              or (select private.is_super_admin()));
create policy "Super admin deletes tours" on public.tours
  for delete to authenticated
  using ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Shows (cancelled shows stay readable so shared links keep working)
-- ---------------------------------------------------------------------------
create policy "Anyone can read public shows" on public.shows
  for select to anon, authenticated
  using (status in ('published', 'sold_out', 'cancelled'));
create policy "Managers read their shows" on public.shows
  for select to authenticated
  using (private.can_manage_show(id) or (select private.is_super_admin()));
create policy "Accounts create shows" on public.shows
  for insert to authenticated
  with check (((select private.is_active_account())
               and created_by = (select auth.uid())
               and (tour_id is null or private.can_manage_tour(tour_id)))
              or (select private.is_super_admin()));
create policy "Managers update shows" on public.shows
  for update to authenticated
  using (private.can_manage_show(id) or (select private.is_super_admin()))
  with check ((private.can_manage_show(id) and (tour_id is null or private.can_manage_tour(tour_id)))
              or (select private.is_super_admin()));
create policy "Super admin deletes shows" on public.shows
  for delete to authenticated
  using ((select private.is_super_admin()));

-- Show performers
create policy "Anyone can read accepted performers of public shows" on public.show_performers
  for select to anon, authenticated
  using (link_status = 'accepted' and private.show_is_public(show_id)
         and private.profile_is_public(comedian_id, group_id));
create policy "Managers read performers of their shows" on public.show_performers
  for select to authenticated
  using (private.can_manage_show(show_id) or private.can_manage(comedian_id, group_id)
         or (select private.is_super_admin()));
create policy "Show managers add performers" on public.show_performers
  for insert to authenticated
  with check (private.can_manage_show(show_id) or (select private.is_super_admin()));
create policy "Show or performer managers update performers" on public.show_performers
  for update to authenticated
  using (private.can_manage_show(show_id) or private.can_manage(comedian_id, group_id)
         or (select private.is_super_admin()))
  with check (private.can_manage_show(show_id) or private.can_manage(comedian_id, group_id)
              or (select private.is_super_admin()));
create policy "Show or performer managers remove performers" on public.show_performers
  for delete to authenticated
  using (private.can_manage_show(show_id) or private.can_manage(comedian_id, group_id)
         or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Podcasts
-- ---------------------------------------------------------------------------
create policy "Anyone can read published podcasts" on public.podcasts
  for select to anon, authenticated
  using (status = 'published');
create policy "Managers read their podcasts" on public.podcasts
  for select to authenticated
  using (private.can_manage_podcast(id) or (select private.is_super_admin()));
create policy "Accounts create podcasts" on public.podcasts
  for insert to authenticated
  with check (((select private.is_active_account()) and created_by = (select auth.uid()))
              or (select private.is_super_admin()));
create policy "Host admins update podcasts" on public.podcasts
  for update to authenticated
  using (private.can_manage_podcast(id) or (select private.is_super_admin()))
  with check (private.can_manage_podcast(id) or (select private.is_super_admin()));
create policy "Super admin deletes podcasts" on public.podcasts
  for delete to authenticated
  using ((select private.is_super_admin()));

create policy "Anyone can read accepted podcast hosts" on public.podcast_hosts
  for select to anon, authenticated
  using (link_status = 'accepted' and private.profile_is_public(comedian_id, null));
create policy "Managers read their podcast hosts" on public.podcast_hosts
  for select to authenticated
  using (private.can_manage_podcast(podcast_id) or private.is_comedian_admin(comedian_id)
         or (select private.is_super_admin()));
create policy "Podcast managers add hosts" on public.podcast_hosts
  for insert to authenticated
  with check (private.can_manage_podcast(podcast_id) or (select private.is_super_admin()));
create policy "Podcast or host admins update hosts" on public.podcast_hosts
  for update to authenticated
  using (private.can_manage_podcast(podcast_id) or private.is_comedian_admin(comedian_id)
         or (select private.is_super_admin()))
  with check (private.can_manage_podcast(podcast_id) or private.is_comedian_admin(comedian_id)
              or (select private.is_super_admin()));
create policy "Podcast or host admins remove hosts" on public.podcast_hosts
  for delete to authenticated
  using (private.can_manage_podcast(podcast_id) or private.is_comedian_admin(comedian_id)
         or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Spotlight: active placements are public; only the super admin manages them.
-- ---------------------------------------------------------------------------
create policy "Anyone can read active spotlight placements" on public.spotlight_placements
  for select to anon, authenticated
  using (now() between starts_at and ends_at);
create policy "Super admin manages spotlight" on public.spotlight_placements
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Site settings: public read (homepage counts etc.), super admin writes.
-- ---------------------------------------------------------------------------
create policy "Anyone can read site settings" on public.site_settings
  for select to anon, authenticated using (true);
create policy "Super admin manages site settings" on public.site_settings
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Newsletter and contact messages: anyone may write, only the super admin reads.
-- (Rate limiting and the bot check run in the server code.)
-- ---------------------------------------------------------------------------
create policy "Anyone can subscribe" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (confirmed = false);
create policy "Super admin manages subscribers" on public.newsletter_subscribers
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

create policy "Anyone can send a contact message" on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new');
create policy "Super admin manages contact messages" on public.contact_messages
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create policy "Accounts read their own row" on public.accounts
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_super_admin()));
create policy "Accounts update their own row" on public.accounts
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_super_admin()))
  with check (id = (select auth.uid()) or (select private.is_super_admin()));
-- Rows are created by the sign-up trigger; only the super admin deletes.
create policy "Super admin deletes accounts" on public.accounts
  for delete to authenticated
  using ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Dashboard team
-- ---------------------------------------------------------------------------
create policy "Owners and members read team rows" on public.dashboard_members
  for select to authenticated
  using (owner_account_id = (select auth.uid()) or member_account_id = (select auth.uid())
         or (select private.is_super_admin()));
create policy "Owners invite team members" on public.dashboard_members
  for insert to authenticated
  with check (((select private.is_active_account()) and owner_account_id = (select auth.uid())
               and (member_account_id is null or member_account_id <> (select auth.uid())))
              or (select private.is_super_admin()));
create policy "Owners update team members" on public.dashboard_members
  for update to authenticated
  using (owner_account_id = (select auth.uid()) or (select private.is_super_admin()))
  with check (owner_account_id = (select auth.uid()) or (select private.is_super_admin()));
create policy "Owners remove team members" on public.dashboard_members
  for delete to authenticated
  using (owner_account_id = (select auth.uid()) or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Profile access (no account can change its own role)
-- ---------------------------------------------------------------------------
create policy "Accounts read their own access" on public.profile_access
  for select to authenticated
  using (account_id = (select auth.uid()));
create policy "Profile admins read the profile team" on public.profile_access
  for select to authenticated
  using (private.is_profile_admin(comedian_id, group_id) or (select private.is_super_admin()));
create policy "Profile admins grant access" on public.profile_access
  for insert to authenticated
  with check (
    (select private.is_super_admin())
    or (
      (select private.is_active_account())
      and account_id <> (select auth.uid())
      and private.is_profile_admin(comedian_id, group_id)
      and (invited_by is null or invited_by = (select auth.uid()))
      and (
        via_dashboard_member_id is null
        or exists (
          select 1 from public.dashboard_members dm
          where dm.id = via_dashboard_member_id
            and dm.owner_account_id = (select auth.uid())
        )
      )
    )
  );
create policy "Profile admins change access" on public.profile_access
  for update to authenticated
  using ((select private.is_super_admin())
         or (account_id <> (select auth.uid()) and private.is_profile_admin(comedian_id, group_id)))
  with check ((select private.is_super_admin())
              or (account_id <> (select auth.uid()) and private.is_profile_admin(comedian_id, group_id)));
create policy "Profile admins remove access" on public.profile_access
  for delete to authenticated
  using ((select private.is_super_admin())
         or account_id = (select auth.uid())                     -- anyone may leave a profile
         or private.is_profile_admin(comedian_id, group_id));

-- ---------------------------------------------------------------------------
-- Claims and invitations
-- ---------------------------------------------------------------------------
create policy "Accounts read their own requests" on public.access_requests
  for select to authenticated
  using (account_id = (select auth.uid())
         or (type = 'invite' and private.is_profile_admin(comedian_id, group_id))
         or (select private.is_super_admin()));
create policy "Accounts create claims, admins create invites" on public.access_requests
  for insert to authenticated
  with check (
    (select private.is_super_admin())
    or (
      (select private.is_active_account())
      and status = 'pending'
      and decided_by is null
      and admin_note is null
      and confirmed_at is null
      and (
        (type = 'claim' and account_id = (select auth.uid()))
        or (type = 'invite' and private.is_profile_admin(comedian_id, group_id))
      )
    )
  );
create policy "Super admin decides requests" on public.access_requests
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy "Requesters cancel, super admin deletes" on public.access_requests
  for delete to authenticated
  using ((account_id = (select auth.uid()) and status = 'pending')
         or (type = 'invite' and status = 'pending' and private.is_profile_admin(comedian_id, group_id))
         or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Link requests (consent between profiles)
-- ---------------------------------------------------------------------------
create policy "Sender and target admins read link requests" on public.link_requests
  for select to authenticated
  using (from_account_id = (select auth.uid())
         or private.is_comedian_admin(target_comedian_id)
         or (select private.is_super_admin()));
create policy "Accounts send link requests" on public.link_requests
  for insert to authenticated
  with check (((select private.is_active_account()) and from_account_id = (select auth.uid())
               and status = 'pending' and decided_by is null)
              or (select private.is_super_admin()));
create policy "Target admins decide link requests" on public.link_requests
  for update to authenticated
  using (private.is_comedian_admin(target_comedian_id) or (select private.is_super_admin()))
  with check (private.is_comedian_admin(target_comedian_id) or (select private.is_super_admin()));
create policy "Senders cancel link requests" on public.link_requests
  for delete to authenticated
  using ((from_account_id = (select auth.uid()) and status = 'pending')
         or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Activity log: written by triggers only.
-- ---------------------------------------------------------------------------
create policy "Accounts read their own activity" on public.activity_log
  for select to authenticated
  using (account_id = (select auth.uid()) or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Tracks (phase 2): each account manages its own.
-- ---------------------------------------------------------------------------
create policy "Accounts manage their own tracks" on public.tracks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
