import { createQueryKeyStore } from '@lukemorales/query-key-factory';

export const queryKeys = createQueryKeyStore({
  auth: {
    currentUser: null,
  },
  metadata: {
    current: null,
  },
  progress: {
    current: null,
  },
});
