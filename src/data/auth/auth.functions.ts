import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import type { Database } from '@/database.types';

import { createAdminClient } from '@/lib/supabase/admin.functions';
import { supabaseBrowserClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/client.server';

import type { User } from '../../domain/User';

import { getMetadataFn } from '../metadata/metadata.functions';

const AUTH_EMAIL_DOMAIN = 'users.enclosure.local';

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[0-9_a-z]{3,24}$/, 'Username: 3–24 chars, a–z, 0–9, underscore');

const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

const credentialsSchema = z.object({
  password: passwordSchema,
  username: usernameSchema,
});

function usernameToEmail(username: string): string {
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}

function mapAuthError(message: string): string {
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

function parseCredentials(username: string, password: string) {
  const result = credentialsSchema.safeParse({ username, password });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? 'Invalid credentials',
      data: null,
    };
  }

  return { error: null, data: result.data };
}

type Client = SupabaseClient<Database>;

export interface CurrentUser {
  user: User | null;
  metadata: {
    hasViewedTutorial: boolean;
  };
}

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUser> => {
    const supabase = createServerClient();

    const { data, error } = await supabase.auth.getUser();

    if (error) return { user: null, metadata: { hasViewedTutorial: false } };

    const { user: sessionUser } = data;

    const { data: user, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, created_at, viewed_tutorial')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!user) return { user: null, metadata: { hasViewedTutorial: false } };

    return {
      user: {
        id: user.id,
        username: user.username,
      },
      metadata: {
        hasViewedTutorial: user.viewed_tutorial ?? false,
      },
    };
  }
);

export async function signIn(
  username: string,
  password: string,
  client: Client = supabaseBrowserClient
): Promise<{ error: string | null; session: Session | null }> {
  const parsed = parseCredentials(username, password);

  if (!parsed.data) {
    return { error: parsed.error, session: null };
  }

  const { username: normalized, password: validPassword } = parsed.data;

  const { data, error } = await client.auth.signInWithPassword({
    email: usernameToEmail(normalized),
    password: validPassword,
  });

  if (error) return { error: mapAuthError(error.message), session: null };

  return { error: null, session: data.session };
}

export const signUp = createServerFn({ method: 'POST' })
  .validator(credentialsSchema)
  .handler(async ({ data: { username, password } }): Promise<string | null> => {
    const admin = createAdminClient();

    const { data: available, error: availabilityError } = await admin.rpc(
      'is_username_available',
      { desired: username }
    );

    const metadata = await getMetadataFn();

    if (availabilityError) return availabilityError.message;
    if (!available) return 'Username is already taken';

    const { error } = await admin.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: {
        username,
        hasViewedTutorial: metadata.hasViewedTutorial,
      },
    });

    if (error) return mapAuthError(error.message);
    return null;
  });
