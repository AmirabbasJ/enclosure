import type { Session, User } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';

import { createContext, use, useEffect, useMemo, useState } from 'react';

import {
  mapAuthError,
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from '#/lib/auth';
import { supabase } from '#/lib/supabase';

export interface Profile {
  id: string;
  username: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
AuthContext.displayName = 'AuthContext';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load profile', error);
    return null;
  }

  return data;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId) {
      setProfile(null);
      return;
    }

    let active = true;
    void fetchProfile(userId).then((nextProfile) => {
      if (active) setProfile(nextProfile);
    });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(() => {
    const signIn = async (username: string, password: string) => {
      const usernameError = validateUsername(username);
      if (usernameError) return usernameError;
      const passwordError = validatePassword(password);
      if (passwordError) return passwordError;

      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });

      if (error) return mapAuthError(error.message);
      return null;
    };

    const signUp = async (username: string, password: string) => {
      const normalized = normalizeUsername(username);
      const usernameError = validateUsername(normalized);
      if (usernameError) return usernameError;
      const passwordError = validatePassword(password);
      if (passwordError) return passwordError;

      const { data: available, error: availabilityError } = await supabase.rpc(
        'is_username_available',
        { desired: normalized }
      );

      if (availabilityError) return availabilityError.message;
      if (!available) return 'Username is already taken';

      const { data, error } = await supabase.auth.signUp({
        email: usernameToEmail(normalized),
        password,
        options: {
          data: { username: normalized },
        },
      });

      if (error) return mapAuthError(error.message);
      if (!data.session) {
        return 'Could not sign in after creating account. Try signing in.';
      }

      return null;
    };

    const signOut = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) return error.message;
      return null;
    };

    return {
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isSignedIn: Boolean(session),
      signIn,
      signUp,
      signOut,
    };
  }, [session, profile, isLoading]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
