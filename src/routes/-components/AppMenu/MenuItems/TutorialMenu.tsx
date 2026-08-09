import { useGame } from '@/context/GameContext';

import { Tutorial } from '../../Tutorial/Tutorial';

export function TutorialMenu() {
  const { send } = useGame();

  return <Tutorial onBack={() => send({ type: 'BACK' })} />;
}
