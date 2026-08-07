import { createServerFn } from '@tanstack/react-start';
import z from 'zod';

import type { LevelInput } from '../../domain/level';
import type { WallInput } from '../../domain/walls';

import { compareWalls, WallInputSchema } from '../../domain/walls';
import { createAdminClient } from '../../lib/supabase/admin.functions';
import { createServerClient } from '../../lib/supabase/client.server';

export const getCurrentLevelFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const adminClient = createAdminClient();
    const client = createServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await adminClient
      .from('progress')
      .select('levels(question)')
      .eq('id', user.id)
      .maybeSingle();
    const level = (data?.levels ?? null) as { question: LevelInput } | null;
    if (error) throw error;
    return level;
  }
);

export const checkLevelCompletionFn = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      answer: z.array(WallInputSchema),
    })
  )
  .handler(async ({ data: { answer } }) => {
    const adminClient = createAdminClient();
    const client = createServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await adminClient
      .from('progress')
      .select('levels(answer)')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    const solution = (data?.levels?.answer ?? null) as WallInput[] | null;
    if (solution === null) return false;

    const isCorrect = compareWalls(solution, answer);
    return isCorrect;
  });
