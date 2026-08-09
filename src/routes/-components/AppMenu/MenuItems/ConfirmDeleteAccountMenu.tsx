import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';

import { MenuButton } from './components/MenuButton';

export function ConfirmDeleteAccountMenu() {
  const { send } = useGame();
  const { deleteAccountMutation } = useAuth();

  return (
    <>
      <p className="mb-3 text-center text-base opacity-80">Delete Account</p>
      <div className="flex flex-col gap-3 pixelated bg-foreground px-4 py-6">
        <p className="max-w-75 text-center font-pixel text-xs text-text-light">
          This permanently deletes your account and progress. Cannot undo.
        </p>
      </div>
      <MenuButton
        variant="danger"
        isLoading={deleteAccountMutation.isPending}
        onClick={async () => {
          const error = await deleteAccountMutation.mutateAsync();
          if (!error) send({ type: 'SIGN_OUT' });
        }}
      >
        Confirm Delete
      </MenuButton>
      <MenuButton
        disabled={deleteAccountMutation.isPending}
        onClick={() => send({ type: 'BACK' })}
      >
        Cancel
      </MenuButton>
    </>
  );
}
