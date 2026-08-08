-- Full leaderboard: no limit, include guest flag from auth.users
drop function if exists public.get_leaderboard(integer);

create or replace function public.get_leaderboard()
returns table (
  rank bigint,
  username text,
  level_id smallint,
  finished boolean,
  is_guest boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    row_number() over (
      order by p.finished desc, p.level_id desc, p.completed_at asc
    ) as rank,
    case
      when u.is_anonymous then 'Guest-' || split_part(u.id::text, '-', 1)
      else coalesce(nullif(pr.username, ''), 'anonymous')
    end as username,
    p.level_id,
    p.finished,
    coalesce(u.is_anonymous, false) as is_guest
  from public.progress as p
  inner join public.profiles as pr on pr.id = p.id
  inner join auth.users as u on u.id = p.id
  order by p.finished desc, p.level_id desc, p.completed_at asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;
