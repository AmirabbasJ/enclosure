import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queries';

export function useProgress() {
  const { data: progress, isLoading } = useQuery(queryKeys.user.progress);

  return { progress, isLoading: isLoading as boolean };
}
