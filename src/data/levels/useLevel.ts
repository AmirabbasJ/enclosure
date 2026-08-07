import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';

import type { Progress } from '../../domain/progress';
import type { WallInput } from '../../domain/walls';

import { useProgress } from '../progress/useProgress';
import { queryKeys } from '../queryKeys';
import { completeLevelFn, getLevelFn } from './level.functions';

export function useLevel() {
  const { level: initialLevel } = useRouteContext({ from: '__root__' });
  const { progress } = useProgress();
  const queryClient = useQueryClient();
  const getCurrentLevel = useServerFn(getLevelFn);
  const completeLevel = useServerFn(completeLevelFn);

  const { data: level } = useQuery({
    queryKey: queryKeys.user.level(progress?.level_id).queryKey,
    queryFn: () => getCurrentLevel(),
    initialData: initialLevel,
  });

  const completeLevelMutation = useMutation({
    mutationFn: (walls: WallInput[]) =>
      completeLevel({
        data: { answer: walls, levelId: String(level!.id) },
      }),
    onSuccess: ({ isCorrect }) => {
      if (!isCorrect) return;
      queryClient.setQueryData(
        queryKeys.user.progress.queryKey,
        (old: Progress | null) => {
          if (!old) return null;
          return {
            ...old,
            level_id: old.level_id + 1,
          };
        }
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.progress.queryKey,
      });
    },
  });

  return { level, completeLevelMutation };
}
