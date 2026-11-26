-- Tests for the security rules and triggers. Run on a LOCAL test database
-- (see supabase/tests/README.md). Everything runs in one transaction and is
-- rolled back at the end. Any failed check stops the script with an error.

begin;

create or replace function pg_temp.check(ok boolean, msg text) returns void
language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'FAILED: %', msg;
  end if;
  raise notice 'ok - %', msg;
end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- Users: A (comedian), B (other comedian), S (super admin)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test', '{"full_name":"User A","account_type":"comedian"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test', '{"full_name":"User B","account_type":"manager"}'),
  ('00000000-0000-0000-0000-00000000000c', 's@test', '{"full_name":"Super"}');
update public.accounts set is_super_admin = true where id = '00000000-0000-0000-0000-00000000000c';

select pg_temp.check((select count(*) = 3 from public.accounts), 'sign-up creates an account row');
select pg_temp.check((select account_type = 'manager' from public.accounts where id = '00000000-0000-0000-0000-00000000000b'),
                     'account type comes from sign-up');

-- Locations (as the database owner). The starting list from the migrations is
-- replaced by fixed test rows (the whole test is rolled back).
delete from public.cities;
delete from public.countries;
insert into public.countries (id, code, name, region, is_market) values
  ('10000000-0000-0000-0000-000000000001', 'EG', 'Egypt', 'Egypt', true);
insert into public.cities (id, country_id, name, slug) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cairo', 'cairo');

-- ---------------------------------------------------------------- user A
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

insert into public.comedians (id, name, slug, status, verified, seeded)
values ('30000000-0000-0000-0000-00000000000a', 'Comic A', 'comic-a', 'published', true, true);

select pg_temp.check((select status = 'pending' and not verified and not seeded
                      from public.comedians where id = '30000000-0000-0000-0000-00000000000a'),
                     'new profile is pending, not verified, not seeded');
select pg_temp.check((select role = 'admin' from public.profile_access
                      where comedian_id = '30000000-0000-0000-0000-00000000000a'
                        and account_id = '00000000-0000-0000-0000-00000000000a'),
                     'creator becomes profile admin');

do $$ begin
  insert into public.countries (code, name) values ('XX', 'Nope');
  raise exception 'FAILED: normal user inserted a country';
exception when insufficient_privilege then
  raise notice 'ok - normal user cannot add countries';
end $$;

update public.accounts set is_super_admin = true, is_suspended = true
where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select not is_super_admin and not is_suspended from public.accounts
                      where id = '00000000-0000-0000-0000-00000000000a'),
                     'user cannot make themselves super admin');

update public.comedians set status = 'published', verified = true where id = '30000000-0000-0000-0000-00000000000a';
select pg_temp.check((select status = 'pending' and not verified from public.comedians
                      where id = '30000000-0000-0000-0000-00000000000a'),
                     'user cannot publish or verify their own profile');

do $$ begin
  delete from public.profile_access where comedian_id = '30000000-0000-0000-0000-00000000000a';
  raise exception 'FAILED: last admin removed';
exception when insufficient_privilege then
  raise notice 'ok - profile keeps at least one admin';
end $$;

-- ---------------------------------------------------------------- anon
reset role;
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.check((select count(*) = 0 from public.comedians), 'anon cannot see unpublished profiles');

-- ---------------------------------------------------------------- super admin
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.check(public.admin_overview() is null, 'the admin overview needs 2-step verification');
select pg_temp.check(not private.is_super_admin() and not exists (select 1 from public.comedians where id = '30000000-0000-0000-0000-00000000000a'),
                     'a super admin without 2-step verification has no super admin rights');
set local request.jwt.claim.aal = 'aal2';
update public.comedians set status = 'published' where id = '30000000-0000-0000-0000-00000000000a';
select pg_temp.check((select status = 'published' from public.comedians where id = '30000000-0000-0000-0000-00000000000a'),
                     'super admin publishes a profile');
select pg_temp.check((select (public.admin_overview() ->> 'profiles')::int >= 1), 'the super admin sees the admin overview');
set local request.jwt.claim.aal = '';

-- ---------------------------------------------------------------- user A adds a show
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

insert into public.shows (id, slug, title, starts_at, city_id, zone, market_country_id, status, signal)
values ('40000000-0000-0000-0000-000000000001', 'show-1', 'Show One', now() + interval '3 days',
        '20000000-0000-0000-0000-000000000001', 'local', '10000000-0000-0000-0000-000000000001', 'published', 'strong');
