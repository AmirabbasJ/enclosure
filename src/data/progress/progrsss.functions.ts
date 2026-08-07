import { createServerFn } from '@tanstack/react-start';

import type { Progress } from '../../domain/progress';

import { createServerClient } from '../../lib/supabase/client.server';

export const getProgressFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Progress | null> => {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('progress')
      .select('level_id, finished')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    return data;
  }
);
