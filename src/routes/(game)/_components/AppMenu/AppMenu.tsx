import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';
import { Avatar } from '@/ui/avatar';

import { useGameAudio } from '../../../../context/GameAudioContext';
import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '../../../../lib/icons';
import Button from '../../../../ui/button';
import { Tutorial } from '../Tutorial/Tutorial';
import { AuthForm } from './AuthForm';

function MenuButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button className="min-w-[250px]" onClick={onClick}>
      {children}
    </Button>
  );
}

function MenuContent() {
  const { state, send } = useGame();

  const { user, signOut, isSignedIn } = useAuth();

  if (state.matches('playing') || state.matches('launch')) return null;

  if (state.matches('mainMenu')) {
    return (
      <>
        <MenuButton onClick={() => send({ type: 'PLAY' })}>Play</MenuButton>
        <MenuButton onClick={() => send({ type: 'HELP' })}>Help</MenuButton>
        <MenuButton onClick={() => send({ type: 'PROFILE' })}>
          {isSignedIn ? 'Profile' : 'Sign In'}
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
        <MenuButton onClick={() => send({ type: 'TUTORIAL' })}>
          Rules
        </MenuButton>
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

  if (state.matches('profile')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">
          {isSignedIn ? 'Profile' : 'Sign In'}
        </p>
        {isSignedIn ? (
          <>
            {user?.username ? (
              <p className="mb-3 text-center text-sm text-accent">
                {user.username}
              </p>
            ) : null}
            <MenuButton
              onClick={() => {
                void signOut().then(() => send({ type: 'SIGN_OUT' }));
              }}
            >
              Sign Out
            </MenuButton>
          </>
        ) : (
          <AuthForm onSuccess={() => send({ type: 'SIGN_IN' })} />
        )}
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
  const { user } = useAuth();
  const { state } = useGame();
  const { toggleMusic, musicAudioState, toggleHit, hitAudioState } =
    useGameAudio();

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex w-full flex-col h-full items-center justify-center p-4 ">
      {user ? (
        <div className="py-2 px-4 flex items-center justify-between w-full ">
          <div className="flex items-center gap-2">
            <Avatar size={75} seed={user.username} />
            <p>{user.username} </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleMusic}
              className="p-2 flex justify-center items-center"
            >
              {musicAudioState.isOn ? (
                <IconMusic width={25} height={25} />
              ) : (
                <IconMusicOff width={25} height={25} />
              )}
            </Button>

            <Button
              onClick={toggleHit}
              className="p-2 flex justify-center items-center"
            >
              {hitAudioState.isOn ? (
                <IconSoundMedium width={25} height={25} />
              ) : (
                <IconSoundOff width={25} height={25} />
              )}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="h-full flex justify-center flex-col items-center gap-4">
        {state.matches('mainMenu') && (
          <div className="flex flex-col items-center gap-1">
            <h1 className="title-shadow text-center font-pixel text-[26px] tracking-[3px] text-accent-hover">
              EN<span className="text-danger">CLOSURE</span>
            </h1>
            <p
              className=" text-center font-pixel text-[9px] max-w-[300px] text-text-muted "
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              are we being protected, or are we being contained?
            </p>
          </div>
        )}
        <div className="flex  max-w-[420px] flex-col justify-center gap-3 p-3">
          <MenuContent />
        </div>
      </div>
    </div>
  );
}
