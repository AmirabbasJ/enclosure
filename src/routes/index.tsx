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
  const { state } = useGame();
  const { playMusic } = useGameAudio();
  const { level, checkLevelCompletionMutation } = useLevel();
  const started = state.matches('playing') || state.matches('paused');
  const showMenu = !state.matches('playing');

  const onWallsChange = async (walls: WallInput[]) => {
    const isAllWallsPlaced = walls.length === 4;

    if (!isAllWallsPlaced) {
      console.log('not all walls placed');
      return;
    }

    const isCorrect = await checkLevelCompletionMutation.mutateAsync(walls);

    if (isCorrect) {
      console.log('correct');
    } else {
      console.log('incorrect');
    }
  };

  useEffect(() => {
    playMusic();
  }, [playMusic]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text-light ">
      <div className=" items-center h-screen w-screen">
        {started && level ? (
          <PixelSceneRenderer>
            <GameScene onWallsChange={onWallsChange} level={level.question} />
          </PixelSceneRenderer>
        ) : null}
      </div>

      {showMenu ? <AppMenu /> : null}
    </div>
  );
}
