import { useGameAudio } from '@/context/GameAudioContext';
import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '@/lib/icons';
import Button from '@/ui/button';
import RangeSlider from '@/ui/range-slider';

import { MenuButton } from './MenuButton';

export function SettingsMenu({ onBack }: { onBack: () => void }) {
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
