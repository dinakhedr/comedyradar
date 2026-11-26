-- The Instagram account is @comedy_radar (confirmed by Dina on 2026-11-26).
update public.site_settings set value = '"@comedy_radar"'::jsonb where key = 'instagram_handle';
