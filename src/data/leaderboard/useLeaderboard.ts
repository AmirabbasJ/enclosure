import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';

import { queryKeys } from '../queryKeys';
import { getLeaderboardFn } from './leaderboard.functions';

export function useLeaderboard() {
  const getLeaderboard = useServerFn(getLeaderboardFn);

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: queryKeys.leaderboard.list.queryKey,
    queryFn: () => getLeaderboard(),
  });

  return { leaderboard, isLoading: isLoading as boolean };
}
