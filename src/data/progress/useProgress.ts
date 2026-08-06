import { useQuery } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';

import { queryKeys } from '../queryKeys';
import { getProgressFn } from './progrsss.functions';

export function useProgress() {
  const { progress: initialProgress } = useRouteContext({ from: '__root__' });

  const getProgress = useServerFn(getProgressFn);

  const { data: progress } = useQuery({
    queryKey: queryKeys.progress.current.queryKey,
    queryFn: () => getProgress(),
    initialData: initialProgress ?? null,
  });

  return { progress };
}
