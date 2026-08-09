import { useGame } from '@/context/GameContext';

import { Tutorial } from '../../Tutorial/Tutorial';

export function HelpControlsMenu() {
  const { send } = useGame();

  return (
    <Tutorial
      pagesToInclude={['controls']}
      onBack={() => send({ type: 'BACK' })}
    />
  );
}
