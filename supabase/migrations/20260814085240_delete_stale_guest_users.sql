-- Delete anonymous guests created > 3 days ago who are still on level 1.
-- Cascades to profiles + progress via FK. Callable only as service_role.

create or replace function public.delete_stale_guest_users()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from auth.users as u
    using public.progress as p
    where u.id = p.id
      and u.is_anonymous is true
      and u.created_at < now() - interval '3 days'
      and p.level_id = 1
    returning u.id
  )
  select count(*)::integer
  into deleted_count
  from deleted;

  return deleted_count;
end;
$$;

revoke all on function public.delete_stale_guest_users() from public, anon, authenticated;
grant execute on function public.delete_stale_guest_users() to service_role;
