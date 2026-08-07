-- When a new level is added, reopen finished players onto that level

create or replace function public.reopen_finished_progress_on_new_level()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.progress
  set
    finished = false,
    level_id = new.id
  where finished = true;

  return new;
end;
$$;

create trigger on_level_inserted_reopen_finished_progress
  after insert on public.levels
  for each row
  execute function public.reopen_finished_progress_on_new_level();
