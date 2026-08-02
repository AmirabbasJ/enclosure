import { useMemo } from 'react';

import { supabaseClient } from './client';

export function useSupabase() {
  return useMemo(() => supabaseClient, []);
}
