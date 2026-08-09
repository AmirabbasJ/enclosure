import { useGame } from '@/context/GameContext';

import { Tutorial } from '../../Tutorial/Tutorial';

export function HelpRulesMenu() {
  const { send } = useGame();

  return (
    <Tutorial
      pagesToInclude={['goal', 'meetTower', 'redOpen', 'surround']}
      onBack={() => send({ type: 'BACK' })}
    />
  );
}
