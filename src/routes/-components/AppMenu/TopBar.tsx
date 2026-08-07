import { useAuth } from '@/data/auth/useAuth';

import { useGameAudio } from '../../../context/GameAudioContext';
import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '../../../lib/icons';
import Button from '../../../ui/button';
import { UserProfile } from '../UserProfile';

export function TopBar() {
  const { user } = useAuth();
  const { toggleMusic, musicAudioState, toggleSfx, sfxAudioState } =
    useGameAudio();

  return (
    <div className="grid w-full grid-cols-2 items-center border-b border-surface-light bg-foreground/20 px-4 py-2">
      {user ? <UserProfile /> : <div />}
      <div className="flex items-center justify-end gap-2">
        <Button size="icon" onClick={toggleMusic}>
          {musicAudioState.isOn ? (
            <IconMusic width={25} height={25} />
          ) : (
            <IconMusicOff width={25} height={25} />
          )}
        </Button>

        <Button size="icon" onClick={toggleSfx}>
          {sfxAudioState.isOn ? (
            <IconSoundMedium width={25} height={25} />
          ) : (
            <IconSoundOff width={25} height={25} />
          )}
        </Button>
      </div>
    </div>
  );
}
