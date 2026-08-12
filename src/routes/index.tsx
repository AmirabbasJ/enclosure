import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import type { LevelInput } from '../domain/level';
import type { WallInput } from '../domain/walls';

import { useGameAudio } from '../context/GameAudioContext';
import { useGame } from '../context/GameContext';
import { useLevel } from '../data/levels/useLevel';
import { TUTORIAL_LEVEL_ID } from '../lib/machines/tutorialMachine';
import { AppMenu } from './-components/AppMenu/AppMenu';
import { GameScene } from './-components/GameScene/GameScene';
import { TutorialGame } from './-components/Tutorial/TutorialGame';

export const Route = createFileRoute('/')({
  component: Game,
});

interface SceneLevel {
  id: number;
  question: LevelInput;
}

function Game() {
  const { send, context, isShowingSolution, isGameSceneActive, state } =
    useGame();
  const { playMusic, playLevelComplete } = useGameAudio();
  const { level, completeLevelMutation } = useLevel();
  const [solvedLevel, setSolvedLevel] = useState<SceneLevel | null>(null);

  const sceneLevel = isShowingSolution && solvedLevel ? solvedLevel : level;

  const checkSolution = async (walls: WallInput[]) => {
    if (!sceneLevel) return;

    const isAllWallsPlaced = walls.length === 4;
    if (!isAllWallsPlaced || !level) return;

    const completed = level;
    const result = await completeLevelMutation.mutateAsync(walls);
    if (!result.isCorrect) return;

    setSolvedLevel(completed);
    playLevelComplete();
    send({
      type: 'LEVEL_COMPLETED',
      finished: result.progress.finished,
      levelId: completed.id,
    });
  };

  useEffect(() => {
    playMusic();
  }, [playMusic]);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 bg-bg text-text-light ">
      {context.isTutorial || context.completedLevelId === TUTORIAL_LEVEL_ID ? (
        <TutorialGame />
      ) : (
        <div className="fixed inset-x-0 top-0 h-svh w-screen items-center">
          {isGameSceneActive && sceneLevel ? (
            <GameScene
              key={sceneLevel.id}
              levelId={sceneLevel.id}
              level={sceneLevel.question}
              onWallsChange={checkSolution}
            />
          ) : null}
        </div>
      )}

      {!state.matches('playing') ? <AppMenu /> : null}
    </div>
  );
}
