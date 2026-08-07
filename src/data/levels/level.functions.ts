import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import z from 'zod';

import type { LevelInput } from '../../domain/level';
import type { WallInput } from '../../domain/walls';

import { compareWalls, WallInputSchema } from '../../domain/walls';
import { createAdminClient } from '../../lib/supabase/admin.functions';
import { createServerClient } from '../../lib/supabase/client.server';
import { levelSolutionCache } from './levelSolutionCache.server';

export const getLevelFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const adminClient = createAdminClient();
    const client = createServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;

    const { data } = await adminClient
      .from('progress')
      .select('levels(question, answer, id)')
      .eq('id', user.id)
      .maybeSingle();
    if (!data?.levels) return null;

    const solution = data.levels.answer as any as WallInput[];

    const level = {
      question: data.levels.question as any as LevelInput,
      id: data.levels.id,
    };

    levelSolutionCache.set(String(level.id), solution);

    return level;
  }
);

const levelUp = createServerOnlyFn(async (levelId: number) => {
  const adminClient = createAdminClient();
  const client = createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const nextLevelId = levelId + 1;
  const { data, error } = await adminClient
    .from('progress')
    .update({ level_id: nextLevelId })
    .eq('id', user.id)
    .select('level_id')
    .maybeSingle();
  if (error) throw error;

  return data;
});

const getStoredSolution = createServerOnlyFn(async (levelId: number) => {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('levels')
    .select('answer')
    .eq('id', levelId)
    .maybeSingle();

  if (error) throw error;

  const solution = data?.answer as WallInput[] | null;
  return solution;
});

export const completeLevelFn = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      levelId: z.coerce.number(),
      answer: z.array(WallInputSchema),
    })
  )
  .handler(async ({ data: { answer, levelId } }) => {
    const cacheSolution = levelSolutionCache.get(levelId.toString());
    const solution = cacheSolution ?? (await getStoredSolution(levelId));
    if (!solution) return { isCorrect: false };

    const isCorrect = compareWalls(solution, answer);
    if (!isCorrect) return { isCorrect: false };

    levelUp(levelId);

    return { isCorrect: true };
  });
