import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useGameAudio } from '../../context/GameAudioContext';
import { useGame } from '../../context/GameContext';
import { PixelSceneRenderer } from '../../PixelSceneRenderer';
import { AppMenu } from './_components/AppMenu/AppMenu';
import { SceneContent } from './_components/PixelScene/PixelScene';

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
      <div className="relative h-screen w-screen ">
        <PixelSceneRenderer>
          <SceneContent />
        </PixelSceneRenderer>
      </div>
      {isPlaying ? null : (
        <div className="absolute inset-x-0 bottom-0 z-10 flex w-full flex-col h-full items-center justify-center p-4 ">
          <AppMenu />
        </div>
      )}
    </div>
  );
}
