import { createServerFn } from '@tanstack/react-start';

import { createServerClient } from '../../lib/supabase/client.server';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level_id: number;
  finished: boolean;
  is_guest: boolean;
}

export const getLeaderboardFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<LeaderboardEntry[]> => {
    const supabase = createServerClient();
    const { data: rows, error } = await supabase.rpc('get_leaderboard');

    if (error) throw error;
    if (!rows) return [];

    return rows.map((row) => ({
      rank: Number(row.rank),
      username: row.username,
      level_id: row.level_id,
      finished: row.finished,
      is_guest: row.is_guest,
    }));
  }
);
