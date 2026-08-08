import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import type { LevelInput } from '../domain/level';
import type { WallInput } from '../domain/walls';

import { useGameAudio } from '../context/GameAudioContext';
import { useGame } from '../context/GameContext';
import { useLevel } from '../data/levels/useLevel';
import { PixelSceneRenderer } from '../PixelSceneRenderer';
import { AppMenu } from './-components/AppMenu/AppMenu';
import { GameScene } from './-components/GameScene/GameScene';

export const Route = createFileRoute('/')({
  component: Game,
});

interface SceneLevel {
  id: number;
  question: LevelInput;
}

function Game() {
  const { state, send } = useGame();
  const { playMusic, playLevelComplete } = useGameAudio();
  const { level, completeLevelMutation } = useLevel();
  const [solvedLevel, setSolvedLevel] = useState<SceneLevel | null>(null);

  const showingSolution =
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');
  const inScene =
    state.matches('playing') || state.matches('paused') || showingSolution;
  const showMenu = !state.matches('playing');
  const sceneLevel = showingSolution && solvedLevel ? solvedLevel : level;

  const checkSolution = async (walls: WallInput[]) => {
    const isAllWallsPlaced = walls.length === 4;

    if (!isAllWallsPlaced || !level) {
      return;
    }

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
            />
          </PixelSceneRenderer>
        ) : null}
      </div>

      {showMenu ? <AppMenu /> : null}
    </div>
  );
}