select pg_temp.check((select status = 'pending' and signal = 'new' and source_type = 'creator'
                      from public.shows where id = '40000000-0000-0000-0000-000000000001'),
                     'new show is pending, signal new, source creator');

insert into public.show_performers (show_id, comedian_id)
values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000a');
select pg_temp.check((select link_status = 'accepted' from public.show_performers
                      where show_id = '40000000-0000-0000-0000-000000000001'),
                     'own profile on a show is accepted');

update public.shows set status = 'published' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check((select status = 'pending' from public.shows where id = '40000000-0000-0000-0000-000000000001'),
                     'unverified profile cannot publish a show');

-- ---------------------------------------------------------------- super verifies
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
set local request.jwt.claim.aal = 'aal2';
update public.comedians set verified = true where id = '30000000-0000-0000-0000-00000000000a';
set local request.jwt.claim.aal = '';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.shows set status = 'published', signal = 'strong' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check((select status = 'published' and signal = 'new' from public.shows
                      where id = '40000000-0000-0000-0000-000000000001'),
                     'verified profile publishes instantly; signal stays for the super admin');

-- ---------------------------------------------------------------- user B
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.comedians (id, name, slug) values ('30000000-0000-0000-0000-00000000000b', 'Comic B', 'comic-b');

update public.shows set title = 'Hacked' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check((select title = 'Show One' from public.shows where id = '40000000-0000-0000-0000-000000000001'),
                     'another account cannot edit the show');

-- A tags B in the lineup: pending until B accepts
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.show_performers (id, show_id, comedian_id, billing_order)
values ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-00000000000b', 2);
select pg_temp.check((select link_status = 'pending' from public.show_performers
                      where id = '50000000-0000-0000-0000-000000000001'),
                     'tagging a profile you do not manage is pending');
do $$ begin
  update public.show_performers set link_status = 'accepted' where id = '50000000-0000-0000-0000-000000000001';
  raise exception 'FAILED: tagger accepted the tag';
exception when insufficient_privilege then
  raise notice 'ok - only the tagged profile can accept';
end $$;

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.show_performers set link_status = 'accepted' where id = '50000000-0000-0000-0000-000000000001';
select pg_temp.check((select link_status = 'accepted' from public.show_performers
                      where id = '50000000-0000-0000-0000-000000000001'),
                     'tagged profile admin accepts');

-- ---------------------------------------------------------------- dashboard team
-- B is in A's dashboard team with "All profiles · Moderator" (set up as the
-- database owner; through the API a membership only starts from an accepted
-- invitation, tested further down).
reset role;
insert into public.dashboard_members (id, owner_account_id, member_account_id, scope, all_role, status)
values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-00000000000b', 'all', 'moderator', 'active');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.shows set title = 'Show One (late show)' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check((select title = 'Show One (late show)' from public.shows where id = '40000000-0000-0000-0000-000000000001'),
                     'team moderator (all profiles) can edit shows');
update public.comedians set bio = 'changed by moderator' where id = '30000000-0000-0000-0000-00000000000a';
select pg_temp.check((select bio is null from public.comedians where id = '30000000-0000-0000-0000-00000000000a'),
                     'team moderator cannot edit the profile');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.dashboard_members set status = 'removed' where id = '70000000-0000-0000-0000-000000000001';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
-- (B is still in the lineup, so B can still edit this show as a performer;
--  what must go is B's access to A's profile.)
select pg_temp.check(not private.can_manage_comedian('30000000-0000-0000-0000-00000000000a'),
                     'removed team member loses access to the profile immediately');

-- ---------------------------------------------------------------- spotlight + views as anon
reset role;
insert into public.spotlight_placements (show_id, ends_at, priority)
values ('40000000-0000-0000-0000-000000000001', now() + interval '2 days', 10);

set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.check((select count(*) = 1 from public.v_upcoming_shows), 'anon sees the published show');
select pg_temp.check((select headliner_name = 'Comic A' and city_slug = 'cairo' and display_signal = 'new'
                      from public.v_upcoming_shows), 'view returns headliner, city and signal');
select pg_temp.check((select performer_count = 1 from public.v_upcoming_shows),
                     'unpublished tagged profile is not shown as a performer');
select pg_temp.check((select count(*) = 1 from public.v_spotlight), 'anon sees the active spotlight placement');
do $$ begin
  perform * from public.profile_access;
  raise exception 'FAILED: anon read profile access';
