import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';

import { MenuButton } from './components/MenuButton';

export function AskGuestOrSignUpMenu() {
  const { send } = useGame();
  const { signUpGuestMutation } = useAuth();

  return (
    <div className="flex flex-col gap-3 max-w-80">
      <p className="mb-3 text-center text-base opacity-80">
        Play as guest or create an account
      </p>
      <MenuButton
        disabled={signUpGuestMutation.isPending}
        onClick={() => send({ type: 'SIGN_UP' })}
      >
        Sign Up
      </MenuButton>
      <MenuButton
        isLoading={signUpGuestMutation.isPending}
        onClick={async () => {
          const guestId = await signUpGuestMutation.mutateAsync();
          if (guestId) send({ type: 'CONTINUE_AS_GUEST' });
        }}
      >
        Continue as Guest
      </MenuButton>
      <MenuButton
        disabled={signUpGuestMutation.isPending}
        onClick={() => send({ type: 'BACK' })}
      >
        Back
      </MenuButton>
    </div>
  );
}
