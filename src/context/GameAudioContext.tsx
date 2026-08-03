import type { PropsWithChildren } from 'react';

import { createContext, use, useCallback, useMemo, useState } from 'react';
import useSound from 'use-sound';

import { randomInt } from '../utils/randomInt';

interface GameAudioContextValue {
  playRandomHit: VoidFunction;
  playMusic: VoidFunction;
  stopMusic: (id?: string) => void;
  toggleMusic: VoidFunction;
  toggleHit: VoidFunction;
  setHitAudioVolume: (volume: number) => void;
  setMusicAudioVolume: (volume: number) => void;
  musicAudioState: AudioState;
  hitAudioState: AudioState;
}

interface AudioState {
  volume: number;
  isOn: boolean;
}

const GameAudioContext = createContext<GameAudioContextValue | null>(null);
GameAudioContext.displayName = 'GameAudioContext';

export function GameAudioProvider({ children }: PropsWithChildren) {
  const [hitAudioState, setHitAudioState] = useState<AudioState>({
    volume: 0.3,
    isOn: true,
  });

  const [playHit, { stop: stopHit }] = useSound('/audios/hit.mp3', {
    volume: hitAudioState.isOn ? hitAudioState.volume : 0,
    sprite: {
      1: [1550, 250],
      2: [2300, 250],
      3: [3010, 250],
      4: [6380, 250],
    },
  });

  const toggleHit = useCallback(() => {
    setHitAudioState((prev) => ({ ...prev, isOn: !prev.isOn }));
  }, []);

  const setHitAudioVolume = useCallback((volume: number) => {
    setHitAudioState((prev) => ({ ...prev, volume }));
  }, []);

  const [musicAudioState, setMusicAudioState] = useState<AudioState>({
    volume: 0.25,
    isOn: true,
  });
  const [playMusic, { stop: stopMusic }] = useSound('/audios/music.mp3', {
    volume: musicAudioState.isOn ? musicAudioState.volume : 0,
    loop: true,
  });

  const toggleMusic = useCallback(() => {
    setMusicAudioState((prev) => ({ ...prev, isOn: !prev.isOn }));
  }, []);
  const setMusicAudioVolume = useCallback((volume: number) => {
    setMusicAudioState((prev) => ({ ...prev, volume }));
  }, []);

  const playRandomHit = useCallback(() => {
    stopHit();
    const random = randomInt(1, 4).toString();
    playHit({ id: random });
  }, [playHit, stopHit]);

  const value = useMemo(
    () => ({
      playMusic,
      musicAudioState,
      stopMusic,
      toggleMusic,
      setMusicAudioVolume,
      hitAudioState,
      playRandomHit,
      toggleHit,
      setHitAudioVolume,
    }),
    [
      playRandomHit,
      playMusic,
      stopMusic,
      toggleMusic,
      toggleHit,
      setHitAudioVolume,
      setMusicAudioVolume,
      musicAudioState,
      hitAudioState,
    ]
  );

  return <GameAudioContext value={value}>{children}</GameAudioContext>;
}

export function useGameAudio() {
  const ctx = use(GameAudioContext);
  if (!ctx)
    throw new Error('useGameAudio must be used within GameAudioProvider');
  return ctx;
}
