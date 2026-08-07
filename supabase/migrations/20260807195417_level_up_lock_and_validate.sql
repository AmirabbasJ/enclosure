-- Enforce current-level match + row lock against concurrent advances

drop function if exists public.level_up(integer);

create or replace function public.level_up(completed_level_id integer)
returns table (
  level_id smallint,
  finished boolean
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  current_level_id smallint;
  max_level_id smallint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Lock the player's progress row.
  select p.level_id
  into current_level_id
  from public.progress as p
  where p.id = uid
  for update;

  if current_level_id is null then
    raise exception 'progress not found';
  end if;

  -- The submitted level must be the player's current level.
  if current_level_id <> completed_level_id::smallint then
    raise exception 'invalid level';
  end if;

  -- Find the last level.
  select l.id
  into max_level_id
  from public.levels as l
  order by l.id desc
  limit 1;

  if max_level_id is null then
    raise exception 'no levels found';
  end if;

  -- Last level → finish the game.
  if current_level_id = max_level_id then
    return query
    update public.progress as p
    set finished = true
    where p.id = uid
    returning p.level_id, p.finished;

  -- Normal level → advance.
  else
    return query
    update public.progress as p
    set level_id = (current_level_id + 1)::smallint
    where p.id = uid
    returning p.level_id, p.finished;
  end if;
end;
$$;

revoke all on function public.level_up(integer) from public;
grant execute on function public.level_up(integer) to authenticated;
