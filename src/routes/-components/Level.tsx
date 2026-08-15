import { cn } from 'tailwind-variants';

import type { Progress } from '../../domain/progress';

import { getLevelColor } from '../../domain/level';

interface Props {
  progress: Progress;
  className?: string;
}

export function Level({ progress, className }: Props) {
  return (
    <p
      className={cn('text-[10px]', getLevelColor(progress.level_id), className)}
    >
      {progress.finished ? 'Completed!' : `Level ${progress.level_id}`}
    </p>
  );
}
