import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';

import type { Metadata } from './metadata.functions';

import { getSessionFn } from '../auth/auth.functions';
import { queryKeys } from '../queryKeys';
import { setMetadataFn } from './metadata.functions';

export function useMetadata() {
  const { metadata: initialMetadata } = useRouteContext({ from: '__root__' });

  const setMetadata = useServerFn(setMetadataFn);

  const { data: metadata } = useQuery({
    queryKey: queryKeys.metadata.current.queryKey,
    queryFn: () => getSessionFn().then((d) => d?.metadata),
    initialData: initialMetadata ?? null,
  });

  const setMetadataMutation = useMutation({
    mutationFn: (data: Metadata) => setMetadata({ data }),
  });

  return { metadata, setMetadataMutation };
}
