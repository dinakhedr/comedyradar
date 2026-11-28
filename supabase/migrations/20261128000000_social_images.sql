-- Social images (docs/social-templates.md): log each download of a generated
-- image in the Activity log. The activity_log table is written by triggers
-- only, so the super admin writes this one entry through this function.
-- No table or column changes. Returns 'ok', 'forbidden' or 'not_found'.

create or replace function public.admin_log_social_image(
  p_comedian_id uuid, p_template text, p_first_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;

  select name into v_name from public.comedians where id = p_comedian_id;
  if v_name is null then
    return 'not_found';
  end if;

  insert into public.activity_log (account_id, action, entity_type, entity_id, details)
  values (
    (select auth.uid()),
    'generate_social_image',
    'comedian',
    p_comedian_id,
    jsonb_build_object(
      'name', v_name,
      'template', left(coalesce(p_template, ''), 40),
      'first_name', nullif(left(btrim(coalesce(p_first_name, '')), 40), '')
    )
  );
  return 'ok';
end;
$$;

revoke all on function public.admin_log_social_image(uuid, text, text) from public, anon;
grant execute on function public.admin_log_social_image(uuid, text, text) to authenticated;
