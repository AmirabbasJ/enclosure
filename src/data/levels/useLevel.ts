import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';

import type { WallInput } from '../../domain/walls';

import { queryKeys } from '../queryKeys';
import { checkLevelCompletionFn, getCurrentLevelFn } from './level.functions';

export function useLevel() {
  const { level: initialLevel } = useRouteContext({ from: '__root__' });
  const getCurrentLevel = useServerFn(getCurrentLevelFn);
  const checkLevelCompletion = useServerFn(checkLevelCompletionFn);

  const { data: level } = useQuery({
    queryKey: queryKeys.user.level.queryKey,
    queryFn: () => getCurrentLevel(),
    initialData: initialLevel,
  });

  const checkLevelCompletionMutation = useMutation({
    mutationFn: (walls: WallInput[]) =>
      checkLevelCompletion({ data: { answer: walls } }),
  });

  return { level, checkLevelCompletionMutation };
}
