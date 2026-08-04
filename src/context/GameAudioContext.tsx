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
  toggleSfx: VoidFunction;
  setSfxAudioVolume: (volume: number) => void;
  setMusicAudioVolume: (volume: number) => void;
  playButtonClick: VoidFunction;
  musicAudioState: AudioState['music'];
  sfxAudioState: AudioState['sfx'];
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
  const { sfx: sfxAudioState, music: musicAudioState } = audioState;

  const [playHit, { stop: stopHit }] = useSound('/audios/hit.mp3', {
    volume: sfxAudioState.isOn ? sfxAudioState.volume : 0,
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

  const toggleSfx = useCallback(() => {
    setAudioState((prev) => ({
      ...prev,
      sfx: { ...prev.sfx, isOn: !prev.sfx.isOn },
    }));
  }, [setAudioState]);

  const setSfxAudioVolume = useCallback(
    (volume: number) => {
      setAudioState((prev) => ({
        ...prev,
        sfx: { ...prev.sfx, volume },
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

  const [playButtonClick] = useSound('/audios/button-click.mp3', {
    volume: sfxAudioState.isOn ? sfxAudioState.volume : 0,
  });

  const value = useMemo(
    () => ({
      playButtonClick,
      playMusic,
      musicAudioState,
      stopMusic,
      toggleMusic,
      setMusicAudioVolume,
      sfxAudioState,
      playRandomHit,
      toggleSfx,
      setSfxAudioVolume,
    }),
    [
      playButtonClick,
      playRandomHit,
      playMusic,
      stopMusic,
      toggleMusic,
      toggleSfx,
      setSfxAudioVolume,
      setMusicAudioVolume,
      musicAudioState,
      sfxAudioState,
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
