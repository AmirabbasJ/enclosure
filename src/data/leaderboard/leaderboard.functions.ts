import { createServerFn } from '@tanstack/react-start';

import { genGuestUsername } from '../../domain/user';
import { createServerClient } from '../../lib/supabase/client.server';

export interface LeaderboardEntry {
  rank: number;
  id: string;
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
      rank: row.rank,
      id: row.id,
      username: row.username ?? genGuestUsername(row.id),
      level_id: row.level_id,
      finished: row.finished,
      is_guest: row.is_guest,
    }));
  }
);
