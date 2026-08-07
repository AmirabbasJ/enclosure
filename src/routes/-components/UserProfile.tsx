import { useAuth } from '../../data/auth/useAuth';
import { useProgress } from '../../data/progress/useProgress';
import { Avatar } from '../../ui/avatar';
import { LoadingDots } from '../../ui/LoadingDots';

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
          <p className="text-[9px]  text-success">Level {progress!.level_id}</p>
        )}
      </div>
    </div>
  ) : null;
}
