import { useCallback, useEffect } from 'react';

import { useGame } from '@/context/GameContext';

import { useLevel } from '../../../data/levels/useLevel';
import { useMetadata } from '../../../data/metadata/useMetadata';
import { MenuBackgroundBlast } from './MenuBackgroundBlast';
import { MenuItems } from './MenuItems/MenuItems';
import { TopBar } from './TopBar';

export function AppMenu() {
  const {
    state,
    send,
    isGameSceneActive,
    isShowingSolution: showingSolution,
  } = useGame();
  const { commitPendingProgress } = useLevel();

  const goBack = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (state.matches('celebrating')) return;

      if (state.matches('paused')) {
        send({ type: 'PLAY' });
        return;
      }

      if (state.matches('levelCompleted') || state.matches('gameCompleted')) {
        send({ type: 'BACK' });
        commitPendingProgress();
        return;
      }

      send({ type: 'BACK' });
    },
    [commitPendingProgress, send, state]
  );

  useEffect(() => {
    window.addEventListener('keydown', goBack);

    return () => {
      window.removeEventListener('keydown', goBack);
    };
  }, [goBack]);
  useMetadata();

  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex h-full w-full flex-col items-center pb-2 ${
        showingSolution ? '' : 'backdrop-blur-xs'
      }`}
    >
      <div className="relative flex h-full w-full flex-col items-center">
        {!showingSolution ? <TopBar /> : null}
        <div
          className={`relative flex h-full w-full flex-col items-center gap-4 ${
            showingSolution
              ? state.matches('celebrating')
                ? 'justify-start pt-16'
                : 'justify-end'
              : 'justify-center'
          }`}
        >
          {!isGameSceneActive ? (
            <div className="absolute w-full h-full blur-[3px]">
              <MenuBackgroundBlast />
            </div>
          ) : null}
          <div className="z-2">
            {state.matches('mainMenu') && (
              <div className="flex flex-col items-center gap-1">
                <h1 className="title-shadow text-center font-pixel text-[38px] tracking-[3px] text-accent-hover">
                  EN<span className="text-accent">CLOSURE</span>
                </h1>
                <p
                  className="max-w-75 text-center font-pixel text-[9px] text-text-light"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  are we being protected, or are we being contained?
                </p>
              </div>
            )}
            <div className="flex max-w-120 flex-col justify-center gap-3 p-3 ">
              <MenuItems />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
