import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';
import { Avatar } from '@/ui/avatar';
import Button from '@/ui/button';

import { useGameAudio } from '../../../../context/GameAudioContext';
import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '../../../../lib/icons';
import { Tutorial } from '../Tutorial/Tutorial';
import { AuthForm } from './AuthForm';

function MenuContent() {
  const { state, send } = useGame();

  const { user, signOut, isSignedIn } = useAuth();

  if (state.matches('playing') || state.matches('launch')) return null;

  if (state.matches('mainMenu')) {
    return (
      <>
        <Button onClick={() => send({ type: 'PLAY' })}>Play</Button>
        <Button onClick={() => send({ type: 'HELP' })}>Help</Button>
        <Button onClick={() => send({ type: 'PROFILE' })}>
          {isSignedIn ? 'Profile' : 'Sign In'}
        </Button>
        <Button onClick={() => send({ type: 'LEADERBOARD' })}>
          Leaderboard
        </Button>
        <Button onClick={() => send({ type: 'SETTINGS' })}>Settings</Button>
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
        <Button onClick={() => send({ type: 'SKIP_SIGN_IN' })}>Skip</Button>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches('leaderboard')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Leaderboard</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches({ help: 'menu' })) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Help</p>
        <Button onClick={() => send({ type: 'CONTROLS' })}>Controls</Button>
        <Button onClick={() => send({ type: 'TUTORIAL' })}>Rules</Button>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
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
            <Button
              onClick={() => {
                void signOut().then(() => send({ type: 'SIGN_OUT' }));
              }}
            >
              Sign Out
            </Button>
          </>
        ) : (
          <AuthForm onSuccess={() => send({ type: 'SIGN_IN' })} />
        )}
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches('settings')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Settings</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  return null;
}

export function AppMenu() {
  const { user } = useAuth();
  const { toggleMusic, musicAudioState, toggleHit, hitAudioState } =
    useGameAudio();
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex w-full flex-col h-full items-center justify-center p-4 ">
      {user ? (
        <div className="py-2 px-4 flex items-center justify-between w-full absolute top-0 left-0">
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
      <div className="flex min-w-[420px] flex-col gap-3 p-3">
        <MenuContent />
      </div>
    </div>
  );
}
