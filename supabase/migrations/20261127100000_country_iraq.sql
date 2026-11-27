-- Add Iraq (tour destination) with Baghdad and Erbil. Requested by Dina 2026-11-27.
-- Already applied to the live database; safe to run again.

insert into public.countries (code, name, region, is_market) values
  ('IQ', 'Iraq', 'Levant', false)
on conflict (code) do nothing;

insert into public.cities (country_id, name, slug)
select c.id, v.name, v.slug
from (values
  ('IQ', 'Baghdad', 'baghdad'),
  ('IQ', 'Erbil', 'erbil')
) as v(code, name, slug)
join public.countries c on c.code = v.code
on conflict (country_id, slug) do nothing;
