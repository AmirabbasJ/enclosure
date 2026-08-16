import { useState } from 'react';

import { validateCredentials } from '@/data/auth/auth.functions';
import { useAuth } from '@/data/auth/useAuth';
import Button from '@/ui/button';
import TextField from '@/ui/text-field';

interface AuthFormProps {
  initialMode?: 'signIn' | 'signUp';
  onModeChange?: (mode: 'signIn' | 'signUp') => void;
  onSuccess?: () => void;
}

export function AuthForm({
  initialMode = 'signIn',
  onModeChange,
  onSuccess,
}: AuthFormProps) {
  const { signInMutation, signUpMutation } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = signInMutation.isPending || signUpMutation.isPending;

  const toggleMode = () => {
    setMode((current) => {
      const newMode = current === 'signIn' ? 'signUp' : 'signIn';
      onModeChange?.(newMode);
      return newMode;
    });
    setError(null);
  };

  const submit = async () => {
    setError(null);

    const parsed = validateCredentials(username, password);

    if (!parsed.data) {
      setError(parsed.error);
      return;
    }

    try {
      if (mode === 'signIn') {
        await signInMutation.mutateAsync(parsed.data);
      } else {
        await signUpMutation.mutateAsync(parsed.data);
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <form
      className="flex w-full flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col gap-2 pixelated bg-foreground px-4 py-6">
        <TextField
          autoComplete="username"
          disabled={pending}
          name="username"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <TextField
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          disabled={pending}
          name="password"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="text-center text-xs leading-5 text-danger">{error}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <Button
          className="flex items-center justify-center"
          isLoading={pending}
          type="submit"
        >
          {mode === 'signIn' ? 'Sign In' : 'Create Account'}
        </Button>
        <Button disabled={pending} type="button" onClick={toggleMode}>
          {mode === 'signIn' ? 'Need an account?' : 'Have an account?'}
        </Button>
      </div>
    </form>
  );
}
