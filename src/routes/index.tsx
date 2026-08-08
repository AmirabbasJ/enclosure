import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

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

function Game() {
  const { state, send } = useGame();
  const { playMusic } = useGameAudio();
  const { level, completeLevelMutation } = useLevel();
  const started = state.matches('playing') || state.matches('paused');
  const showMenu = !state.matches('playing');

  const checkSolution = async (walls: WallInput[]) => {
    const isAllWallsPlaced = walls.length === 4;

    if (!isAllWallsPlaced) {
      return;
    }

    const { isCorrect, progress } =
      await completeLevelMutation.mutateAsync(walls);
    if (!isCorrect) return;

    send({ type: 'LEVEL_COMPLETED', finished: progress.finished });
  };

  useEffect(() => {
    playMusic();
  }, [playMusic]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text-light ">
      <div className=" items-center h-screen w-screen">
        {started && level ? (
          <PixelSceneRenderer>
            <GameScene
              key={level.id}
              onWallsChange={checkSolution}
              level={level.question}
            />
          </PixelSceneRenderer>
        ) : null}
      </div>

      {showMenu ? <AppMenu /> : null}
    </div>
  );
}
