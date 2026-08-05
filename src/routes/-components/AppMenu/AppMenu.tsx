import { useCallback, useEffect, useState } from 'react';

import { useGameAudio } from '@/context/GameAudioContext';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';
import { LoadingDots } from '@/ui/LoadingDots';

import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '../../../lib/icons';
import Button from '../../../ui/button';
import PixelBlast from '../../../ui/pixel-blast';
import RangeSlider from '../../../ui/range-slider';
import { Tutorial } from '../Tutorial/Tutorial';
import { AuthForm } from './AuthForm';
import { TopBar } from './TopBar';

function MenuButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="flex min-w-75 items-center justify-center"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
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
            <Button noStyling variant="icon" onClick={toggleMusic}>
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
            <Button noStyling variant="icon" onClick={toggleSfx}>
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
  const { signOut, isSignedIn } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (state.matches('playing') || state.matches('launch')) return null;

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
          disabled={signingOut}
          onClick={() => {
            if (isSignedIn) {
              setSigningOut(true);
              void signOut()
                .then((error) => {
                  if (!error) send({ type: 'SIGN_OUT' });
                })
                .finally(() => setSigningOut(false));
              return;
            }

            send({ type: 'OPEN_SIGN_IN' });
          }}
        >
          {signingOut ? <LoadingDots /> : isSignedIn ? 'Sign Out' : 'Sign In'}
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

  if (state.matches('tutorial')) {
    const fromHelp = state.context.tutorialBackTo === 'help';
    return (
      <Tutorial
        onComplete={
          fromHelp ? undefined : () => send({ type: 'TUTORIAL_COMPLETE' })
        }
        onBack={() => send({ type: 'BACK' })}
      />
    );
  }

  if (state.matches('askSignIn')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">
          Sign in to save your scores (optional)
        </p>
        <AuthForm onSuccess={() => send({ type: 'SIGN_IN' })} />
        <MenuButton onClick={() => send({ type: 'SKIP_SIGN_IN' })}>
          Skip
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches('leaderboard')) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Leaderboard</p>
        <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
      </>
    );
  }

  if (state.matches({ help: 'menu' })) {
    return (
      <>
        <p className="mb-3 text-center text-base opacity-80">Help</p>
        <MenuButton onClick={() => send({ type: 'CONTROLS' })}>
          Controls
        </MenuButton>
        <MenuButton onClick={() => send({ type: 'RULES' })}>Rules</MenuButton>
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
  const isSceneActive = state.matches('paused') || state.matches('playing');
  const goBack = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (state.matches('paused')) {
        send({ type: 'PLAY' });
        return;
      }

      send({ type: 'BACK' });
    },
    [send, state]
  );

  useEffect(() => {
    window.addEventListener('keydown', goBack);

    return () => {
      window.removeEventListener('keydown', goBack);
    };
  }, [goBack]);

  return (
    <div className="absolute backdrop-blur-xs inset-x-0 bottom-0 flex h-full w-full flex-col items-center justify-center pb-2">
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <TopBar />
        <div className="relative w-full flex h-full flex-col items-center justify-center gap-4">
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
                  className="max-w-75 text-center font-pixel text-[9px] text-text-muted"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  are we being protected, or are we being contained?
                </p>
              </div>
            )}
            <div className="flex max-w-105 flex-col justify-center gap-3 p-3">
              <MenuContent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
