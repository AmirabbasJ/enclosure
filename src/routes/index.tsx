import { createFileRoute } from '@tanstack/react-router';

import { SceneContent } from '../components/PixelScene';
import { GameAudioProvider } from '../context/GameAudioContext';
import { GameProvider } from '../context/GameContext';
import { PixelSceneRenderer } from '../PixelSceneRenderer';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <GameProvider>
      <GameAudioProvider>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--color-void) text-neutral-100">
          <div className="relative h-screen w-screen overflow-hidden rounded border border-white/10">
            <PixelSceneRenderer>
              <SceneContent />
            </PixelSceneRenderer>
          </div>
        </div>
      </GameAudioProvider>
    </GameProvider>
  );
}
