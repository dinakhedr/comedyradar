-- Newsletter sign-up (spec 13 phase 1 step 6, section 10 RLS: insert only, with rate limiting).
-- Visitors no longer insert into newsletter_subscribers directly. They call
-- public.newsletter_subscribe(), which checks the email, limits how often one
-- visitor (and everyone together) can sign up, and never says whether an email
-- was already on the list.

-- One row per sign-up attempt; client_hash is a one-way hash of the visitor's
-- IP address made by the website server, never the address itself.
create table private.newsletter_attempts (
  id bigint generated always as identity primary key,
  client_hash text not null,
  created_at timestamptz not null default now()
);
create index on private.newsletter_attempts (client_hash, created_at);
create index on private.newsletter_attempts (created_at);
alter table private.newsletter_attempts enable row level security;

revoke insert on public.newsletter_subscribers from anon, authenticated;
drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;

-- Returns 'ok', 'invalid' or 'slow_down'.
create or replace function public.newsletter_subscribe(p_email text, p_client text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_client text := left(coalesce(nullif(btrim(p_client), ''), 'unknown'), 128);
begin
  if length(v_email) > 254
     or v_email !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then
    return 'invalid';
  end if;

  -- At most 5 attempts per visitor per hour, and 300 for everyone per 10 minutes.
  if (select count(*) from private.newsletter_attempts
      where client_hash = v_client and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from private.newsletter_attempts
         where created_at > now() - interval '10 minutes') >= 300 then
    return 'slow_down';
  end if;

  insert into private.newsletter_attempts (client_hash) values (v_client);
  delete from private.newsletter_attempts where created_at < now() - interval '1 day';

  insert into public.newsletter_subscribers (email) values (v_email)
  on conflict (email) do nothing;
  return 'ok';
end;
$$;

revoke all on function public.newsletter_subscribe(text, text) from public;
grant execute on function public.newsletter_subscribe(text, text) to anon, authenticated;

comment on function public.newsletter_subscribe(text, text) is
  'Newsletter sign-up from the yellow band. Returns ok / invalid / slow_down; never reveals existing emails.';
