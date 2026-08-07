import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect } from 'react';

import { useSupabase } from '@/lib/supabase/useSupabase';

import type { Credentials } from './auth.functions';

import { queryKeys } from '../queryKeys';
import {
  deleteAccountFn,
  getSessionFn,
  signIn,
  signUp as signUpFn,
  signUpGuestFn,
  updateUsernameFn,
  upgradeAccountFn,
} from './auth.functions';

export function useAuth() {
  const { user: currentUser } = useRouteContext({ from: '__root__' });
  const supabaseClient = useSupabase();
  const queryClient = useQueryClient();

  const createUser = useServerFn(signUpFn);
  const getCurrentUser = useServerFn(getSessionFn);
  const signUpGuest = useServerFn(signUpGuestFn);
  const deleteAccount = useServerFn(deleteAccountFn);
  const upgradeAccount = useServerFn(upgradeAccountFn);
  const updateUsername = useServerFn(updateUsernameFn);

  const currentUserQuery = useQuery({
    queryKey: queryKeys.user.me.queryKey,
    queryFn: () => getCurrentUser().then((d) => d?.user ?? null),
    staleTime: Infinity,
    initialData: currentUser ?? null,
  });

  const user = currentUserQuery.data ?? null;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.me.queryKey,
      });
    });
    return () => subscription.unsubscribe();
  }, [supabaseClient, queryClient]);

  const signInMutation = useMutation({
    mutationFn: async ({ username, password }: Credentials) => {
      return signIn({ username, password });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ username, password }: Credentials) => {
      const createError = await createUser({ data: { username, password } });
      if (createError) return createError;
      return signInMutation.mutateAsync({ username, password });
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

  const signUpGuestMutation = useMutation({
    mutationFn: () => {
      return signUpGuest();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

  const signOut = async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) return error.message;

    queryClient.setQueryData(queryKeys.user.me.queryKey, null);
    return null;
  };

  const signOutMutation = useMutation({
    mutationFn: () => {
      return signOut();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => {
      return deleteAccount();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

  const upgradeAccountMutation = useMutation({
    mutationFn: async ({ username, password }: Credentials) => {
      return upgradeAccount({ data: { username, password } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

  const updateUsernameMutation = useMutation({
    mutationFn: async ({ username }: { username: string }) => {
      return updateUsername({ data: { username } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

  return {
    user,
    deleteAccountMutation,
    isLoading: currentUserQuery.isLoading,
    isSignedIn: Boolean(user),
    signInMutation,
    signUpGuestMutation,
    signUpMutation,
    signOutMutation,
    upgradeAccountMutation,
    updateUsernameMutation,
  };
}
