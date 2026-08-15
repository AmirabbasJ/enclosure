import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';

import type { Metadata } from './metadata.functions';

import { queryKeys } from '../queries';
import { setMetadataFn } from './metadata.functions';

export function useMetadata() {
  const queryClient = useQueryClient();

  const setMetadata = useServerFn(setMetadataFn);

  const { data: metadata } = useQuery(queryKeys.user.metadata);

  const setMetadataMutation = useMutation({
    mutationFn: (data: Metadata) => setMetadata({ data }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user.metadata.queryKey, data);
    },
  });

  return { metadata, setMetadataMutation };
}
