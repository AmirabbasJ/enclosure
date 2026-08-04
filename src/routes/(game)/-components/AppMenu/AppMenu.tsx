import { useState } from 'react';

import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';
import { LoadingDots } from '@/ui/LoadingDots';

import Button from '../../../../ui/button';
import { Tutorial } from '../Tutorial/Tutorial';
import { AuthForm } from './AuthForm';
import { MenuBoard } from './MenuBoard';
import { TopBar } from './TopBar';

function MenuButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="flex min-w-62.5 items-center justify-center"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function MenuContent() {
  const { state, send } = useGame();
  const { signOut, isSignedIn } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (state.matches('playing') || state.matches('launch')) return null;

  if (state.matches('mainMenu')) {
    return (
      <>
        <MenuButton onClick={() => send({ type: 'PLAY' })}>Play</MenuButton>
        <MenuButton onClick={() => send({ type: 'HELP' })}>Help</MenuButton>
        <MenuButton
          disabled={signingOut}
          onClick={() => {
            if (isSignedIn) {
              setSigningOut(true);
              void signOut()
                .then((error) => {
                  if (!error) send({ type: 'SIGN_OUT' });
                })
                .finally(() => setSigningOut(false));
              return;
            }

            send({ type: 'OPEN_SIGN_IN' });
          }}
        >
          {signingOut ? <LoadingDots /> : isSignedIn ? 'Sign Out' : 'Sign In'}
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'LEADERBOARD' })}>
          Leaderboard
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'SETTINGS' })}>
          Settings
        </MenuButton>
      </>
    );
  }

  if (state.matches('tutorial')) {
    const fromHelp = state.context.tutorialBackTo === 'help';
    return (
      <Tutorial
        onComplete={
          fromHelp ? undefined : () => send({ type: 'TUTORIAL_COMPLETE' })
        }
        onBack={() => send({ type: 'BACK' })}
      />
    );
  }

  if (state.matches('askSignIn')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">
          Sign in to save your scores (optional)
        </p>
        <AuthForm onSuccess={() => send({ type: 'SIGN_IN' })} />
        <MenuButton onClick={() => send({ type: 'SKIP_SIGN_IN' })}>
          Skip
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches('leaderboard')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Leaderboard</p>
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches({ help: 'menu' })) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Help</p>
        <MenuButton onClick={() => send({ type: 'CONTROLS' })}>
          Controls
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'RULES' })}>Rules</MenuButton>
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches({ help: 'controls' })) {
    return (
      <Tutorial
        pagesToInclude={['controls']}
        onBack={() => send({ type: 'BACK' })}
      />
    );
  }

  if (state.matches({ help: 'rules' })) {
    return (
      <Tutorial
        pagesToInclude={['goal', 'meetTower', 'redOpen', 'surround']}
        onBack={() => send({ type: 'BACK' })}
      />
    );
  }

  if (state.matches('signIn')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Sign In</p>
        <AuthForm onSuccess={() => send({ type: 'SIGN_IN' })} />
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches('settings')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Settings</p>
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  return null;
}

export function AppMenu() {
  const { state } = useGame();

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex h-full w-full flex-col items-center justify-center pb-2">
      {state.matches('mainMenu') && <MenuBoard />}

      <div className="relative z-1 flex h-full w-full flex-col items-center justify-center">
        <TopBar />
        <div className="flex h-full flex-col items-center justify-center gap-4">
          {state.matches('mainMenu') && (
            <div className="flex flex-col items-center gap-1">
              <h1 className="title-shadow text-center font-pixel text-[38px] tracking-[3px] text-accent-hover">
                EN<span className="text-danger">CLOSURE</span>
              </h1>
              <p
                className="max-w-75 text-center font-pixel text-[9px] text-text-muted"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                are we being protected, or are we being contained?
              </p>
            </div>
          )}
          <div className="flex max-w-105 flex-col justify-center gap-3 p-3">
            <MenuContent />
          </div>
        </div>
      </div>
    </div>
  );
}
