import { useState } from 'react';

import type { WallInput } from '@/domain/walls';

import { useGameAudio } from '@/context/GameAudioContext';
import { useGame } from '@/context/GameContext';
import {
  TUTORIAL_ANSWER,
  TUTORIAL_QUESTION,
  TUTORIAL_STEPS_ANSWER,
  TUTORIAL_ZIGZAG_ANSWER,
} from '@/domain/tutorialLevel';
import { compareWalls } from '@/domain/walls';
import { PixelSceneRenderer } from '@/PixelSceneRenderer';

import type { TutorialStep } from './TutorialGuide';

import { GameScene } from '../GameScene/GameScene';
import { TutorialGuide } from './TutorialGuide';

export const TUTORIAL_LEVEL_ID = -1;

function matchesWall(placed: WallInput | undefined, answer: WallInput) {
  if (!placed) return false;
  return (
    placed.col === answer.col &&
    placed.row === answer.row &&
    placed.yawQuarters === answer.yawQuarters
  );
}

export function TutorialGame() {
  const { state, send } = useGame();
  const { playLevelComplete } = useGameAudio();
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('rotateBoard');

  const isLevelCleared =
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');

  const inScene =
    state.matches('playing') || state.matches('paused') || isLevelCleared;

  const allowedWallIds = isLevelCleared
    ? null
    : tutorialStep === 'placeSteps'
      ? (['steps'] as const)
      : tutorialStep === 'placeZigzag'
        ? (['zigzagTall'] as const)
        : ([] as const);

  const dropHintWall = isLevelCleared
    ? null
    : tutorialStep === 'placeSteps'
      ? TUTORIAL_STEPS_ANSWER
      : tutorialStep === 'placeZigzag'
        ? TUTORIAL_ZIGZAG_ANSWER
        : null;

  const checkSolution = (walls: WallInput[]) => {
    const stepsPlaced = walls.find((wall) => wall.id === 'steps');
    const zigzagPlaced = walls.find((wall) => wall.id === 'zigzagTall');

    if (
      tutorialStep === 'placeSteps' &&
      matchesWall(stepsPlaced, TUTORIAL_STEPS_ANSWER)
    ) {
      setTutorialStep('placeZigzag');
      return;
    }

    if (tutorialStep !== 'placeZigzag') return;
    if (!matchesWall(zigzagPlaced, TUTORIAL_ZIGZAG_ANSWER)) return;
    if (!compareWalls(TUTORIAL_ANSWER.walls ?? [], walls)) return;

    playLevelComplete();
    send({
      type: 'LEVEL_COMPLETED',
      finished: false,
      levelId: TUTORIAL_LEVEL_ID,
    });
  };

  return (
    <>
      <div className="items-center h-screen w-screen">
        {inScene ? (
          <PixelSceneRenderer key={TUTORIAL_LEVEL_ID}>
            <GameScene
              onWallsChange={checkSolution}
              level={TUTORIAL_QUESTION}
              allowedWallIds={allowedWallIds}
              dropHintWall={dropHintWall}
              onBoardRotated={
                tutorialStep === 'rotateBoard'
                  ? () => setTutorialStep('goal')
                  : undefined
              }
            />
          </PixelSceneRenderer>
        ) : null}
      </div>

      {state.matches('playing') ? (
        <TutorialGuide
          step={tutorialStep}
          onContinue={() => setTutorialStep('placeSteps')}
        />
      ) : null}
    </>
  );
}
