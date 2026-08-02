import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import type { Database } from '@/database.types';

import { createAdminClient } from '@/lib/supabase/admin.functions';
import { supabaseClient } from '@/lib/supabase/client';

const AUTH_EMAIL_DOMAIN = 'users.enclosure.local';

const USERNAME_PATTERN = /^[0-9_a-z]{3,24}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);

  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username: 3–24 chars, a–z, 0–9, underscore';
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }

  return null;
}

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Wrong username or password';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered')
  ) {
    return 'Username is already taken';
  }

  return message;
}

type Client = SupabaseClient<Database>;

export async function signIn(
  username: string,
  password: string,
  client: Client = supabaseClient
): Promise<{ error: string | null; session: Session | null }> {
  const normalized = normalizeUsername(username);
  const usernameError = validateUsername(normalized);
  if (usernameError) return { error: usernameError, session: null };

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError, session: null };

  const { data, error } = await client.auth.signInWithPassword({
    email: usernameToEmail(normalized),
    password,
  });

  if (error) return { error: mapAuthError(error.message), session: null };

  return { error: null, session: data.session };
}

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
