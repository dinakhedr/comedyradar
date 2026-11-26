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

-- Locations (as the database owner)
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
update public.comedians set status = 'published' where id = '30000000-0000-0000-0000-00000000000a';
select pg_temp.check((select status = 'published' from public.comedians where id = '30000000-0000-0000-0000-00000000000a'),
                     'super admin publishes a profile');

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
update public.comedians set verified = true where id = '30000000-0000-0000-0000-00000000000a';

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
-- A adds B to A's dashboard team with "All profiles · Moderator".
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
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

rollback;
