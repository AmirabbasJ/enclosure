import { createFileRoute } from '@tanstack/react-router';

import { PixelSceneRenderer } from '../../PixelSceneRenderer';
import { AppMenu } from './_components/AppMenu/AppMenu';
import { SceneContent } from './_components/PixelScene/PixelScene';

export const Route = createFileRoute('/(game)/')({
  component: Game,
});

function Game() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text-light">
      <div className="relative h-screen w-screen ">
        <PixelSceneRenderer>
          <SceneContent />
        </PixelSceneRenderer>
      </div>
      <AppMenu />
    </div>
  );
}
