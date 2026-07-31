import { createFileRoute } from '@tanstack/react-router';

import { SceneContent } from '../components/PixelScene';
import { PixelSceneRenderer } from '../PixelSceneRenderer';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--color-bg) text-(--color-text-light)">
      <div className="relative h-screen w-screen ">
        <PixelSceneRenderer>
          <SceneContent />
        </PixelSceneRenderer>
      </div>
    </div>
  );
}
