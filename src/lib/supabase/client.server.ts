import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import {
  getCookies,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server';

import type { Database } from '../../database.types';

import { serverConfig } from '../../config/serverConfig.server';

export function createServerClient() {
  return createSupabaseServerClient<Database>(
    serverConfig.supabase.url,
    serverConfig.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookies, headers) {
          cookies.forEach(({ name, value, options }) => {
            setCookie(name, value, options);
          });

          Object.entries(headers).forEach(([name, value]) => {
            setResponseHeader(name, value);
          });
        },
      },
    }
  );
}