exception when insufficient_privilege then
  raise notice 'ok - anon cannot read profile access';
end $$;

-- Newsletter: only through newsletter_subscribe(), never a direct insert.
do $$ begin
  insert into public.newsletter_subscribers (email) values ('direct@test.com');
  raise exception 'FAILED: anon inserted a subscriber directly';
exception when insufficient_privilege then
  raise notice 'ok - anon cannot insert subscribers directly';
end $$;
select pg_temp.check(public.newsletter_subscribe(' Fan@Test.com ', 'h1') = 'ok', 'newsletter sign-up works');
select pg_temp.check(public.newsletter_subscribe('fan@test.com', 'h1') = 'ok', 'repeat sign-up looks the same');
select pg_temp.check(public.newsletter_subscribe('not-an-email', 'h1') = 'invalid', 'newsletter rejects a bad email');
select pg_temp.check(public.newsletter_subscribe('a@test.com', 'h1') = 'ok', 'third attempt is fine');
select pg_temp.check(public.newsletter_subscribe('b@test.com', 'h1') = 'ok', 'fourth attempt is fine');
select pg_temp.check(public.newsletter_subscribe('c@test.com', 'h1') = 'ok', 'fifth attempt is fine');
select pg_temp.check(public.newsletter_subscribe('d@test.com', 'h1') = 'slow_down', 'newsletter limits one visitor');
select pg_temp.check(public.newsletter_subscribe('d@test.com', 'h2') = 'ok', 'another visitor can still sign up');
do $$ begin
  perform * from public.newsletter_subscribers;
  raise exception 'FAILED: anon read subscribers';
exception when insufficient_privilege then
  raise notice 'ok - anon cannot read subscribers';
end $$;

-- Tour view
reset role;
insert into public.tours (id, slug, name, comedian_id, status)
values ('60000000-0000-0000-0000-000000000001', 'tour-a', 'Tour A', '30000000-0000-0000-0000-00000000000a', 'published');
update public.shows set tour_id = '60000000-0000-0000-0000-000000000001' where id = '40000000-0000-0000-0000-000000000001';
set local role anon;
select pg_temp.check((select show_count = 1 and upcoming_count = 1 and cities = array['Cairo'] from public.v_tours),
                     'tour view counts shows and cities');
select pg_temp.check((select count(*) = 1 from public.v_comedian_shows), 'comedian shows view');

-- Search (runs as anon: only published things can be found)
set local role anon;
select pg_temp.check((select count(*) = 1 from public.search_radar('comic') where kind = 'comedian'),
                     'search finds the published comedian only');
select pg_temp.check((select score = 1 from public.search_radar('COMICA') where kind = 'comedian'),
                     'search ignores case and spaces');
select pg_temp.check((select count(*) = 1 from public.search_radar('comuc a') where kind = 'comedian'),
                     'search survives a typo');
select pg_temp.check((select count(*) = 1 from public.search_radar('late show') where kind = 'show'),
                     'search finds an upcoming show by title');
select pg_temp.check((select count(*) = 1 from public.search_radar('tour a') where kind = 'tour'),
                     'search finds a published tour');
select pg_temp.check((select count(*) = 0 from public.search_radar('a')), 'one-letter search returns nothing');
select pg_temp.check((select count(*) = 0 from public.search_radar('zzqqxx')), 'no match returns nothing');

reset role;
select pg_temp.check((select count(*) > 0 from public.activity_log), 'activity is logged');

-- Group styles and performing language accept only the approved values.
insert into public.comedy_groups (name, slug, styles, performing_language)
values ('Style Test', 'style-test', array['improv', 'stand-up'], 'bilingual');
select pg_temp.check((select styles = array['improv', 'stand-up'] from public.comedy_groups where slug = 'style-test'),
  'a group keeps its styles');
do $$ begin
  update public.comedy_groups set styles = array['mime'] where slug = 'style-test';
  raise exception 'FAILED: unknown style saved';
exception when check_violation then
  raise notice 'ok - unknown styles are refused';
end $$;
do $$ begin
  update public.comedy_groups set performing_language = 'french' where slug = 'style-test';
  raise exception 'FAILED: unknown language saved';
exception when check_violation then
  raise notice 'ok - unknown performing languages are refused';
end $$;

