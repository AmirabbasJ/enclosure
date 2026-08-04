import { useState } from 'react';

import { useAuth } from '@/data/auth/useAuth';
import Button from '@/ui/button';
import TextField from '@/ui/text-field';

interface AuthFormProps {
  onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError(null);

    const message =
      mode === 'signIn'
        ? await signIn(username, password)
        : await signUp(username, password);

    setPending(false);

    if (message) {
      setError(message);
      return;
    }

    onSuccess?.();
  };

  return (
    <form
      className="flex w-full flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col gap-2">
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
        <Button disabled={pending} type="submit">
          {pending ? '...' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
        </Button>
        <Button
          disabled={pending}
          type="button"
          onClick={() => {
            setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
            setError(null);
          }}
        >
          {mode === 'signIn' ? 'Need an account?' : 'Have an account?'}
        </Button>
      </div>
    </form>
  );
}
