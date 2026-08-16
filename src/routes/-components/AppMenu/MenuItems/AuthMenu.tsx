import { useState } from 'react';

import { useGame } from '@/context/GameContext';

import { AuthForm } from '../AuthForm';
import { MenuButton } from './components/MenuButton';

export function AuthMenu() {
  const { send } = useGame();
  const [title, setTitle] = useState('Sign Up');
  return (
    <>
      <p className="mb-3 text-center text-base opacity-80">{title}</p>
      <AuthForm
        onModeChange={(mode) =>
          setTitle(mode === 'signIn' ? 'Sign In' : 'Sign Up')
        }
        initialMode="signUp"
        onSuccess={() => send({ type: 'SIGN_IN' })}
      />
      <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
    </>
  );
}
