-- Error log for the super admin (Activity log, Errors tab).
-- The website records every error a visitor or admin hits: on the server
-- (loading a page, saving a form, an API route) and in the browser.
-- Only the super admin can read it. Kept for 90 days.

create table if not exists public.site_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  times int not null default 1,
  group_key text not null,
  source text not null check (source in ('render', 'action', 'route', 'proxy', 'browser')),
  message text not null,
  digest text,
  path text,
  route text,
  method text,
  account_id uuid references public.accounts (id) on delete set null,
  user_agent text,
  stack text
);

create index if not exists site_errors_created_at_idx on public.site_errors (created_at desc);
create index if not exists site_errors_group_idx on public.site_errors (group_key, created_at desc);
create index if not exists site_errors_account_idx on public.site_errors (account_id);
create index if not exists site_errors_digest_idx on public.site_errors (digest);

-- Nobody reads or writes the table directly; the two functions below do.
alter table public.site_errors enable row level security;
revoke all on public.site_errors from anon, authenticated;

-- ---------------------------------------------------------------------------
-- log_site_error(p): records one error. Called by the website for any visitor.
-- The signed-in person comes from the session (auth.uid()), never from p.
-- The same error on the same page and Cairo day is counted, not repeated.
-- At most 300 new entries an hour, so nobody can flood the log.
-- ---------------------------------------------------------------------------
create or replace function public.log_site_error(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := coalesce(p ->> 'source', '');
  v_message text := left(btrim(coalesce(p ->> 'message', '')), 1000);
  v_digest text := nullif(left(btrim(coalesce(p ->> 'digest', '')), 64), '');
  v_path text := nullif(left(btrim(coalesce(p ->> 'path', '')), 500), '');
  v_key text;
  v_uid uuid := (select auth.uid());
  v_account uuid;
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_id bigint;
begin
  if v_source not in ('render', 'action', 'route', 'proxy', 'browser') or v_message = '' then
    return;
  end if;
  select id into v_account from public.accounts where id = v_uid;
  v_key := md5(v_source || '|' || coalesce(v_digest, v_message) || '|' || coalesce(v_path, ''));

  select id into v_id from public.site_errors
  where group_key = v_key
    and created_at >= v_today::timestamp at time zone 'Africa/Cairo'
  order by created_at desc
  limit 1;

  if v_id is not null then
    update public.site_errors
    set times = times + 1, last_seen_at = now(), account_id = coalesce(v_account, account_id)
    where id = v_id;
    return;
  end if;

  if (select count(*) from public.site_errors where created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;

  insert into public.site_errors (group_key, source, message, digest, path, route, method, account_id, user_agent, stack)
  values (
    v_key, v_source, v_message, v_digest, v_path,
    nullif(left(btrim(coalesce(p ->> 'route', '')), 300), ''),
    nullif(left(btrim(coalesce(p ->> 'method', '')), 10), ''),
    v_account,
    nullif(left(btrim(coalesce(p ->> 'user_agent', '')), 300), ''),
    nullif(left(coalesce(p ->> 'stack', ''), 4000), '')
  );
end;
$$;

revoke all on function public.log_site_error(jsonb) from public;
grant execute on function public.log_site_error(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_site_errors: the Errors tab. Super admin with 2-step only (else null).
-- p_q: searches reference, page and message; p_source: '' | 'server' | 'browser';
-- p_period: 'today' | '7d' | '30d' | 'all'; p_limit: 1–5000.
-- Returns {"rows", "more", "last24"}. Entries older than 90 days are removed.
-- ---------------------------------------------------------------------------
create or replace function public.admin_site_errors(p_q text, p_source text, p_period text, p_limit int)
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
    else null end;
  v_rows jsonb;
begin
  if not private.is_super_admin() then
    return null;
  end if;

  delete from public.site_errors where last_seen_at < now() - interval '90 days';

  with f as (
    select e.id, e.created_at, e.last_seen_at, e.times, e.source, e.message, e.digest, e.path,
           e.route, e.method, e.user_agent, e.stack,
           coalesce(a.display_name, u.email) as who,
           case when e.account_id is null then null
                when a.is_super_admin then 'super admin'
                else 'creator' end as role
    from public.site_errors e
    left join public.accounts a on a.id = e.account_id
    left join auth.users u on u.id = e.account_id
    where (v_since is null or e.created_at >= v_since)
      and (coalesce(p_source, '') = ''
           or (p_source = 'browser' and e.source = 'browser')
           or (p_source = 'server' and e.source <> 'browser'))
      and (v_q is null
           or e.digest = v_q
           or e.path ilike '%' || v_q || '%'
           or e.message ilike '%' || v_q || '%')
    order by e.id desc
    limit v_limit + 1
  )
  select coalesce(jsonb_agg(to_jsonb(f) order by f.id desc), '[]'::jsonb) into v_rows from f;

  return jsonb_build_object(
    'rows', (select coalesce(jsonb_agg(r order by i), '[]'::jsonb) from jsonb_array_elements(v_rows) with ordinality t(r, i) where i <= v_limit),
    'more', jsonb_array_length(v_rows) > v_limit,
    'last24', (select count(*) from public.site_errors where last_seen_at > now() - interval '24 hours'));
end;
$$;

revoke all on function public.admin_site_errors(text, text, text, int) from public;
grant execute on function public.admin_site_errors(text, text, text, int) to authenticated;
