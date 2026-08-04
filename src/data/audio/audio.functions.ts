import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';

const AUDIO_STATE_COOKIE = 'enclosure-audio-state';
const ONE_YEAR = 60 * 60 * 24 * 365;

const audioStateSchema = z.object({
  hit: z.object({
    volume: z.number().min(0).max(1),
    isOn: z.boolean(),
  }),
  music: z.object({
    volume: z.number().min(0).max(1),
    isOn: z.boolean(),
  }),
});

export type AudioState = z.infer<typeof audioStateSchema>;

const defaultAudioState: AudioState = {
  hit: {
    volume: 0.3,
    isOn: true,
  },
  music: {
    volume: 0.25,
    isOn: true,
  },
};

export const getAudioStateFn = createServerFn({ method: 'GET' }).handler(
  (): AudioState => {
    const storedState = getCookie(AUDIO_STATE_COOKIE);
    if (!storedState) return defaultAudioState;

    try {
      const result = audioStateSchema.safeParse(JSON.parse(storedState));
      return result.success ? result.data : defaultAudioState;
    } catch {
      return defaultAudioState;
    }
  }
);

export const setAudioStateFn = createServerFn({ method: 'POST' })
  .validator(audioStateSchema)
  .handler(({ data }) => {
    setCookie(AUDIO_STATE_COOKIE, JSON.stringify(data), {
      httpOnly: true,
      maxAge: ONE_YEAR,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  });
