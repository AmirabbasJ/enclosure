import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';
import { useProgress } from '@/data/progress/useProgress';

import { UserProfile } from '../../UserProfile';
import { MenuButton } from './components/MenuButton';

export function ProfileMenu() {
  const { send } = useGame();
  const { user, signOutMutation } = useAuth();
  const { progress } = useProgress();

  return (
    <>
      <p className="mb-3 text-center text-base opacity-80">Profile</p>
      {user && progress ? (
        <div className="bg-foreground p-4 pixelated">
          <UserProfile />
        </div>
      ) : null}
      {user?.type === 'guest' ? (
        <MenuButton onClick={() => send({ type: 'UPGRADE_ACCOUNT' })}>
          Upgrade
        </MenuButton>
      ) : null}
      {user?.type === 'auth' ? (
        <>
          <MenuButton onClick={() => send({ type: 'EDIT_PROFILE' })}>
            Edit Profile
          </MenuButton>
          <MenuButton
            isLoading={signOutMutation.isPending}
            onClick={async () => {
              await signOutMutation.mutateAsync();
              send({ type: 'SIGN_OUT' });
            }}
          >
            Sign Out
          </MenuButton>
        </>
      ) : null}
      <MenuButton
        variant="danger"
        onClick={() => send({ type: 'DELETE_ACCOUNT' })}
      >
        Delete Account
      </MenuButton>
      <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
    </>
  );
}
