-- Profiles + username auth helpers

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_length check (
    char_length(username) >= 3
    and char_length(username) <= 24
  ),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]+$')
);

create unique index profiles_username_unique on public.profiles (username);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_username text;
begin
  new_username := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));

  if new_username = '' then
    raise exception 'username is required';
  end if;

  insert into public.profiles (id, username)
  values (new.id, new_username);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.is_username_available(desired text)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(trim(desired))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated, service_role;
