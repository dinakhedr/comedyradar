-- Contact form (spec 7.5 item 3) and the admin Messages page.
-- Visitors no longer insert into contact_messages directly. They call
-- public.contact_send(), which checks every field and limits how often one
-- visitor (and everyone together) can send. Until there is an email service,
-- the super admin reads messages in the admin panel.

create table private.contact_attempts (
  id bigint generated always as identity primary key,
  client_hash text not null,
  created_at timestamptz not null default now()
);
create index on private.contact_attempts (client_hash, created_at);
create index on private.contact_attempts (created_at);
alter table private.contact_attempts enable row level security;

revoke insert on public.contact_messages from anon, authenticated;
drop policy if exists "Anyone can send a contact message" on public.contact_messages;

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

-- Returns 'ok', 'invalid' or 'slow_down'.
create or replace function public.contact_send(
  p_name text, p_email text, p_sender_type text, p_topic text,
  p_page_url text, p_message text, p_client text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_type text := nullif(btrim(coalesce(p_sender_type, '')), '');
  v_topic text := nullif(btrim(coalesce(p_topic, '')), '');
  v_page text := nullif(btrim(coalesce(p_page_url, '')), '');
  v_message text := btrim(coalesce(p_message, ''));
  v_client text := left(coalesce(nullif(btrim(p_client), ''), 'unknown'), 128);
begin
  if length(v_name) not between 1 and 100
     or length(v_email) > 254
     or v_email !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
     or (v_type is not null and v_type not in ('fan', 'comedian', 'manager', 'venue', 'press', 'other'))
     or (v_topic is not null and v_topic not in ('wrong_detail', 'cancelled', 'update_or_remove', 'claim_help', 'partnership', 'other'))
     or (v_page is not null and (length(v_page) > 500 or v_page !~ '^(https?://|/)'))
     or length(v_message) not between 2 and 4000 then
    return 'invalid';
  end if;

  -- At most 5 messages per visitor per hour, and 100 for everyone per 10 minutes.
  if (select count(*) from private.contact_attempts
      where client_hash = v_client and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from private.contact_attempts
         where created_at > now() - interval '10 minutes') >= 100 then
    return 'slow_down';
  end if;

  insert into private.contact_attempts (client_hash) values (v_client);
  delete from private.contact_attempts where created_at < now() - interval '1 day';

  insert into public.contact_messages (name, email, sender_type, topic, page_url, message)
  values (v_name, v_email, v_type, v_topic, v_page, v_message);
  return 'ok';
end;
$$;

revoke all on function public.contact_send(text, text, text, text, text, text, text) from public;
grant execute on function public.contact_send(text, text, text, text, text, text, text) to anon, authenticated;
