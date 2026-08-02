import type { PropsWithChildren } from 'react';
import type { SnapshotFrom } from 'xstate';

import { useMachine } from '@xstate/react';
import { createContext, use, useEffect, useMemo } from 'react';

import type { GameEvent, GameMachineContext } from '#/machines/gameMachine';

import { useAuth } from '@/data/auth/useAuth';
import { gameMachine } from '#/machines/gameMachine';

interface GameContextValue {
  isPlaying: boolean;
  state: SnapshotFrom<typeof gameMachine>;
  context: GameMachineContext;
  send: (event: GameEvent) => void;
  start: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);
GameContext.displayName = 'GameContext';

export function GameProvider({ children }: PropsWithChildren) {
  const { isSignedIn, isLoading } = useAuth();
  const [state, send] = useMachine(gameMachine);

  useEffect(() => {
    if (isLoading) return;
    if (isSignedIn && !state.context.isSignedIn) {
      send({ type: 'SIGN_IN' });
    } else if (!isSignedIn && state.context.isSignedIn) {
      send({ type: 'SIGN_OUT' });
    }
  }, [isSignedIn, isLoading, send, state.context.isSignedIn]);

  const value = useMemo<GameContextValue>(
    () => ({
      isPlaying: state.matches('playing'),
      state,
      context: state.context,
      send,
      start: () => send({ type: 'PLAY' }),
    }),
    [state, send]
  );

  return <GameContext value={value}>{children}</GameContext>;
}

export function useGame() {
  const ctx = use(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
