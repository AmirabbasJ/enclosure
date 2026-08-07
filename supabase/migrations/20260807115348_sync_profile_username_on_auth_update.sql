-- Sync profiles.username when auth.users username metadata changes
-- (e.g. guest upgrade via updateUser)

create or replace function public.handle_user_username_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  old_username text;
  new_username text;
begin
  old_username := lower(trim(coalesce(old.raw_user_meta_data->>'username', '')));
  new_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));

  if new_username = '' or new_username = old_username then
    return new;
  end if;

  insert into public.profiles (id, username)
  values (new.id, new_username)
  on conflict (id) do update
    set username = excluded.username;

  return new;
end;
$$;

create trigger on_auth_user_username_updated
  after update of raw_user_meta_data on auth.users
  for each row
  execute function public.handle_user_username_update();
