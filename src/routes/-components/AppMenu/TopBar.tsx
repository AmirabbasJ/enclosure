import { useAuth } from '@/data/auth/useAuth';
import { Avatar } from '@/ui/avatar';

import { useGameAudio } from '../../../context/GameAudioContext';
import { useProgress } from '../../../data/progress/useProgress';
import {
  IconMusic,
  IconMusicOff,
  IconSoundMedium,
  IconSoundOff,
} from '../../../lib/icons';
import Button from '../../../ui/button';

export function TopBar() {
  const { user } = useAuth();
  const { toggleMusic, musicAudioState, toggleSfx, sfxAudioState } =
    useGameAudio();
  const { progress } = useProgress();

  return (
    <div className="grid w-full grid-cols-2 items-center border-b border-surface-light bg-foreground/20 px-4 py-2">
      {user ? (
        <div className="flex items-center gap-2">
          <Avatar size={50} seed={user.username} />
          <div className="flex flex-col gap-1">
            <p className="text-sm">{user.username}</p>
            <p className="text-[9px]  text-success">
              Level {progress?.level_id}
            </p>
          </div>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="icon" onClick={toggleMusic}>
          {musicAudioState.isOn ? (
            <IconMusic width={25} height={25} />
          ) : (
            <IconMusicOff width={25} height={25} />
          )}
        </Button>

        <Button variant="icon" onClick={toggleSfx}>
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
