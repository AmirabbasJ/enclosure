import { useMachine } from '@xstate/react';
import { useEffect, useRef } from 'react';

import { useGameAudio } from '@/context/GameAudioContext';
import { useGame } from '@/context/GameContext';
import { TUTORIAL_QUESTION } from '@/domain/tutorialLevel';
import {
  TUTORIAL_LEVEL_ID,
  tutorialMachine,
} from '@/lib/machines/tutorialMachine';

import { GameScene } from '../GameScene/GameScene';
import { TutorialGuide } from './TutorialGuide';

export function TutorialGame() {
  const { state, send } = useGame();
  const { playLevelComplete } = useGameAudio();
  const [tutorialState, tutorialSend, tutorialActor] =
    useMachine(tutorialMachine);

  const completeTutorialRef = useRef<VoidFunction>(() => undefined);

  completeTutorialRef.current = () => {
    playLevelComplete();
    send({
      type: 'LEVEL_COMPLETED',
      finished: false,
      levelId: TUTORIAL_LEVEL_ID,
    });
  };

  useEffect(() => {
    const subscription = tutorialActor.on('SOLVED', () => {
      completeTutorialRef.current();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [tutorialActor]);

  const isLevelCleared =
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');

  const inScene =
    state.matches('playing') || state.matches('paused') || isLevelCleared;

  const { allowedWallIds, dropHintWall } = tutorialState.context;

  return (
    <>
      <div className="items-center h-screen w-screen">
        {inScene ? (
          <GameScene
            key={TUTORIAL_LEVEL_ID}
            levelId={TUTORIAL_LEVEL_ID}
            level={TUTORIAL_QUESTION}
            onWallsChange={(walls) =>
              tutorialSend({ type: 'WALLS_CHANGED', walls })
            }
            allowedWallIds={allowedWallIds}
            dropHintWall={dropHintWall}
            onBoardRotated={() => tutorialSend({ type: 'BOARD_ROTATED' })}
            onViewToggled={() => tutorialSend({ type: 'VIEW_TOGGLED' })}
          />
        ) : null}
      </div>

      {state.matches('playing') ? (
        <TutorialGuide
          step={tutorialState.value}
          onContinue={() => tutorialSend({ type: 'CONTINUE' })}
        />
      ) : null}
    </>
  );
}
