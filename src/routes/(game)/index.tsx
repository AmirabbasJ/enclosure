import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useGameAudio } from '../../context/GameAudioContext';
import { useGame } from '../../context/GameContext';
import { TUTORIAL_QUESTION } from '../../domain/tutorialLevel';
import { PixelSceneRenderer } from '../../PixelSceneRenderer';
import { AppMenu } from './-components/AppMenu/AppMenu';
import { GameScene } from './-components/GameScene/GameScene';

export const Route = createFileRoute('/(game)/')({
  component: Game,
});

function Game() {
  const { state } = useGame();
  const { playMusic } = useGameAudio();
  const started = state.matches('playing') || state.matches('paused');
  const showMenu = !state.matches('playing');

  useEffect(() => {
    playMusic();
  }, [playMusic]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text-light ">
      <div className=" items-center h-screen w-screen">
        {started ? (
          <PixelSceneRenderer>
            <GameScene level={TUTORIAL_QUESTION} />
          </PixelSceneRenderer>
        ) : null}
      </div>
      {showMenu ? <AppMenu /> : null}
    </div>
  );
}
