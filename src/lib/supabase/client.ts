import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/database.types';

import { publicConfig } from '@/config/config';

export const supabaseBrowserClient = createBrowserClient<Database>(
  publicConfig.supabase.url,
  publicConfig.supabase.anonKey
);
