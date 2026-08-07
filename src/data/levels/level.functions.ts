import { createServerFn } from '@tanstack/react-start';
import z from 'zod';

import type { LevelInput } from '../../domain/level';
import type { WallInput } from '../../domain/walls';

import { compareWalls, WallInputSchema } from '../../domain/walls';
import { createAdminClient } from '../../lib/supabase/admin.functions';
import { createServerClient } from '../../lib/supabase/client.server';
import { levelSolutionCache } from './levelSolutionCache.server';

export const getCurrentLevelFn = createServerFn({ method: 'GET' }).handler(
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

export const checkLevelCompletionFn = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      levelId: z.string(),
      answer: z.array(WallInputSchema),
    })
  )
  .handler(async ({ data: { answer, levelId } }) => {
    const adminClient = createAdminClient();

    const cacheSolution = levelSolutionCache.get(levelId);

    if (cacheSolution) return compareWalls(cacheSolution, answer);

    const { data, error } = await adminClient
      .from('progress')
      .select('levels(answer)')
      .eq('id', levelId)
      .maybeSingle();

    if (error) throw error;

    const solution = (data?.levels.answer ?? null) as WallInput[] | null;
    if (solution === null) return false;

    const isCorrect = compareWalls(solution, answer);
    return isCorrect;
  });
