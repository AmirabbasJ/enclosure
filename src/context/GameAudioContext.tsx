import type { PropsWithChildren } from 'react';

import { createContext, use, useCallback, useMemo } from 'react';
import useSound from 'use-sound';

import { randomInt } from '../utils/randomInt';

interface GameAudioContextValue {
  playWallGroundHit: VoidFunction;
  playMusic: VoidFunction;
  stopMusic: (id?: string) => void;
}

const GameAudioContext = createContext<GameAudioContextValue | null>(null);
GameAudioContext.displayName = 'GameAudioContext';

export function GameAudioProvider({ children }: PropsWithChildren) {
  const [playHit, { stop: stopHit }] = useSound('/hit.mp3', {
    volume: 0.3,
    sprite: {
      1: [1550, 250],
      2: [2300, 250],
      3: [3010, 250],
      4: [6380, 250],
    },
  });

  const [playMusic, { stop: stopMusic }] = useSound('/music.mp3', {
    volume: 0.25,
    loop: true,
  });

  const playWallGroundHit = useCallback(() => {
    stopHit();
    const random = randomInt(1, 4).toString();
    playHit({ id: random });
  }, [playHit, stopHit]);

  const value = useMemo(
    () => ({
      playWallGroundHit,
      playMusic,
      stopMusic,
    }),
    [playWallGroundHit, playMusic, stopMusic]
  );

  return <GameAudioContext value={value}>{children}</GameAudioContext>;
}

export function useGameAudio() {
  const ctx = use(GameAudioContext);
  if (!ctx)
    throw new Error('useGameAudio must be used within GameAudioProvider');
  return ctx;
}
