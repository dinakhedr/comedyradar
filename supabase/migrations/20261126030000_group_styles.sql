-- Comedy styles and performing language of a comedy group (approved by Dina, 2026-11-26).
-- styles: several of the approved list; performing_language: one of three, kept apart from styles.
-- Both are edited with the rest of the group profile, so the existing RLS policies of
-- comedy_groups already cover them.

alter table public.comedy_groups
  add column styles text[] not null default '{}'
    constraint comedy_groups_styles_check check (
      styles <@ array['stand-up', 'improv', 'sketch', 'roast', 'open-mic',
                      'storytelling', 'musical', 'dark', 'family']::text[]
    ),
  add column performing_language text
    constraint comedy_groups_performing_language_check check (
      performing_language in ('arabic', 'english', 'bilingual')
    );

comment on column public.comedy_groups.styles is
  'Comedy styles: stand-up, improv, sketch, roast, open-mic, storytelling, musical, dark, family.';
comment on column public.comedy_groups.performing_language is
  'Language the group performs in: arabic, english or bilingual (empty when unknown).';
