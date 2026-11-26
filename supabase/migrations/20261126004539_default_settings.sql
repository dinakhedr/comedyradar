-- Comedy Radar: default site settings (docs/website-spec.md, sections 9, 10, 11.5).
-- These are configuration values, not sample content. The super admin can
-- change them later in /admin/settings.

insert into public.site_settings (key, value) values
  ('spotlight_slides',        '5'::jsonb),
  ('spotlight_autoadvance_s', '6'::jsonb),
  ('coming_up_count',         '8'::jsonb),
  ('track_count',             '6'::jsonb),
  ('new_signal_days',         '7'::jsonb),
  ('invite_expiry_days',      '7'::jsonb),
  ('instagram_handle',        '"@comedyradar"'::jsonb),
  ('contact_email',           '"comedyradarnetwork@gmail.com"'::jsonb),
  ('default_city',            '"cairo"'::jsonb),
  ('review_rules',            '{"review_new_profiles": true, "review_unverified_shows": true, "review_name_changes": true, "auto_confirm_claims": true, "consent_for_tags": true}'::jsonb)
on conflict (key) do nothing;
