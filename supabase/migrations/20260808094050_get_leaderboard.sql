-- Rank players by progress: finished first, then higher level
create or replace function public.get_leaderboard(result_limit integer default 50)
returns table (
  rank bigint,
  username text,
  level_id smallint,
  finished boolean
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    row_number() over (
      order by p.finished desc, p.level_id desc, p.completed_at asc
    ) as rank,
    coalesce(nullif(pr.username, ''), 'anonymous') as username,
    p.level_id,
    p.finished
  from public.progress as p
  inner join public.profiles as pr on pr.id = p.id
  order by p.finished desc, p.level_id desc, p.completed_at asc
  limit greatest(1, least(coalesce(result_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
