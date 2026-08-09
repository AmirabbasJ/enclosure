import { useGame } from '@/context/GameContext';
import { useLevel } from '@/data/levels/useLevel';

import { MenuButton } from './components/MenuButton';

export function LevelCompletedMenu() {
  const { state, send } = useGame();
  const { commitPendingProgress } = useLevel();
  const { completedLevelId } = state.context;

  return (
    <div className="level-complete-panel flex w-full max-w-75 flex-col items-center gap-3">
      <p className="text-center text-base opacity-80">
        {completedLevelId != null && completedLevelId > 0
          ? `Level ${String(completedLevelId)} Completed`
          : completedLevelId === -1
            ? 'Tutorial Completed'
            : 'Level Completed'}
      </p>
      <MenuButton
        onClick={() => {
          send({ type: 'NEXT_LEVEL' });
          commitPendingProgress();
        }}
      >
        Next Level
      </MenuButton>
      <MenuButton
        onClick={() => {
          send({ type: 'BACK' });
          commitPendingProgress();
        }}
      >
        Main Menu
      </MenuButton>
    </div>
  );
}