-- Page views and ticket clicks (dashboard part 1).
update public.comedy_groups set status = 'published' where slug = 'style-test';
insert into public.profile_access (account_id, group_id, role)
select '00000000-0000-0000-0000-00000000000a', id, 'admin' from public.comedy_groups where slug = 'style-test';

set local role anon;
select public.record_page_stat('group_view', (select id from public.comedy_groups where slug = 'style-test'));
select public.record_page_stat('group_view', (select id from public.comedy_groups where slug = 'style-test'));
select public.record_page_stat('comedian_view', '30000000-0000-0000-0000-0000000000ff'); -- no such profile
select public.record_page_stat('bogus', '30000000-0000-0000-0000-00000000000a');
do $$ begin
  perform 1 from public.page_stats;
  raise exception 'FAILED: anon read page stats';
exception when insufficient_privilege then
  raise notice 'ok - anon cannot read page stats';
end $$;
reset role;
select pg_temp.check((select count(*) = 1 and sum(count) = 2 from public.page_stats),
  'views are counted per day, only for public pages');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select total = 2 from public.my_page_stats(current_date - 30) where kind = 'group_view'),
  'a profile admin sees the views of their pages');
select pg_temp.check((select count(*) = 2 from public.my_profiles()),
  'my_profiles lists the comedian and the group the account manages');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.my_page_stats(current_date - 30)),
  'other accounts do not see those views');
reset role;

-- Create or claim a profile (dashboard part 2).
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) >= 1 from public.find_profiles('style tst') where kind = 'group'),
  'find_profiles finds a published group by a misspelled name');
insert into public.access_requests (type, account_id, group_id, relation, proof_method)
select 'claim', '00000000-0000-0000-0000-00000000000b', id, 'manager', 'comedian_confirms'
from public.comedy_groups where slug = 'style-test';
select pg_temp.check((select confirm_token is not null from public.access_requests
                      where account_id = '00000000-0000-0000-0000-00000000000b' and type = 'claim'),
  'a claim gets a private confirmation link');
set local role anon;
select pg_temp.check((select not public.confirm_claim(gen_random_uuid(), 'Somebody')), 'a wrong link confirms nothing');
reset role;
select set_config('test.token', (select confirm_token::text from public.access_requests
  where account_id = '00000000-0000-0000-0000-00000000000b' and type = 'claim'), true);
set local role anon;
select pg_temp.check((select profile_name = 'Style Test' and not confirmed
                      from public.claim_to_confirm(current_setting('test.token')::uuid)),
  'the link shows which profile is claimed');
select pg_temp.check((select not public.confirm_claim(current_setting('test.token')::uuid, ' ')), 'a name is needed to confirm');
select pg_temp.check((select public.confirm_claim(current_setting('test.token')::uuid, 'Nour Hassan')), 'one tap confirms the claim');
select pg_temp.check((select not public.confirm_claim(current_setting('test.token')::uuid, 'Nour Hassan')), 'a claim is confirmed only once');
do $$ begin
  perform 1 from public.access_requests;
  raise exception 'FAILED: anon read claims';
exception when insufficient_privilege then
  raise notice 'ok - anon cannot read claims';
end $$;
reset role;
select pg_temp.check((select confirmed_by_name = 'Nour Hassan' and confirmed_at is not null from public.access_requests
                      where account_id = '00000000-0000-0000-0000-00000000000b' and type = 'claim'),
  'the confirmation keeps the name typed');

-- Edit a profile (dashboard part 3). Account A is admin of the group 'style-test'.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.comedy_groups set bio = 'New bio', name = 'Style Test Crew' where slug = 'style-test';
reset role;
select pg_temp.check((select name = 'Style Test Crew' and bio = 'New bio' from public.comedy_groups where slug = 'style-test'),
  'an unverified profile saves its new name straight away');
update public.comedy_groups set verified = true where slug = 'style-test';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.comedy_groups set name = 'Renamed Crew', name_ar = 'كرو' where slug = 'style-test';
update public.comedy_groups set name = 'Renamed Crew 2' where slug = 'style-test';
select pg_temp.check((select count(*) = 1 and min(name) = 'Renamed Crew 2' and min(old_name) = 'Style Test Crew'
                      from public.profile_name_changes where status = 'pending'),
  'a verified profile''s new name waits for review, one request at a time');
