import { createQueryKeyStore } from '@lukemorales/query-key-factory';

import { getSessionFn } from './auth/auth.functions';
import { getLeaderboardFn } from './leaderboard/leaderboard.functions';
import { getLevelFn } from './levels/level.functions';
import { getMetadataCookieFn } from './metadata/metadata.functions';
import { getProgressFn } from './progress/progrsss.functions';

export const queryKeys = createQueryKeyStore({
  user: {
    me: {
      queryKey: null,
      queryFn: () => getSessionFn().then((d) => d?.user ?? null),
    },
    metadata: {
      queryKey: null,
      queryFn: async () => {
        const cookieMetadata = await getMetadataCookieFn();
        if (cookieMetadata) return cookieMetadata;
        return getSessionFn().then((d) => d?.metadata ?? null);
      },
    },
    progress: {
      queryKey: null,
      queryFn: () => getProgressFn(),
    },
    level: (levelId?: number | null) => ({
      queryKey:
        levelId == null ? (['level'] as const) : (['level', levelId] as const),
      queryFn: () =>
        getLevelFn({
          data: levelId == null ? {} : { levelId },
        }),
    }),
  },
  leaderboard: {
    list: {
      queryKey: null,
      queryFn: () => getLeaderboardFn(),
    },
  },
});
