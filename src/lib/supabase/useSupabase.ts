import { useMemo } from 'react';

import { supabaseBrowserClient } from './client';

export function useSupabase() {
  return useMemo(() => supabaseBrowserClient, []);
}
