-- Site search (spec section 8): one search across groups, comedians, shows,
-- tours and venues, in English and Arabic names, with pg_trgm for typos.
--
-- search_radar runs as the caller (security invoker), so the normal RLS rules
-- decide what each visitor can find: anonymous visitors only see published
-- profiles, tours and venues, and upcoming published shows.

-- How well one name matches the query, from 0 to 1.
--  1.0  exact match (ignoring case and spaces: "highfive" = "High Five")
--  0.9  the query is inside the name (ignoring case and spaces)
--  else trigram word similarity, which catches typos ("hihgfive")
create or replace function private.search_score(name text, q text)
returns real
language sql
immutable
set search_path = ''
as $$
  select case
    when name is null or btrim(q) = '' then 0::real
    when regexp_replace(lower(name), '\s+', '', 'g') = regexp_replace(lower(q), '\s+', '', 'g') then 1::real
    when strpos(regexp_replace(lower(name), '\s+', '', 'g'), regexp_replace(lower(q), '\s+', '', 'g')) > 0 then 0.9::real
    else extensions.word_similarity(lower(btrim(q)), lower(name))
  end
$$;

create or replace function public.search_radar(q text)
returns table (kind text, id uuid, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  with hits as (
    select 'comedian'::text as kind, c.id,
           greatest(private.search_score(c.name, q), private.search_score(c.name_ar, q)) as score
    from public.comedians c
    where c.status = 'published'
    union all
    select 'group', g.id,
           greatest(private.search_score(g.name, q), private.search_score(g.name_ar, q))
    from public.comedy_groups g
    where g.status = 'published'
    union all
    select 'venue', v.id,
           greatest(private.search_score(v.name, q), private.search_score(v.name_ar, q))
    from public.venues v
    where v.status = 'published'
    union all
    select 'tour', t.id, private.search_score(t.name, q)
    from public.tours t
    where t.status = 'published'
    union all
    select 'show', s.id, private.search_score(s.title, q)
    from public.v_upcoming_shows s
  )
  select h.kind, h.id, h.score
  from hits h
  where length(regexp_replace(coalesce(q, ''), '\s+', '', 'g')) >= 2
    and h.score >= 0.45
  order by h.score desc
  limit 200
$$;

revoke all on function private.search_score(text, text) from public;
grant execute on function private.search_score(text, text) to anon, authenticated, service_role;
revoke all on function public.search_radar(text) from public;
grant execute on function public.search_radar(text) to anon, authenticated, service_role;
