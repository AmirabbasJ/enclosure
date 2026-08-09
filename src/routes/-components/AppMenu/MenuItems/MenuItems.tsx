import { useGame } from '../../../../context/GameContext';
import { useAuth } from '../../../../data/auth/useAuth';
import { useLevel } from '../../../../data/levels/useLevel';
import { useProgress } from '../../../../data/progress/useProgress';
import { Tutorial } from '../../Tutorial/Tutorial';
import { UserProfile } from '../../UserProfile';
import { AuthForm } from '../AuthForm';
import { UpdateProfileForm } from '../updateProfile';
import { UpgradeAccountForm } from '../UpgradeAccountForm';
import { LeaderboardMenu } from './LeaderboardMenu';
import { MenuButton } from './MenuButton';
import { SettingsMenu } from './SettingsMenu';

export function MenuItems() {
  const { state, send } = useGame();
  const { signUpGuestMutation, user, deleteAccountMutation, signOutMutation } =
    useAuth();
  const { progress } = useProgress();
  const { commitPendingProgress } = useLevel();

  if (state.matches('playing')) return null;

  if (state.matches('celebrating')) {
    return (
      <p className="level-complete-banner title-shadow text-center font-pixel text-[22px] tracking-[2px] text-accent-hover">
        {state.context.finished ? 'SECTOR CLEARED' : 'LEVEL COMPLETE'}
      </p>
    );
  }

  if (state.matches('gameCompleted')) {
    return (
      <div className="level-complete-panel flex w-full max-w-75 flex-col items-center gap-3">
        <div className="bg-foreground pixelated p-4 gap-3">
          <p className="mb-3 text-center text-text-light ">
            You have completed all available levels.
          </p>
          <p className="mb-3 text-center text-text-light ">
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

  if (state.matches('levelCompleted')) {
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
  if (state.matches('paused')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Paused</p>
        <MenuButton onClick={() => send({ type: 'PLAY' })}>Resume</MenuButton>
        <MenuButton onClick={() => send({ type: 'BACK' })}>
          Main Menu
        </MenuButton>
      </>
    );
  }

  if (state.matches('mainMenu')) {
    return (
      <>
        <MenuButton onClick={() => send({ type: 'PLAY' })}>Play</MenuButton>
        <MenuButton onClick={() => send({ type: 'HELP' })}>Help</MenuButton>
        <MenuButton
          onClick={() => {
            send({ type: 'PROFILE' });
          }}
        >
          Profile
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'LEADERBOARD' })}>
          Leaderboard
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'SETTINGS' })}>
          Settings
        </MenuButton>
      </>
    );
  }

  if (state.matches('profile')) {
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

  if (state.matches('confirmDeleteAccount')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Delete Account</p>
        <div className="flex flex-col gap-3 pixelated bg-foreground px-4 py-6">
          <p className="max-w-75 text-center font-pixel text-xs text-text-light">
            This permanently deletes your account and progress. Cannot undo.
          </p>
        </div>
        <MenuButton
          variant="danger"
          isLoading={deleteAccountMutation.isPending}
          onClick={async () => {
            const error = await deleteAccountMutation.mutateAsync();
            if (!error) send({ type: 'SIGN_OUT' });
          }}
        >
          Confirm Delete
        </MenuButton>
        <MenuButton
          disabled={deleteAccountMutation.isPending}
          onClick={() => send({ type: 'BACK' })}
        >
          Cancel
        </MenuButton>
      </>
    );
  }

  if (state.matches('upgradeAccount')) {
    return <UpgradeAccountForm onBack={() => send({ type: 'BACK' })} />;
  }

  if (state.matches('editProfile')) {
    return <UpdateProfileForm onBack={() => send({ type: 'BACK' })} />;
  }

  if (state.matches('tutorial')) {
    return <Tutorial onBack={() => send({ type: 'BACK' })} />;
  }

  if (state.matches('askGuestOrSignUp')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">
          Play as guest or create an account
        </p>
        <MenuButton
          disabled={signUpGuestMutation.isPending}
          onClick={() => send({ type: 'SIGN_UP' })}
        >
          Sign Up
        </MenuButton>
        <MenuButton
          isLoading={signUpGuestMutation.isPending}
          onClick={async () => {
            const guestId = await signUpGuestMutation.mutateAsync();
            if (guestId) send({ type: 'CONTINUE_AS_GUEST' });
          }}
        >
          Continue as Guest
        </MenuButton>
        <MenuButton
          disabled={signUpGuestMutation.isPending}
          onClick={() => send({ type: 'BACK' })}
        >
          Back
        </MenuButton>
      </>
    );
  }

  if (state.matches('signUp')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Sign Up</p>
        <AuthForm
          initialMode="signUp"
          onSuccess={() => send({ type: 'SIGN_IN' })}
        />
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches('leaderboard')) {
    return <LeaderboardMenu onBack={() => send({ type: 'BACK' })} />;
  }

  if (state.matches({ help: 'menu' })) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Help</p>
        <MenuButton onClick={() => send({ type: 'CONTROLS' })}>
          Controls
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'RULES' })}>Rules</MenuButton>
        <MenuButton onClick={() => send({ type: 'TUTORIAL' })}>
          Replay Tutorial
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches({ help: 'controls' })) {
    return (
      <Tutorial
        pagesToInclude={['controls']}
        onBack={() => send({ type: 'BACK' })}
      />
    );
  }

  if (state.matches({ help: 'rules' })) {
    return (
      <Tutorial
        pagesToInclude={['goal', 'meetTower', 'redOpen', 'surround']}
        onBack={() => send({ type: 'BACK' })}
      />
    );
  }

  if (state.matches('signIn')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Sign In</p>
        <AuthForm onSuccess={() => send({ type: 'SIGN_IN' })} />
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches('settings')) {
    return <SettingsMenu onBack={() => send({ type: 'BACK' })} />;
  }

  return null;
}