update public.comedy_groups set status = 'archived' where slug = 'style-test';
update public.comedy_groups set archive_requested_at = '2000-01-01' where slug = 'style-test';
select pg_temp.check((select count(*) = 1 and sum(jsonb_array_length(people)) = 1 from public.profile_panel(null,
                        (select id from public.comedy_groups where slug = 'style-test'))),
  'the side panel lists the people with access');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.profile_panel(null, (select id from public.comedy_groups where slug = 'style-test'))),
  'other accounts get nothing from the side panel');
select pg_temp.check((select count(*) = 0 from public.profile_name_changes),
  'other accounts cannot see name change requests');
do $$ begin
  insert into public.profile_name_changes (group_id, name) select id, 'Hijack' from public.comedy_groups where slug = 'style-test';
  raise exception 'FAILED: an account wrote a name change directly';
exception when insufficient_privilege then
  raise notice 'ok - name changes are written only by the profile rules';
end $$;
reset role;
select pg_temp.check((select name = 'Style Test Crew' and status = 'published' and archive_requested_at > now() - interval '1 minute'
                      from public.comedy_groups where slug = 'style-test'),
  'the old name stays, the admin cannot archive, and "request archive" is dated now');

-- Team and access (dashboard part 6). Account A (admin of 'style-test') invites B.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.dashboard_members (owner_account_id, member_account_id, invite_email, scope, selected, status)
select '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', ' B@Test ', 'selected',
       jsonb_build_array(jsonb_build_object('kind', 'group', 'id', id, 'role', 'moderator')), 'active'
from public.comedy_groups where slug = 'style-test';
select pg_temp.check((select owner_account_id = '00000000-0000-0000-0000-00000000000a' and member_account_id is null
                             and status = 'invited' and invite_email = 'b@test' and expires_at > now() + interval '6 days'
                      from public.dashboard_members where invite_email = 'b@test'),
  'an invitation is always an open invitation from the owner, for a cleaned-up email');
do $$ begin
  update public.dashboard_members set status = 'active';
  raise exception 'FAILED: the owner activated an invitation';
exception when insufficient_privilege then
  raise notice 'ok - only the invited person can accept';
end $$;
select pg_temp.check((select count(*) = 1 and min(status) = 'invited' and min(token::text) is not null from public.my_team()),
  'the owner sees the invitation and its link');
create temp table t_invite on commit drop as select token from public.dashboard_members where invite_email = 'b@test';
grant select on t_invite to authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.check(public.answer_team_invite((select token from t_invite), true) = 'wrong_email',
  'an invitation works only for the invited email');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select for_me and owner_name = 'User A' and jsonb_array_length(profiles) = 1 from public.team_invite((select token from t_invite))),
  'the invited person sees who invited them and to what');
select pg_temp.check((select count(*) = 1 from public.my_team_invites()), 'the invitation waits in the invited person''s requests');
select pg_temp.check(public.answer_team_invite((select token from t_invite), true) = 'ok', 'the invited person accepts');
select pg_temp.check((select private.can_manage_group(id) and not private.is_profile_admin(id, id)
                      from public.comedy_groups where slug = 'style-test'),
  'accepting gives the chosen role on the chosen profiles');
select pg_temp.check(public.answer_team_invite((select token from t_invite), true) = 'not_found', 'a link works once');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.dashboard_members set status = 'removed' where invite_email = 'b@test';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select not private.can_manage_group(id) from public.comedy_groups where slug = 'style-test'),
  'a removed team member loses access at once');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.dashboard_members (invite_email, scope, all_role) values ('b@test', 'all', 'moderator');
reset role;
update public.dashboard_members set expires_at = now() - interval '1 day' where status = 'invited';
create temp table t_invite2 on commit drop as select token from public.dashboard_members where status = 'invited';
grant select on t_invite2 to authenticated;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check(public.answer_team_invite((select token from t_invite2), true) = 'expired',
  'an invitation expires after 7 days');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.dashboard_members set status = 'invited' where status = 'expired';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check(public.answer_team_invite((select token from public.my_team_invites()), true) = 'ok', 'an invitation sent again can be accepted');
select pg_temp.check((select private.can_manage_group(id) from public.comedy_groups where slug = 'style-test'),
  'sending again gives 7 more days, and "all profiles" covers the owner''s profiles');
reset role;

