-- Rename levels.question → level, levels.answer → solution
-- Idempotent: remote may already have the new names (dashboard rename).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'levels'
      and column_name = 'question'
  ) then
    alter table public.levels rename column question to level;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'levels'
      and column_name = 'answer'
  ) then
    alter table public.levels rename column answer to solution;
  end if;
end $$;
