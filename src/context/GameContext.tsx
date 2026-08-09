import type { PropsWithChildren } from 'react';
import type { SnapshotFrom } from 'xstate';

import { useMachine } from '@xstate/react';
import { createContext, use, useEffect, useMemo } from 'react';

import type { GameEvent, GameMachineContext } from '#/lib/machines/gameMachine';

import { useAuth } from '@/data/auth/useAuth';
import { gameMachine } from '#/lib/machines/gameMachine';

import { useMetadata } from '../data/metadata/useMetadata';
import { useProgress } from '../data/progress/useProgress';

interface GameContextValue {
  state: SnapshotFrom<typeof gameMachine>;
  context: GameMachineContext;
  send: (event: GameEvent) => void;
  isGameSceneActive: boolean;
  isShowingSolution: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);
GameContext.displayName = 'GameContext';

export function GameProvider({ children }: PropsWithChildren) {
  const { isSignedIn } = useAuth();
  const { metadata, setMetadataMutation } = useMetadata();
  const { progress } = useProgress();

  const [state, send, actor] = useMachine(gameMachine, {
    input: {
      isSignedIn,
      metadata: metadata ?? undefined,
      finished: progress?.finished,
    },
  });

  actor.on('TUTORIAL_COMPLETE', () => {
    setMetadataMutation.mutate({ hasViewedTutorial: true });
  });

  useEffect(() => {
    if (isSignedIn && !state.context.isSignedIn) {
      send({ type: 'SIGN_IN' });
    } else if (!isSignedIn && state.context.isSignedIn) {
      send({ type: 'SIGN_OUT' });
    }
  }, [isSignedIn, send, state.context.isSignedIn]);

  useEffect(() => {
    if (
      progress?.finished != null &&
      progress.finished !== state.context.finished
    ) {
      send({ type: 'PROGRESS_UPDATED', finished: progress.finished });
    }
  }, [progress?.finished, send, state.context.finished]);

  const isShowingSolution =
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');

  const isGameSceneActive =
    state.matches('paused') || state.matches('playing') || isShowingSolution;

  const value = useMemo<GameContextValue>(
    () => ({
      isGameSceneActive,
      isShowingSolution,
      state,
      context: state.context,
      send,
    }),
    [state, send, isGameSceneActive, isShowingSolution]
  );

  return <GameContext value={value}>{children}</GameContext>;
}

export function useGame() {
  const ctx = use(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
