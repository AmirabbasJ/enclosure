import { useGame } from '@/context/GameContext';

import { AuthForm } from '../AuthForm';
import { MenuButton } from './components/MenuButton';

export function SignUpMenu() {
  const { send } = useGame();

  return (
    <>
      <p className="mb-3 text-center text-base opacity-80">Sign Up</p>
      <AuthForm
        initialMode="signUp"
        onSuccess={() => send({ type: 'SIGN_IN' })}
      />
      <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
    </>
  );
}
