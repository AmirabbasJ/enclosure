import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import z from 'zod';

import type { LevelInput } from '../../domain/level';
import type { WallInput } from '../../domain/walls';

import { compareWalls, WallInputSchema } from '../../domain/walls';
import { createAdminClient } from '../../lib/supabase/admin.functions';
import { createServerClient } from '../../lib/supabase/client.server';
import { levelSolutionCache } from './levelSolutionCache.server';

export const getLevelFn = createServerFn({ method: 'POST' })
  .validator(z.object({ levelId: z.number().int().positive().optional() }))
  .handler(async ({ data }) => {
    const adminClient = createAdminClient();
    const client = createServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;

    let { levelId } = data;

    const { data: progress } = await adminClient
      .from('progress')
      .select('level_id, finished')
      .eq('id', user.id)
      .maybeSingle();

    if (progress?.finished) return null;

    if (levelId == null) {
      if (!progress?.level_id) return null;
      levelId = progress.level_id;
    }

    const { data: levelRow } = await adminClient
      .from('levels')
      .select('question, answer, id')
      .eq('id', levelId)
      .maybeSingle();
    if (!levelRow) return null;

    const solution = levelRow.answer as any as WallInput[];

    const level = {
      question: levelRow.question as any as LevelInput,
      id: levelRow.id,
    };

    levelSolutionCache.set(String(level.id), solution);

    return level;
  });

const levelUp = createServerOnlyFn(async (levelId: number) => {
  const client = createServerClient();
  const { data, error } = await client
    .rpc('level_up', { completed_level_id: levelId })
    .maybeSingle();

  if (!data) throw new Error('progress not found');
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
    if (!solution) throw new Error('solution not found');
    console.log({
      solution,
      answer,
    });

    const isCorrect = compareWalls(solution, answer);
    if (!isCorrect) return { isCorrect: false };

    const progress = await levelUp(levelId);

    return { isCorrect: true, progress };
  });
