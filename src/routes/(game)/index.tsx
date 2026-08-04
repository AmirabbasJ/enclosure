import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useGameAudio } from '../../context/GameAudioContext';
import { useGame } from '../../context/GameContext';
import { TUTORIAL_QUESTION } from '../../domain/tutorialLevel';
import { PixelSceneRenderer } from '../../PixelSceneRenderer';
import { AppMenu } from './-components/AppMenu/AppMenu';
import { SceneContent } from './-components/PixelScene/PixelScene';

export const Route = createFileRoute('/(game)/')({
  component: Game,
});

function Game() {
  const { isPlaying } = useGame();
  const { playMusic } = useGameAudio();

  useEffect(() => {
    playMusic();
  }, [playMusic]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text-light ">
      <div className=" items-center h-screen w-screen">
        <PixelSceneRenderer>
          <SceneContent level={TUTORIAL_QUESTION} />
        </PixelSceneRenderer>
      </div>
      {isPlaying ? null : <AppMenu />}
    </div>
  );
}
