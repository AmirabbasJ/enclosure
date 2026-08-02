import { publicConfig as config } from './config';

export const serverConfig = {
  ...config,
  supabase: {
    ...config.supabase,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};
