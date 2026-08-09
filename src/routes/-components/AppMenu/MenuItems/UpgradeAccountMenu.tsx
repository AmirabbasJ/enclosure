import { useGame } from '@/context/GameContext';

import { UpgradeAccountForm } from '../UpgradeAccountForm';

export function UpgradeAccountMenu() {
  const { send } = useGame();

  return <UpgradeAccountForm onBack={() => send({ type: 'BACK' })} />;
}
