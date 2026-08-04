import { useAuth } from '@/data/auth/useAuth';
import { Avatar } from '@/ui/avatar';

import { useGameAudio } from '../../../../context/GameAudioContext';
import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '../../../../lib/icons';
import Button from '../../../../ui/button';

export function TopBar() {
  const { user } = useAuth();
  const { toggleMusic, musicAudioState, toggleHit, hitAudioState } =
    useGameAudio();

  return (
    <div className="grid w-full grid-cols-2 items-center border-b border-surface-light bg-foreground/20 px-4 py-2">
      {user ? (
        <div className="flex items-center gap-2">
          <Avatar size={50} seed={user.username} />
          <p className="text-sm">{user.username} </p>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={toggleMusic}
          className="flex items-center justify-center p-2"
        >
          {musicAudioState.isOn ? (
            <IconMusic width={25} height={25} />
          ) : (
            <IconMusicOff width={25} height={25} />
          )}
        </Button>

        <Button
          onClick={toggleHit}
          className="flex items-center justify-center p-2"
        >
          {hitAudioState.isOn ? (
            <IconSoundMedium width={25} height={25} />
          ) : (
            <IconSoundOff width={25} height={25} />
          )}
        </Button>
      </div>
    </div>
  );
}
