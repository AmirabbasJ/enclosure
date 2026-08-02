import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';

import type { Database } from '@/database.types';

import { useSupabase } from '@/lib/supabase/useSupabase';

import {
  getCurrentUser as getCurrentUserFn,
  signIn as signInFn,
  signUp as signUpFn,
} from './auth.functions';

type Profile = Database['public']['Tables']['profiles']['Row'];

const authKeys = {
  currentUser: ['auth', 'currentUser'] as const,
};

export interface AuthValue {
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
  const getCurrentUser = useServerFn(getCurrentUserFn);

  const currentUserQuery = useQuery({
    queryKey: authKeys.currentUser,
    queryFn: () => getCurrentUser(),
    staleTime: Infinity,
  });

  const profile = currentUserQuery.data?.profile ?? null;

  const signIn = async (username: string, password: string) => {
    const { error, session: nextSession } = await signInFn(
      username,
      password,
      supabase
    );

    if (error) return error;

    queryClient.setQueryData(authKeys.currentUser, {
      session: nextSession,
      profile: null,
    });
    await queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
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

    queryClient.setQueryData(authKeys.currentUser, {
      session: null,
      profile: null,
    });

    return null;
  };

  return {
    profile,
    isLoading: currentUserQuery.isPending,
    isSignedIn: Boolean(profile),
    signIn,
    signUp: (username, password) =>
      signUpMutation.mutateAsync({ username, password }),
    signOut,
  };
}
