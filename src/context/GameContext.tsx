import type { PropsWithChildren } from 'react';

import { createContext, use, useMemo, useState } from 'react';

interface GameContextValue {
  started: boolean;
  start: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);
GameContext.displayName = 'GameContext';

export function GameProvider({ children }: PropsWithChildren) {
  const [started, setStarted] = useState(true);

  const value = useMemo(
    () => ({
      started,
      start: () => setStarted(true),
    }),
    [started]
  );

  return <GameContext value={value}>{children}</GameContext>;
}

export function useGame() {
  const ctx = use(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
