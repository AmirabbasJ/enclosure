import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  mapAuthError,
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin.functions';

/** Server-only: creates user via service role. Does not establish a browser session. */
export const signUp = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      username: z.string().min(3).max(24),
      password: z.string().min(6),
    })
  )
  .handler(async ({ data: { username, password } }): Promise<string | null> => {
    const normalized = normalizeUsername(username);
    const usernameError = validateUsername(normalized);
    if (usernameError) return usernameError;

    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;

    const admin = createAdminClient();

    const { data: available, error: availabilityError } = await admin.rpc(
      'is_username_available',
      { desired: normalized }
    );

    if (availabilityError) return availabilityError.message;
    if (!available) return 'Username is already taken';

    const { error } = await admin.auth.admin.createUser({
      email: usernameToEmail(normalized),
      password,
      email_confirm: true,
      user_metadata: { username: normalized },
    });

    if (error) return mapAuthError(error.message);
    return null;
  });
