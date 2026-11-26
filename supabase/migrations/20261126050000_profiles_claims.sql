-- Creator dashboard, part 2 (spec 11.3 and 11.4 item 2): create or claim a profile.

-- ---------------------------------------------------------------------------
-- Find profiles by English or Arabic name: step 1 "Is your profile already on
-- Comedy Radar?" and the duplicate check before a new profile is saved.
-- Lists published and in-review profiles (names only for those in review),
-- and whether each one already has an admin.
-- ---------------------------------------------------------------------------
create or replace function public.find_profiles(q text)
returns table (
  kind text,
  id uuid,
  name text,
  name_ar text,
  slug text,
  photo_url text,
  status public.content_status,
  has_admin boolean,
  score real
)
language sql
stable
security definer
set search_path = ''
as $$
  with hits as (
    select 'comedian'::text as kind, c.id, c.name, c.name_ar, c.slug, c.photo_url, c.status,
           exists (select 1 from public.profile_access pa
                   where pa.comedian_id = c.id and pa.role = 'admin' and pa.status = 'active') as has_admin,
           greatest(private.search_score(c.name, q), private.search_score(c.name_ar, q)) as score
    from public.comedians c
    where c.status in ('published', 'pending')
    union all
    select 'group', g.id, g.name, g.name_ar, g.slug, g.photo_url, g.status,
           exists (select 1 from public.profile_access pa
                   where pa.group_id = g.id and pa.role = 'admin' and pa.status = 'active'),
           greatest(private.search_score(g.name, q), private.search_score(g.name_ar, q))
    from public.comedy_groups g
    where g.status in ('published', 'pending')
  )
  select h.kind, h.id, h.name, h.name_ar,
         case when h.status = 'published' then h.slug end,
         case when h.status = 'published' then h.photo_url end,
         h.status, h.has_admin, h.score
  from hits h
  where (select auth.uid()) is not null
    and length(regexp_replace(coalesce(q, ''), '\s+', '', 'g')) >= 2
    and h.score >= 0.45
  order by h.score desc, h.name
  limit 12;
$$;

revoke all on function public.find_profiles(text) from public;
grant execute on function public.find_profiles(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Claims, proof "The comedian or a group member confirms": the claimant shares
-- a private link (WhatsApp or email); one tap confirms it, no account needed.
-- ---------------------------------------------------------------------------
alter table public.access_requests
  add column confirm_token uuid unique default gen_random_uuid(),
  add column confirmed_by_name text check (char_length(confirmed_by_name) <= 80);

comment on column public.access_requests.confirm_token is
  'Secret for the "comedian confirms" link; readable only by the claimant (RLS) and the super admin.';

-- Shows who asked, so the person confirming knows what they confirm.
create or replace function public.claim_to_confirm(p_token uuid)
returns table (profile_name text, profile_kind text, claimant_name text, relation text, confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(c.name, g.name),
         case when r.comedian_id is not null then 'comedian' else 'group' end,
         a.display_name,
         r.relation,
         r.confirmed_at is not null
  from public.access_requests r
  left join public.comedians c on c.id = r.comedian_id
  left join public.comedy_groups g on g.id = r.group_id
  left join public.accounts a on a.id = r.account_id
  where r.confirm_token = p_token
    and r.type = 'claim'
    and r.proof_method = 'comedian_confirms'
    and r.status = 'pending';
$$;

-- One tap: marks the claim as confirmed, with the name the person typed.
-- The claimant shares the link themselves, so the super admin still reviews it.
create or replace function public.confirm_claim(p_token uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    return false;
  end if;
  update public.access_requests
  set confirmed_at = now(),
      confirmed_by_name = left(btrim(p_name), 80)
  where confirm_token = p_token
    and type = 'claim'
    and proof_method = 'comedian_confirms'
    and status = 'pending'
    and confirmed_at is null;
  return found;
end;
$$;

revoke all on function public.claim_to_confirm(uuid) from public;
revoke all on function public.confirm_claim(uuid, text) from public;
grant execute on function public.claim_to_confirm(uuid) to anon, authenticated;
grant execute on function public.confirm_claim(uuid, text) to anon, authenticated;
