-- progress.level_id / levels.id are smallint; match return type

drop function if exists public.level_up(integer);

create or replace function public.level_up(completed_level_id integer)
returns table (level_id smallint, finished boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  max_level_id smallint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select l.id
  into max_level_id
  from public.levels as l
  order by l.id desc
  limit 1;

  if max_level_id = completed_level_id then
    return query
    update public.progress as p
    set finished = true
    where p.id = uid
    returning p.level_id, p.finished;
  else
    return query
    update public.progress as p
    set level_id = (completed_level_id + 1)::smallint
    where p.id = uid
    returning p.level_id, p.finished;
  end if;
end;
$$;

revoke all on function public.level_up(integer) from public;
grant execute on function public.level_up(integer) to authenticated;
