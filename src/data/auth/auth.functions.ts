import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin.functions';
import { supabaseBrowserClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/client.server';

import type { User } from '../../domain/user';

import { genGuestUsername } from '../../domain/user';
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

export interface Credentials {
  username: string;
  password: string;
}

export function validateCredentials(
  username: string,
  password: string
): { error: null; data: Credentials } | { error: string; data: null } {
  const result = credentialsSchema.safeParse({ username, password });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? 'Invalid credentials',
      data: null,
    };
  }

  return { error: null, data: result.data };
}

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

    const username = isGuest
      ? genGuestUsername(sessionUser.id)
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

const emailToUsername = (email: string): string => {
  return email.split('@')[0];
};

export const signIn = async ({
  username,
  password,
}: Credentials): Promise<User | null> => {
  const parsed = validateCredentials(username, password);

  if (!parsed.data) {
    throw new Error(parsed.error);
  }

  const { username: normalized, password: validPassword } = parsed.data;

  const { data, error } = await supabaseBrowserClient.auth.signInWithPassword({
    email: usernameToEmail(normalized),
    password: validPassword,
  });

  if (error) throw new Error(mapAuthError(error.message));

  return {
    id: data.user.id,
    username: data.user.user_metadata.username as string,
    type: 'auth',
  };
};

export const signUpGuestFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<string | null> => {
    const client = createServerClient();
    const { error, data } = await client.auth.signInAnonymously();
    if (error) throw new Error(error.message);

    return data.user?.id ?? null;
  }
);

export const signUp = createServerFn({ method: 'POST' })
  .validator(credentialsSchema)
  .handler(async ({ data: { username, password } }): Promise<User> => {
    const admin = createAdminClient();

    const { data: available, error: availabilityError } = await admin.rpc(
      'is_username_available',
      { desired: username }
    );

    const metadata = (await getMetadataCookieFn()) ?? defaultMetadata;

    if (availabilityError) throw new Error(availabilityError.message);
    if (!available) throw new Error('Username is already taken');

    const { error, data } = await admin.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: {
        username,
        hasViewedTutorial: metadata.hasViewedTutorial,
      },
    });

    if (error) throw new Error(mapAuthError(error.message));

    return {
      id: data.user.id,
      username: data.user.user_metadata.username as string,
      type: 'auth',
    };
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
  .handler(
    async ({
      data: { username, password },
    }: {
      data: Credentials;
    }): Promise<string | null> => {
      const client = createServerClient();

      const { error } = await client.auth.updateUser({
        email: usernameToEmail(username),
        password,
        data: {
          username,
        },
      });

      if (error) return mapAuthError(error.message);
      return null;
    }
  );

export const updateUsernameFn = createServerFn({ method: 'POST' })
  .validator(z.object({ username: usernameSchema }))
  .handler(async ({ data: { username } }): Promise<string | null> => {
    const client = createServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) return 'Not signed in';
    if (user.is_anonymous) return 'Guest accounts cannot edit profile';

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) return profileError.message;
    if (!profile) return 'Profile not found';
    if (profile.username === username) return null;

    const admin = createAdminClient();
    const { data: available, error: availabilityError } = await admin.rpc(
      'is_username_available',
      { desired: username }
    );

    if (availabilityError) return availabilityError.message;
    if (!available) return 'Username is already taken';

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email: usernameToEmail(username),
      user_metadata: {
        username,
      },
    });

    if (error) return mapAuthError(error.message);
    return null;
  });
