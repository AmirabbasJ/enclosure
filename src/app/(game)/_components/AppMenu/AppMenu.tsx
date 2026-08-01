import { useGame } from '#/context/GameContext';

import Button from '../../../../ui/button';

function MenuContent() {
  const { state, send, context } = useGame();

  if (state.matches('playing') || state.matches('launch')) return null;

  if (state.matches('mainMenu')) {
    return (
      <>
        <Button onClick={() => send({ type: 'PLAY' })}>Play</Button>
        <Button onClick={() => send({ type: 'HELP' })}>Help</Button>
        <Button onClick={() => send({ type: 'PROFILE' })}>
          {context.isSignedIn ? 'Profile' : 'Sign In'}
        </Button>
        <Button onClick={() => send({ type: 'LEADERBOARD' })}>
          Leaderboard
        </Button>
        <Button onClick={() => send({ type: 'SETTINGS' })}>Settings</Button>
      </>
    );
  }

  if (state.matches('tutorial')) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">Tutorial</p>
        <Button onClick={() => send({ type: 'TUTORIAL_COMPLETE' })}>
          Complete Tutorial
        </Button>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches('askSignIn')) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">
          Sign in to save your scores (optional)
        </p>
        <Button onClick={() => send({ type: 'SIGN_IN' })}>Sign In</Button>
        <Button onClick={() => send({ type: 'SKIP_SIGN_IN' })}>Skip</Button>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches('leaderboard')) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">Leaderboard</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches({ help: 'menu' })) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">Help</p>
        <Button onClick={() => send({ type: 'CONTROLS' })}>Controls</Button>
        <Button onClick={() => send({ type: 'RULES' })}>Rules</Button>
        <Button onClick={() => send({ type: 'SCORING' })}>Scoring</Button>
        <Button onClick={() => send({ type: 'FAQ' })}>FAQ</Button>
        <Button onClick={() => send({ type: 'REPLAY_TUTORIAL' })}>
          Replay Tutorial
        </Button>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches({ help: 'controls' })) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">Controls</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches({ help: 'rules' })) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">Rules</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches({ help: 'scoring' })) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">Scoring</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches({ help: 'faq' })) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">FAQ</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches('profile')) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">
          {context.isSignedIn ? 'Profile' : 'Sign In'}
        </p>
        {context.isSignedIn ? (
          <Button onClick={() => send({ type: 'SIGN_OUT' })}>Sign Out</Button>
        ) : (
          <Button onClick={() => send({ type: 'SIGN_IN' })}>Sign In</Button>
        )}
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  if (state.matches('settings')) {
    return (
      <>
        <p className="mb-2 text-center text-sm opacity-80">Settings</p>
        <Button onClick={() => send({ type: 'BACK' })}>Back</Button>
      </>
    );
  }

  return null;
}

export function AppMenu() {
  return (
    <div className="flex min-w-[340px] flex-col gap-2 p-2  ">
      <MenuContent />
    </div>
  );
}
