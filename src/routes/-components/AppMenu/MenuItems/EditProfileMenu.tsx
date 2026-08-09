import { useGame } from '@/context/GameContext';

import { UpdateProfileForm } from '../updateProfile';

export function EditProfileMenu() {
  const { send } = useGame();

  return <UpdateProfileForm onBack={() => send({ type: 'BACK' })} />;
}
