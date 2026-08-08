import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import type { LevelInput } from '../domain/level';
import type { WallInput } from '../domain/walls';
import type { TutorialStep } from './-components/Tutorial/TutorialGuide';

import { useGameAudio } from '../context/GameAudioContext';
import { useGame } from '../context/GameContext';
import { useLevel } from '../data/levels/useLevel';
import {
  TUTORIAL_ANSWER,
  TUTORIAL_QUESTION,
  TUTORIAL_STEPS_ANSWER,
  TUTORIAL_ZIGZAG_ANSWER,
} from '../domain/tutorialLevel';
import { compareWalls } from '../domain/walls';
import { PixelSceneRenderer } from '../PixelSceneRenderer';
import { AppMenu } from './-components/AppMenu/AppMenu';
import { GameScene } from './-components/GameScene/GameScene';
import { TutorialGuide } from './-components/Tutorial/TutorialGuide';

export const Route = createFileRoute('/')({
  component: Game,
});

interface SceneLevel {
  id: number;
  question: LevelInput;
}

const TUTORIAL_SCENE: SceneLevel = {
  id: -1,
  question: TUTORIAL_QUESTION,
};

function matchesWall(placed: WallInput | undefined, answer: WallInput) {
  if (!placed) return false;
  return (
    placed.col === answer.col &&
    placed.row === answer.row &&
    placed.yawQuarters === answer.yawQuarters
  );
}

function Game() {
  const { state, send, context } = useGame();
  const { playMusic, playLevelComplete } = useGameAudio();
  const { level, completeLevelMutation } = useLevel();
  const [solvedLevel, setSolvedLevel] = useState<SceneLevel | null>(null);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('rotateBoard');

  const { isTutorial } = context;
  const showingSolution =
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');
  const inScene =
    state.matches('playing') || state.matches('paused') || showingSolution;
  const showMenu = !state.matches('playing');
  const sceneLevel = isTutorial
    ? TUTORIAL_SCENE
    : showingSolution && solvedLevel
      ? solvedLevel
      : level;

  const tutorialAllowedWallIds =
    !isTutorial || showingSolution
      ? null
      : tutorialStep === 'placeSteps'
        ? (['steps'] as const)
        : tutorialStep === 'placeZigzag'
          ? (['zigzagTall'] as const)
          : ([] as const);

  const tutorialDropHint =
    isTutorial && !showingSolution
      ? tutorialStep === 'placeSteps'
        ? TUTORIAL_STEPS_ANSWER
        : tutorialStep === 'placeZigzag'
          ? TUTORIAL_ZIGZAG_ANSWER
          : null
      : null;

  const checkSolution = async (walls: WallInput[]) => {
    if (!sceneLevel) return;

    if (isTutorial) {
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

      setSolvedLevel(TUTORIAL_SCENE);
      playLevelComplete();
      send({ type: 'LEVEL_COMPLETED', finished: false });
      return;
    }

    const isAllWallsPlaced = walls.length === 4;
    if (!isAllWallsPlaced || !level) return;

    const completed = level;
    const result = await completeLevelMutation.mutateAsync(walls);
    if (!result.isCorrect) return;

    setSolvedLevel(completed);
    playLevelComplete();
    send({ type: 'LEVEL_COMPLETED', finished: result.progress.finished });
  };

  useEffect(() => {
    if (!showingSolution) setSolvedLevel(null);
  }, [showingSolution]);

  useEffect(() => {
    if (isTutorial) setTutorialStep('rotateBoard');
  }, [isTutorial]);

  useEffect(() => {
    playMusic();
  }, [playMusic]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text-light ">
      <div className=" items-center h-screen w-screen">
        {inScene && sceneLevel ? (
          <PixelSceneRenderer key={sceneLevel.id}>
            <GameScene
              onWallsChange={checkSolution}
              level={sceneLevel.question}
              allowedWallIds={tutorialAllowedWallIds}
              dropHintWall={tutorialDropHint}
              onBoardRotated={
                isTutorial && tutorialStep === 'rotateBoard'
                  ? () => setTutorialStep('goal')
                  : undefined
              }
            />
          </PixelSceneRenderer>
        ) : null}
      </div>

      {isTutorial && state.matches('playing') ? (
        <TutorialGuide
          step={tutorialStep}
          onContinue={() => setTutorialStep('placeSteps')}
        />
      ) : null}

      {showMenu ? <AppMenu /> : null}
    </div>
  );
}
