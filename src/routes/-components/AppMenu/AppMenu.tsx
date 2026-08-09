import { useCallback, useEffect, useRef } from 'react';

import { useGameAudio } from '@/context/GameAudioContext';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';

import type { ButtonProps } from '../../../ui/button';

import { useLeaderboard } from '../../../data/leaderboard/useLeaderboard';
import { useLevel } from '../../../data/levels/useLevel';
import { useMetadata } from '../../../data/metadata/useMetadata';
import { useProgress } from '../../../data/progress/useProgress';
import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '../../../lib/icons';
import { Avatar } from '../../../ui/avatar';
import Button from '../../../ui/button';
import { LoadingDots } from '../../../ui/LoadingDots';
import PixelBlast from '../../../ui/pixel-blast';
import RangeSlider from '../../../ui/range-slider';
import { Tutorial } from '../Tutorial/Tutorial';
import { UserProfile } from '../UserProfile';
import { AuthForm } from './AuthForm';
import { TopBar } from './TopBar';
import { UpdateProfileForm } from './updateProfile';
import { UpgradeAccountForm } from './UpgradeAccountForm';

function MenuButton(props: ButtonProps) {
  return (
    <Button {...props} className="flex min-w-75 items-center justify-center" />
  );
}

// FIXME I should probably put every menu in a separate component

function LeaderboardMenu({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { leaderboard, isLoading } = useLeaderboard();
  const youRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading || !youRef.current) return;
    youRef.current.scrollIntoView({ block: 'center' });
  }, [isLoading, leaderboard, user?.username]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="mb-3 text-center text-base opacity-80">Leaderboard</p>
      <div className="flex max-h-[50vh] min-w-75 w-full flex-col gap-1 overflow-y-auto bg-foreground pixelated p-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <LoadingDots />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="py-6 text-center font-pixel text-[10px] text-text-light">
            No rankings yet
          </p>
        ) : (
          leaderboard.map((entry) => {
            const isYou = user?.username === entry.username;
            return (
              <div
                key={`${entry.rank}-${entry.username}`}
                ref={isYou ? youRef : undefined}
                className={`flex items-center justify-between gap-3 px-2 py-1.5 ${
                  isYou ? 'bg-accent/20' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-6 shrink-0 font-pixel text-[10px] text-text-light">
                    {entry.rank}
                  </span>
                  <Avatar
                    seed={entry.username}
                    size={28}
                    className="shrink-0"
                  />
                  <span className="truncate font-pixel text-xs text-text-light">
                    {entry.username}
                    {isYou ? ' (you)' : ''}
                  </span>
                </div>
                <span className="shrink-0 font-pixel text-[10px] text-success">
                  {entry.finished ? 'Done' : `Lv ${entry.level_id}`}
                </span>
              </div>
            );
          })
        )}
      </div>
      <MenuButton onClick={onBack}>Back</MenuButton>
    </div>
  );
}

function SettingsMenu({ onBack }: { onBack: () => void }) {
  const {
    musicAudioState,
    sfxAudioState,
    setMusicAudioVolume,
    setSfxAudioVolume,
    toggleMusic,
    toggleSfx,
    playButtonClick,
    resetAudioState,
  } = useGameAudio();

  return (
    <div className="flex flex-col items-center gap-5 ">
      <p className="mb-3 text-center text-base opacity-80">Settings</p>
      <div className="flex w-full min-w-75 flex-col gap-5 p-5 bg-foreground pixelated">
        <RangeSlider
          disabled={!musicAudioState.isOn}
          label={
            <Button noStyling size="icon" onClick={toggleMusic}>
              {musicAudioState.isOn ? (
                <IconMusic width={25} height={25} />
              ) : (
                <IconMusicOff width={25} height={25} />
              )}
            </Button>
          }
          id="Music"
          value={Math.round(musicAudioState.volume * 100)}
          onValueChange={(v) => setMusicAudioVolume(v / 100)}
        />
        <RangeSlider
          disabled={!sfxAudioState.isOn}
          label={
            <Button noStyling size="icon" onClick={toggleSfx}>
              {sfxAudioState.isOn ? (
                <IconSoundMedium width={25} height={25} />
              ) : (
                <IconSoundOff width={25} height={25} />
              )}
            </Button>
          }
          id="SFX"
          value={Math.round(sfxAudioState.volume * 100)}
          onMouseUp={() => {
            if (sfxAudioState.isOn) playButtonClick();
          }}
          onValueChange={(v) => {
            setSfxAudioVolume(v / 100);
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <MenuButton onClick={resetAudioState}>Reset</MenuButton>
        <MenuButton onClick={onBack}>Back</MenuButton>
      </div>
    </div>
  );
}

function MenuContent() {
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

export function AppMenu() {
  const { state, send } = useGame();
  const { commitPendingProgress } = useLevel();
  const isSceneActive =
    state.matches('paused') ||
    state.matches('playing') ||
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');
  const showingSolution =
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');
  const goBack = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (state.matches('celebrating')) return;

      if (state.matches('paused')) {
        send({ type: 'PLAY' });
        return;
      }

      if (state.matches('levelCompleted') || state.matches('gameCompleted')) {
        send({ type: 'BACK' });
        commitPendingProgress();
        return;
      }

      send({ type: 'BACK' });
    },
    [commitPendingProgress, send, state]
  );

  useEffect(() => {
    window.addEventListener('keydown', goBack);

    return () => {
      window.removeEventListener('keydown', goBack);
    };
  }, [goBack]);
  useMetadata();

  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex h-full w-full flex-col items-center pb-2 ${
        showingSolution ? '' : 'backdrop-blur-xs'
      }`}
    >
      <div className="relative flex h-full w-full flex-col items-center">
        {!showingSolution ? <TopBar /> : null}
        <div
          className={`relative flex h-full w-full flex-col items-center gap-4 ${
            showingSolution
              ? state.matches('celebrating')
                ? 'justify-start pt-16'
                : 'justify-end'
              : 'justify-center'
          }`}
        >
          {!isSceneActive ? (
            <div className="absolute w-full h-full blur-[3px]">
              <PixelBlast
                variant="square"
                pixelSize={5}
                color="#72ceff"
                patternScale={3}
                patternDensity={1}
                pixelSizeJitter={0}
                enableRipples
                rippleSpeed={0.4}
                rippleThickness={0.12}
                rippleIntensityScale={1.5}
                liquid={false}
                liquidStrength={0.12}
                liquidRadius={1.2}
                liquidWobbleSpeed={5}
                speed={0.5}
                edgeFade={0.1}
                transparent
              />
            </div>
          ) : null}
          <div className="z-2">
            {state.matches('mainMenu') && (
              <div className="flex flex-col items-center gap-1">
                <h1 className="title-shadow text-center font-pixel text-[38px] tracking-[3px] text-accent-hover">
                  EN<span className="text-accent">CLOSURE</span>
                </h1>
                <p
                  className="max-w-75 text-center font-pixel text-[9px] text-text-light"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  are we being protected, or are we being contained?
                </p>
              </div>
            )}
            <div className="flex max-w-120 flex-col justify-center gap-3 p-3 ">
              <MenuContent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
