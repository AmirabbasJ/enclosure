import { useGame } from '@/context/GameContext';

export function CelebratingMenu() {
  const { state } = useGame();

  return (
    <p className="level-complete-banner title-shadow text-center font-pixel text-[22px] tracking-[2px] text-accent-hover">
      {state.context.finished ? 'SECTOR CLEARED' : 'LEVEL COMPLETE'}
    </p>
  );
}
