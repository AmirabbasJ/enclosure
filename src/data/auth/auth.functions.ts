import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import type { Database } from '@/database.types';

import { createAdminClient } from '@/lib/supabase/admin.functions';
import { supabaseBrowserClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/client.server';

import type { User } from '../../domain/User';

import {
  defaultMetadata,
  getMetadataCookieFn,
} from '../metadata/metadata.functions';

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

export interface UserSession {
  user: User;
  metadata: {
    hasViewedTutorial: boolean;
  };
}

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UserSession | null> => {
    const supabase = createServerClient();

    const { data, error } = await supabase.auth.getUser();

    if (error) return null;

    const { user: sessionUser } = data;

    const { data: user, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, created_at, has_viewed_tutorial')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!user) return null;

    const isGuest = sessionUser.is_anonymous;

    // FIXME extract
    const username = isGuest
      ? `Guest-${sessionUser.id.split('-').at(0)!}`
      : user.username!;
    return {
      user: {
        id: user.id,
        username,
        type: isGuest ? 'guest' : 'auth',
      },
      metadata: {
        hasViewedTutorial: user.has_viewed_tutorial ?? false,
      },
    };
  }
);

export const signIn = async (
  username: string,
  password: string
): Promise<Session | null> => {
  const parsed = parseCredentials(username, password);

  if (!parsed.data) {
    throw new Error(parsed.error);
  }

  const { username: normalized, password: validPassword } = parsed.data;

  const { data, error } = await supabaseBrowserClient.auth.signInWithPassword({
    email: usernameToEmail(normalized),
    password: validPassword,
  });

  if (error) throw new Error(mapAuthError(error.message));

  return data.session;
};

export const signUpGuestFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<string | null> => {
    const client = createServerClient();
    const { error, data } = await client.auth.signInAnonymously();
    if (error) return error.message;

    return data.user?.id ?? null;
  }
);

export const signUp = createServerFn({ method: 'POST' })
  .validator(credentialsSchema)
  .handler(async ({ data: { username, password } }): Promise<string | null> => {
    const admin = createAdminClient();

    const { data: available, error: availabilityError } = await admin.rpc(
      'is_username_available',
      { desired: username }
    );

    const metadata = (await getMetadataCookieFn()) ?? defaultMetadata;

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

export const deleteAccountFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<string | null> => {
    const client = createServerClient();
    const adminClient = createAdminClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) return 'no user is signed in';

    const { error } = await client.auth.signOut();

    if (error) return error.message;

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) return deleteError.message;

    return null;
  }
);

export const upgradeAccountFn = createServerFn({ method: 'POST' })
  .validator(credentialsSchema)
  .handler(async ({ data: { username, password } }) => {
    const client = createServerClient();

    const d = await client.auth.updateUser({
      email: usernameToEmail(username),
      password,
      data: {
        username,
      },
    });

    return null;
  });
