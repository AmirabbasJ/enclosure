import { useAuth } from '../../data/auth/useAuth';
import { useProgress } from '../../data/progress/useProgress';
import { Avatar } from '../../ui/avatar';
import { LoadingDots } from '../../ui/LoadingDots';
import { Level } from './Level';

export function UserProfile() {
  const { user, isLoading: userLoading } = useAuth();
  const { progress, isLoading: progressLoading } = useProgress();

  return !userLoading && user ? (
    <div className="flex items-center gap-2">
      <Avatar size={50} seed={user.username} />
      <div className="flex flex-col gap-1">
        <p className="text-sm">{user.username}</p>
        {progressLoading || !progress ? (
          <LoadingDots />
        ) : (
          <Level progress={progress} />
        )}
      </div>
    </div>
  ) : null;
}
