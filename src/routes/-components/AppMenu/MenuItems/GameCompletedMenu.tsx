import { useGame } from '@/context/GameContext';
import { useLevel } from '@/data/levels/useLevel';

import { MenuButton } from './components/MenuButton';

export function GameCompletedMenu() {
  const { send } = useGame();
  const { commitPendingProgress } = useLevel();

  return (
    <div className="level-complete-panel flex w-full max-w-75 flex-col items-center gap-3">
      <h2 className="title-shadow text-center font-pixel text-[22px] tracking-[2px] text-accent-hover">
        SECTOR CLEARED
      </h2>
      <div className="bg-foreground pixelated flex flex-col gap-3 p-4">
        <p className="text-center text-text-light">
          You have completed all available levels.
        </p>
        <p className="text-center text-text-light">
          More sectors are under construction.
        </p>
      </div>
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
