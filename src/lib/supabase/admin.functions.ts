import { createClient } from '@supabase/supabase-js';
import { createServerOnlyFn } from '@tanstack/react-start';

import type { Database } from '@/database.types';

import { publicConfig } from '@/config/config';
import { serverConfig } from '@/config/serverConfig.server';

export const createAdminClient = createServerOnlyFn(() => {
  const supabaseUrl = publicConfig.supabase.url;
  const { serviceRoleKey } = serverConfig.supabase;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
});
