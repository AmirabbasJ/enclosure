import { z } from 'zod';

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsed = publicEnvSchema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env'
  );
}

export const publicConfig = {
  supabase: {
    url: parsed.data.VITE_SUPABASE_URL,
    anonKey: parsed.data.VITE_SUPABASE_ANON_KEY,
  },
} as const;
