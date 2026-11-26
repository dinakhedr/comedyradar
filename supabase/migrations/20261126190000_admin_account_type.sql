-- Super admin: change an account's type (Comedian / Manager or agent).
-- The type only changes the onboarding steps and the label; it gives no rights.
-- Returns 'ok', 'not_found', 'bad_value' or 'forbidden'.
create or replace function public.admin_set_account_type(p_id uuid, p_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    return 'forbidden';
  end if;
  if p_type is null or p_type not in ('comedian', 'manager') then
    return 'bad_value';
  end if;
  update public.accounts set account_type = p_type where id = p_id;
  if not found then
    return 'not_found';
  end if;
  return 'ok';
end;
$$;

revoke all on function public.admin_set_account_type(uuid, text) from public;
grant execute on function public.admin_set_account_type(uuid, text) to authenticated;
