import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';

import { publicConfig } from '@/config/config';

export const supabaseClient = createClient<Database>(
  publicConfig.supabase.url,
  publicConfig.supabase.anonKey
);
