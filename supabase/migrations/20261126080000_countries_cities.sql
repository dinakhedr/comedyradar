-- Starting countries and cities (reference data from Dina, 2026-11-26; not sample content).
-- The super admin can add, rename or remove them later in the admin panel.
-- Egypt is the launch market (is_market = true); the others are tour destinations.

insert into public.countries (code, name, region, is_market) values
  ('EG', 'Egypt', 'Egypt', true),
  ('SA', 'Saudi Arabia', 'Gulf', false),
  ('AE', 'United Arab Emirates', 'Gulf', false),
  ('KW', 'Kuwait', 'Gulf', false),
  ('QA', 'Qatar', 'Gulf', false),
  ('BH', 'Bahrain', 'Gulf', false),
  ('JO', 'Jordan', 'Levant', false),
  ('LB', 'Lebanon', 'Levant', false),
  ('GB', 'United Kingdom', 'Europe', false),
  ('FR', 'France', 'Europe', false),
  ('DE', 'Germany', 'Europe', false),
  ('NL', 'Netherlands', 'Europe', false),
  ('ES', 'Spain', 'Europe', false),
  ('IT', 'Italy', 'Europe', false),
  ('US', 'United States', 'North America', false)
on conflict (code) do nothing;

insert into public.cities (country_id, name, slug)
select c.id, v.name, v.slug
from (values
  ('EG', 'Cairo', 'cairo'),
  ('EG', 'Giza', 'giza'),
  ('EG', 'Alexandria', 'alexandria'),
  ('EG', 'Mansoura', 'mansoura'),
  ('EG', 'North Coast', 'north-coast'),
  ('EG', 'El Gouna', 'el-gouna'),
  ('SA', 'Jeddah', 'jeddah'),
  ('SA', 'Riyadh', 'riyadh'),
  ('AE', 'Abu Dhabi', 'abu-dhabi'),
  ('AE', 'Dubai', 'dubai'),
  ('KW', 'Kuwait City', 'kuwait-city'),
  ('QA', 'Doha', 'doha'),
  ('BH', 'Manama', 'manama'),
  ('JO', 'Amman', 'amman'),
  ('LB', 'Beirut', 'beirut'),
  ('GB', 'London', 'london'),
  ('FR', 'Paris', 'paris'),
  ('DE', 'Berlin', 'berlin'),
  ('NL', 'Amsterdam', 'amsterdam'),
  ('ES', 'Madrid', 'madrid'),
  ('IT', 'Rome', 'rome'),
  ('US', 'New York', 'new-york'),
  ('US', 'Los Angeles', 'los-angeles')
) as v(code, name, slug)
join public.countries c on c.code = v.code
on conflict (country_id, slug) do nothing;
