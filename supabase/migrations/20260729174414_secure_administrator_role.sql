-- A global administrator is assigned only by trusted server-side provisioning.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in (
    'Administrator',
    'Onboarding Manager',
    'Bot Architect',
    'Customer Success Lead'
  ));

-- Never derive an authorization role from raw_user_meta_data: users can edit it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'Onboarding Manager'
  );
  return new;
end;
$$;

revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
