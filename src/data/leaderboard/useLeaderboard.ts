import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queries';

export function useLeaderboard() {
  const { data: leaderboard = [], isLoading } = useQuery({
    ...queryKeys.leaderboard.list,
  });

  return { leaderboard, isLoading: isLoading as boolean };
}
