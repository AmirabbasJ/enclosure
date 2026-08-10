import { useEffect, useRef } from 'react';

import { useGame } from '@/context/GameContext';
import { useAuth } from '@/data/auth/useAuth';
import { useLeaderboard } from '@/data/leaderboard/useLeaderboard';
import { Avatar } from '@/ui/avatar';
import { LoadingDots } from '@/ui/LoadingDots';

import { MenuButton } from './components/MenuButton';

export function LeaderboardMenu() {
  const { send } = useGame();
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
      <div className="min-w-75 w-full bg-foreground pixelated p-3 ">
        <div className="leaderboard-scroll pe-3 flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
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
      </div>
      <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
    </div>
  );
}
