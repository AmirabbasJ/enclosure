import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useCallback } from 'react';

import type { Progress } from '../../domain/progress';
import type { WallInput } from '../../domain/walls';

import { useProgress } from '../progress/useProgress';
import { queryKeys } from '../queries';
import { completeLevelFn } from './level.functions';

const pendingProgressKey = ['user', 'pendingProgress'] as const;

export function useLevel() {
  const { progress } = useProgress();
  const queryClient = useQueryClient();
  const completeLevel = useServerFn(completeLevelFn);

  const levelId = progress?.level_id ?? null;

  const { data: level } = useQuery({
    ...queryKeys.user.level(levelId),
    enabled: levelId != null && !progress?.finished,
  });

  const commitPendingProgress = useCallback(() => {
    const pending = queryClient.getQueryData<Progress>(pendingProgressKey);
    if (!pending) return;

    queryClient.removeQueries({ queryKey: pendingProgressKey });
    queryClient.setQueryData(queryKeys.user.progress.queryKey, pending);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.user.progress.queryKey,
    });
  }, [queryClient]);

  const completeLevelMutation = useMutation({
    mutationFn: (walls: WallInput[]) =>
      completeLevel({
        data: { answer: walls, levelId: String(level!.id) },
      }),
    onSuccess: (result) => {
      if (!result.isCorrect) return;
      // Defer progress update so the solved level stays until Next Level.
      queryClient.setQueryData(pendingProgressKey, result.progress);
    },
  });

  return { level, completeLevelMutation, commitPendingProgress };
}
