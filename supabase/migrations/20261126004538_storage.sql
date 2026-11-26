-- Comedy Radar: storage buckets and their rules (docs/website-spec.md, section 10).
--
-- Folder layout (the first folders name the profile, so the rules can check access):
--   comedians/<comedian_id>/...            profile admins
--   groups/<group_id>/...                  profile admins
--   podcasts/<podcast_id>/...              podcast managers (host admins)
--   posters/comedian/<comedian_id>/...     profile admins and moderators
--   posters/group/<group_id>/...           profile admins and moderators
--   claim-documents/<account_id>/...       uploader writes, super admin reads

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('posters',         'posters',         true,  10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('comedians',       'comedians',       true,  10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('groups',          'groups',          true,  10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('podcasts',        'podcasts',        true,  10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('claim-documents', 'claim-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Safe text -> uuid (null when the folder name is not a uuid).
create or replace function private.try_uuid(p text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function private.try_uuid(text) to anon, authenticated, service_role;

-- Who may write to a given object path?
create or replace function private.can_write_object(p_bucket text, p_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    private.is_super_admin()
    or (
      private.is_active_account()
      and case p_bucket
        when 'comedians' then
          private.is_comedian_admin(private.try_uuid((storage.foldername(p_name))[1]))
        when 'groups' then
          private.is_group_admin(private.try_uuid((storage.foldername(p_name))[1]))
        when 'podcasts' then
          private.can_manage_podcast(private.try_uuid((storage.foldername(p_name))[1]))
        when 'posters' then
          case (storage.foldername(p_name))[1]
            when 'comedian' then private.can_manage_comedian(private.try_uuid((storage.foldername(p_name))[2]))
            when 'group'    then private.can_manage_group(private.try_uuid((storage.foldername(p_name))[2]))
            else false
          end
        when 'claim-documents' then
          private.try_uuid((storage.foldername(p_name))[1]) = (select auth.uid())
        else false
      end
    );
$$;
revoke all on function private.can_write_object(text, text) from public;
grant execute on function private.can_write_object(text, text) to anon, authenticated, service_role;

-- Public buckets: anyone can read (also served through public URLs).
create policy "Public images are readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('posters', 'comedians', 'groups', 'podcasts'));

-- Claim documents: only the super admin reads them.
create policy "Super admin reads claim documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'claim-documents' and (select private.is_super_admin()));

create policy "Managers upload files" on storage.objects
  for insert to authenticated
  with check (private.can_write_object(bucket_id, name));

create policy "Managers replace files" on storage.objects
  for update to authenticated
  using (bucket_id <> 'claim-documents' and private.can_write_object(bucket_id, name))
  with check (bucket_id <> 'claim-documents' and private.can_write_object(bucket_id, name));

create policy "Managers delete files" on storage.objects
  for delete to authenticated
  using (
    (bucket_id <> 'claim-documents' and private.can_write_object(bucket_id, name))
    or (select private.is_super_admin())
  );
