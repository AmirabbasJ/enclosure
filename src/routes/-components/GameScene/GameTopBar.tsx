import { useGame } from '../../../context/GameContext';
import { useLevel } from '../../../data/levels/useLevel';
import {
  IconArrowLeft,
  IconArrowRight,
  IconPause,
  IconTopDown,
} from '../../../lib/icons';
import Button from '../../../ui/button';

interface GameTopBarProps {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onToggleTopDown: () => void;
}

export function GameTopBar({
  onRotateLeft,
  onRotateRight,
  onToggleTopDown,
}: GameTopBarProps) {
  const { level } = useLevel();
  const { send } = useGame();

  return (
    <div className="absolute top-0 right-0 left-0 z-10 flex h-16.75 items-center justify-between gap-2 px-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:gap-4 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button onClick={() => send({ type: 'PAUSE' })} size="icon">
          <IconPause width={25} height={25} />
        </Button>
        <p>level {level?.id}</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Button onClick={onRotateLeft} size="icon">
          <IconArrowLeft width={25} height={25} />
        </Button>
        <Button onClick={onToggleTopDown} size="icon">
          <IconTopDown width={25} height={25} />
        </Button>
        <Button onClick={onRotateRight} size="icon">
          <IconArrowRight width={25} height={25} />
        </Button>
      </div>
    </div>
  );
}
