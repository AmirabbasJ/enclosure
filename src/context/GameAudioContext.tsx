import type { PropsWithChildren } from 'react';

import { useServerFn } from '@tanstack/react-start';
import { createContext, use, useCallback, useMemo, useState } from 'react';
import useSound from 'use-sound';

import type { AudioState } from '../data/audio/audio.functions';

import { setAudioStateFn } from '../data/audio/audio.functions';
import { randomInt } from '../utils/randomInt';

interface GameAudioContextValue {
  playRandomHit: VoidFunction;
  playMusic: VoidFunction;
  stopMusic: (id?: string) => void;
  toggleMusic: VoidFunction;
  toggleHit: VoidFunction;
  setHitAudioVolume: (volume: number) => void;
  setMusicAudioVolume: (volume: number) => void;
  musicAudioState: AudioState['music'];
  hitAudioState: AudioState['hit'];
}

const GameAudioContext = createContext<GameAudioContextValue | null>(null);
GameAudioContext.displayName = 'GameAudioContext';

interface GameAudioProviderProps extends PropsWithChildren {
  initialAudioState: AudioState;
}

export function GameAudioProvider({
  children,
  initialAudioState,
}: GameAudioProviderProps) {
  const persistAudioState = useServerFn(setAudioStateFn);

  const [audioState, setLocalAudioState] =
    useState<AudioState>(initialAudioState);
  const { hit: hitAudioState, music: musicAudioState } = audioState;

  const [playHit, { stop: stopHit }] = useSound('/audios/hit.mp3', {
    volume: hitAudioState.isOn ? hitAudioState.volume : 0,
    sprite: {
      1: [1550, 250],
      2: [2300, 250],
      3: [3010, 250],
      4: [6380, 250],
    },
  });

  const setAudioState = useCallback(
    (updater: (audioState: AudioState) => AudioState) => {
      setLocalAudioState((prev) => {
        const newState = updater(prev);
        void persistAudioState({ data: newState }).catch(() => undefined);
        return newState;
      });
    },
    [persistAudioState]
  );

  const toggleHit = useCallback(() => {
    setAudioState((prev) => ({
      ...prev,
      hit: { ...prev.hit, isOn: !prev.hit.isOn },
    }));
  }, [setAudioState]);

  const setHitAudioVolume = useCallback(
    (volume: number) => {
      setAudioState((prev) => ({
        ...prev,
        hit: { ...prev.hit, volume },
      }));
    },
    [setAudioState]
  );

  const [playMusic, { stop: stopMusic }] = useSound('/audios/music.mp3', {
    volume: musicAudioState.isOn ? musicAudioState.volume : 0,
    loop: true,
  });

  const toggleMusic = useCallback(() => {
    setAudioState((prev) => ({
      ...prev,
      music: { ...prev.music, isOn: !prev.music.isOn },
    }));
  }, [setAudioState]);

  const setMusicAudioVolume = useCallback(
    (volume: number) => {
      setAudioState((prev) => ({
        ...prev,
        music: { ...prev.music, volume },
      }));
    },
    [setAudioState]
  );

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
