import type { Session, User } from '@supabase/supabase-js';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';

import type { Database } from '@/database.types';

import {
  mapAuthError,
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from '@/lib/auth';
import { useSupabase } from '@/lib/supabase/useSupabase';

import { signUp as signUpFn } from './auth.functions';

type Profile = Database['public']['Tables']['profiles']['Row'];

const authKeys = {
  session: ['auth', 'session'] as const,
  profile: (userId: string) => ['auth', 'profile', userId] as const,
};

export interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
}

export function useAuth(): AuthValue {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const createUser = useServerFn(signUpFn);

  const sessionQuery = useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: Infinity,
  });

  const session = sessionQuery.data ?? null;
  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: authKeys.profile(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .eq('id', userId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const signIn = async (username: string, password: string) => {
    const normalized = normalizeUsername(username);
    const usernameError = validateUsername(normalized);
    if (usernameError) return usernameError;

    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(normalized),
      password,
    });

    if (error) return mapAuthError(error.message);

    queryClient.setQueryData(authKeys.session, data.session);
    return null;
  };

  const signUpMutation = useMutation({
    mutationFn: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => {
      const createError = await createUser({ data: { username, password } });
      if (createError) return createError;
      return signIn(username, password);
    },
  });

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return error.message;

    queryClient.setQueryData(authKeys.session, null);

    if (userId) {
      queryClient.removeQueries({ queryKey: authKeys.profile(userId) });
    }

    return null;
  };

  return {
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    isLoading:
      sessionQuery.isPending || (Boolean(userId) && profileQuery.isPending),
    isSignedIn: Boolean(session),
    signIn,
    signUp: (username, password) =>
      signUpMutation.mutateAsync({ username, password }),
    signOut,
  };
}
