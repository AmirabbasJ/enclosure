import type { Session } from '@supabase/supabase-js';
import type { UseMutationResult } from '@tanstack/react-query';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect } from 'react';

import { useSupabase } from '@/lib/supabase/useSupabase';

import type { User } from '../../domain/User';

import { queryKeys } from '../queryKeys';
import {
  deleteAccountFn,
  getSessionFn,
  signIn,
  signUp as signUpFn,
  signUpGuestFn,
  upgradeAccountFn,
} from './auth.functions';

export interface AuthValue {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  upgradeAccountMutation: UseMutationResult<
    null,
    Error,
    {
      username: string;
      password: string;
    }
  >;
  signInMutation: UseMutationResult<
    Session | null,
    Error,
    {
      username: string;
      password: string;
    }
  >;
  signUpMutation: UseMutationResult<
    string | Session | null,
    Error,
    {
      username: string;
      password: string;
    }
  >;
  signUpGuestMutation: UseMutationResult<string | null, Error, void>;
  deleteAccountMutation: UseMutationResult<string | null, Error, void>;
  signOutMutation: UseMutationResult<string | null, Error, void>;
}

export function useAuth(): AuthValue {
  const { user: currentUser } = useRouteContext({ from: '__root__' });
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const createUser = useServerFn(signUpFn);
  const getCurrentUser = useServerFn(getSessionFn);
  const signUpGuest = useServerFn(signUpGuestFn);
  const deleteAccount = useServerFn(deleteAccountFn);
  const upgradeAccount = useServerFn(upgradeAccountFn);

  const currentUserQuery = useQuery({
    queryKey: queryKeys.user.me.queryKey,
    queryFn: () => {
      return getCurrentUser().then((d) => d?.user ?? null);
    },
    staleTime: Infinity,
    initialData: currentUser ?? null,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.me.queryKey,
      });
    });
    return () => subscription.unsubscribe();
  }, [supabase, queryClient]);

  const user = currentUserQuery.data ?? null;

  const signInMutation = useMutation({
    mutationFn: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => {
      return signIn(username, password);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user._def,
      });
    },
  });

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
    const { error } = await supabase.auth.signOut();

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
    mutationFn: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => {
      return upgradeAccount({ data: { username, password } });
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
  };
}
