import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';

const METADATA_COOKIE = 'enclosure-metadata';
const ONE_YEAR = 60 * 60 * 24 * 365;

const metadataSchema = z.object({
  hasViewedTutorial: z.boolean(),
});

export type Metadata = z.infer<typeof metadataSchema>;

export const defaultMetadata: Metadata = {
  hasViewedTutorial: false,
};

export const getMetadataFn = createServerFn({ method: 'GET' }).handler(
  (): Metadata => {
    const storedState = getCookie(METADATA_COOKIE);
    if (!storedState) return defaultMetadata;

    try {
      const result = metadataSchema.safeParse(JSON.parse(storedState));
      return result.success ? result.data : defaultMetadata;
    } catch {
      return defaultMetadata;
    }
  }
);

export const setMetadataFn = createServerFn({ method: 'POST' })
  .validator(metadataSchema)
  .handler(({ data }) => {
    setCookie(METADATA_COOKIE, JSON.stringify(data), {
      httpOnly: true,
      maxAge: ONE_YEAR,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  });
