import { createQueryKeyStore } from '@lukemorales/query-key-factory';

export const queryKeys = createQueryKeyStore({
  user: {
    me: null,
    metadata: null,
    progress: null,
    level: (levelId?: number | null) =>
      levelId == null ? (['level'] as const) : ['level', levelId],
  },
  leaderboard: {
    list: null,
  },
});
