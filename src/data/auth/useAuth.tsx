import type { UseMutationResult } from '@tanstack/react-query';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect } from 'react';

import { useSupabase } from '@/lib/supabase/useSupabase';

import type { User } from '../../domain/User';

import { queryKeys } from '../queryKeys';
import {
  getSessionFn,
  signIn as signInFn,
  signUp as signUpFn,
  signUpGuestFn,
} from './auth.functions';

export interface AuthValue {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (username: string, password: string) => Promise<string | null>;
  signUpGuestMutation: UseMutationResult<string | null, Error, void>;
  signOut: () => Promise<string | null>;
}

export function useAuth(): AuthValue {
  const { user: currentUser } = useRouteContext({ from: '__root__' });
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const createUser = useServerFn(signUpFn);
  const getCurrentUser = useServerFn(getSessionFn);
  const signUpGuest = useServerFn(signUpGuestFn);

  const currentUserQuery = useQuery({
    queryKey: queryKeys.auth.currentUser.queryKey,
    queryFn: () => getCurrentUser().then((d) => d?.user),
    staleTime: Infinity,
    initialData: currentUser ?? null,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.auth.currentUser.queryKey,
      });
    });
    return () => subscription.unsubscribe();
  }, [supabase, queryClient]);

  const user = currentUserQuery.data ?? null;

  const signIn = async (username: string, password: string) => {
    const { error } = await signInFn(username, password);
    if (error) return error;

    await queryClient.invalidateQueries({
      queryKey: queryKeys.auth.currentUser.queryKey,
    });
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

  const signUpGuestMutation = useMutation({
    mutationFn: () => signUpGuest(),
  });

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return error.message;

    queryClient.setQueryData(queryKeys.auth.currentUser.queryKey, null);
    return null;
  };

  return {
    user,
    isLoading: currentUserQuery.isPending,
    isSignedIn: Boolean(user),
    signIn,
    signUpGuestMutation,
    signUp: (username, password) =>
      signUpMutation.mutateAsync({ username, password }),
    signOut,
  };
}
