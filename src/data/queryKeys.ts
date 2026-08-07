import { createQueryKeyStore } from '@lukemorales/query-key-factory';

export const queryKeys = createQueryKeyStore({
  user: {
    me: null,
    metadata: null,
    progress: null,
  },
});
