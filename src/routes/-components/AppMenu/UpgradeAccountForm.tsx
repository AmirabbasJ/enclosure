import { useState } from 'react';

import { validateCredentials } from '@/data/auth/auth.functions';
import { useAuth } from '@/data/auth/useAuth';
import Button from '@/ui/button';
import TextField from '@/ui/text-field';

interface UpgradeAccountFormProps {
  onBack: () => void;
}

export function UpgradeAccountForm({ onBack }: UpgradeAccountFormProps) {
  const { upgradeAccountMutation } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = upgradeAccountMutation.isPending;

  const submit = async () => {
    setError(null);

    const parsed = validateCredentials(username, password);

    if (!parsed.data) {
      setError(parsed.error);
      return;
    }

    try {
      await upgradeAccountMutation.mutateAsync(parsed.data);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="flex flex-col  gap-2">
      <div className="flex flex-col  gap-2">
        <p className="text-center text-base opacity-80">Upgrade Account</p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col items-center gap-5  pixelated bg-foreground px-4 py-6">
          <div className="flex w-full flex-col gap-6">
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
                autoComplete="new-password"
                disabled={pending}
                name="password"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error ? (
                <p className="text-center text-xs leading-5 text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
          <p className="max-w-75 text-left font-pixel text-[9px] text-text-light">
            Upgrade your account to save your progress on cloud storage.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            className="flex items-center justify-center"
            isLoading={pending}
            type="submit"
          >
            Create Account
          </Button>
          <Button
            className="flex items-center justify-center"
            disabled={pending}
            type="button"
            onClick={onBack}
          >
            Back
          </Button>
        </div>
      </form>
    </div>
  );
}
