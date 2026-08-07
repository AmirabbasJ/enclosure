import { useState } from 'react';

import { useAuth } from '@/data/auth/useAuth';
import Button from '@/ui/button';
import TextField from '@/ui/text-field';

interface UpdateProfileFormProps {
  onBack: () => void;
}

export function UpdateProfileForm({ onBack }: UpdateProfileFormProps) {
  const { user, updateUsernameMutation } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);

    try {
      const updateError = await updateUsernameMutation.mutateAsync({
        username,
      });

      if (updateError) {
        setError(updateError);
        return;
      }

      onBack();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update username'
      );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-3 text-center text-base opacity-80">Edit Profile</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col items-center gap-5 pixelated bg-foreground px-4 py-6">
          <div className="flex w-full flex-col gap-2">
            <TextField
              autoComplete="username"
              disabled={updateUsernameMutation.isPending}
              name="username"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            {error ? (
              <p className="text-center text-xs leading-5 text-danger">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            className="flex items-center justify-center"
            isLoading={updateUsernameMutation.isPending}
            type="submit"
          >
            Save
          </Button>
          <Button
            className="flex items-center justify-center"
            disabled={updateUsernameMutation.isPending}
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
