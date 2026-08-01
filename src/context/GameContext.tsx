import type { PropsWithChildren } from 'react';
import type { SnapshotFrom } from 'xstate';

import { useMachine } from '@xstate/react';
import { createContext, use, useMemo } from 'react';

import type { GameEvent, GameMachineContext } from '#/machines/gameMachine';

import { gameMachine } from '#/machines/gameMachine';

interface GameContextValue {
  /** True while the player is in an active game session. */
  isPlaying: boolean;
  state: SnapshotFrom<typeof gameMachine>;
  context: GameMachineContext;
  send: (event: GameEvent) => void;
  start: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);
GameContext.displayName = 'GameContext';

export function GameProvider({ children }: PropsWithChildren) {
  const [state, send] = useMachine(gameMachine);

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