-- ---------------------------------------------------------------- link requests (Requests page)
-- B's lineup tag on A's show is waiting again, with its request from A.
update public.show_performers set link_status = 'pending' where id = '50000000-0000-0000-0000-000000000001';
insert into public.link_requests (id, type, from_account_id, target_comedian_id, show_id)
values ('80000000-0000-0000-0000-000000000001', 'lineup_tag', '00000000-0000-0000-0000-00000000000a',
        '30000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select direction = 'sent' and show_title is not null and target_name = 'Comic B'
                      from public.my_link_requests() where id = '80000000-0000-0000-0000-000000000001'),
  'the sender sees the request under Sent, with names');
select pg_temp.check(public.answer_link_request('80000000-0000-0000-0000-000000000001', true) = 'forbidden',
  'the sender cannot accept their own request');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select direction = 'incoming' and status = 'pending'
                      from public.my_link_requests() where id = '80000000-0000-0000-0000-000000000001'),
  'the tagged profile admin sees it under Incoming');
select pg_temp.check(public.answer_link_request('80000000-0000-0000-0000-000000000001', true) = 'ok',
  'the tagged profile admin accepts');
select pg_temp.check((select link_status = 'accepted' from public.show_performers where id = '50000000-0000-0000-0000-000000000001'),
  'accepting a request shows the link');
select pg_temp.check((select status = 'accepted' and decided_at is not null from public.my_link_requests()
                      where id = '80000000-0000-0000-0000-000000000001'),
  'the answered request moves to history');
select pg_temp.check(public.answer_link_request('80000000-0000-0000-0000-000000000001', false) = 'not_found',
  'a request is answered once');
reset role;
update public.show_performers set link_status = 'pending' where id = '50000000-0000-0000-0000-000000000001';
insert into public.link_requests (id, type, from_account_id, target_comedian_id, show_id)
values ('80000000-0000-0000-0000-000000000002', 'lineup_tag', '00000000-0000-0000-0000-00000000000a',
        '30000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check(public.cancel_link_request('80000000-0000-0000-0000-000000000002') = 'not_found',
  'only the sender can cancel a request');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check(public.cancel_link_request('80000000-0000-0000-0000-000000000002') = 'ok', 'the sender cancels');
select pg_temp.check(not exists (select 1 from public.show_performers where id = '50000000-0000-0000-0000-000000000001'),
  'cancelling takes the waiting tag off the lineup');
reset role;

-- ---------------------------------------------------------------- admin review queue
insert into public.access_requests (id, type, account_id, comedian_id, relation, proof_method, proof_value)
values ('90000000-0000-0000-0000-000000000001', 'claim', '00000000-0000-0000-0000-00000000000b',
        '30000000-0000-0000-0000-00000000000a', 'manager', 'official_dm', 'comica');
insert into public.profile_name_changes (id, comedian_id, name, old_name, requested_by)
values ('90000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-00000000000a', 'Comic A Renamed', 'Comic A',
        '00000000-0000-0000-0000-00000000000a');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check(public.admin_review_queue() is null
                     and public.admin_decide_claim('90000000-0000-0000-0000-000000000001', 'admin', true, null, null) = 'forbidden',
  'only the super admin sees and decides the review queue');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
set local request.jwt.claim.aal = 'aal2';
select pg_temp.check((select count(*) = 2 from jsonb_array_elements(public.admin_review_queue() -> 'pending') i
                      where i ->> 'id' in ('90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002')),
  'the review queue lists the claim and the name change');
select pg_temp.check(public.admin_decide_claim('90000000-0000-0000-0000-000000000001', 'moderator', false, 'Welcome', 'checked DM') = 'ok',
  'the super admin approves a claim');
select pg_temp.check(public.admin_decide_claim('90000000-0000-0000-0000-000000000001', 'reject', false, null, null) = 'not_found',
  'a claim is decided once');
select pg_temp.check(public.admin_decide_name_change('90000000-0000-0000-0000-000000000002', true, null) = 'ok', 'the super admin approves a name change');
select pg_temp.check((select name = 'Comic A Renamed' from public.comedians where id = '30000000-0000-0000-0000-00000000000a'),
  'an approved name change renames the profile');
select pg_temp.check((select count(*) >= 2 from jsonb_array_elements(public.admin_review_queue() -> 'done')), 'decided items move to Done');
set local request.jwt.claim.aal = '';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select role = 'moderator' and status = 'active' from public.profile_access
                      where account_id = '00000000-0000-0000-0000-00000000000b' and comedian_id = '30000000-0000-0000-0000-00000000000a'),
  'an approved claim gives the chosen role');
reset role;

rollback;
