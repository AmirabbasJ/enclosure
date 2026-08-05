import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';

import { createServerClient } from '../../lib/supabase/client.server';

const METADATA_COOKIE = 'enclosure-metadata';
const ONE_YEAR = 60 * 60 * 24 * 365;

const metadataSchema = z.object({
  hasViewedTutorial: z.boolean(),
});

export type Metadata = z.infer<typeof metadataSchema>;

export const defaultMetadata: Metadata = {
  hasViewedTutorial: false,
};

export const getMetadataCookieFn = createServerFn({ method: 'GET' }).handler(
  (): Metadata | null => {
    const storedState = getCookie(METADATA_COOKIE);
    if (!storedState) return defaultMetadata;

    try {
      const result = metadataSchema.safeParse(JSON.parse(storedState));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }
);

const setMetadataCookie = (metadata: Metadata) => {
  setCookie(METADATA_COOKIE, JSON.stringify(metadata), {
    httpOnly: true,
    maxAge: ONE_YEAR,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
};

export const setMetadataFn = createServerFn({ method: 'POST' })
  .validator(metadataSchema)
  .handler(async ({ data }) => {
    setMetadataCookie(data);

    const supabase = createServerClient();
    const { data: sessionUser } = await supabase.auth.getUser();
    const { user } = sessionUser;

    if (!user) {
      return data;
    }

    await supabase
      .from('profiles')
      .update({
        has_viewed_tutorial: data.hasViewedTutorial,
      })
      .eq('id', user.id);

    return data;
  });
