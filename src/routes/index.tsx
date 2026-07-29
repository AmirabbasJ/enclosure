import { createFileRoute } from '@tanstack/react-router';
import { PixelSceneRenderer } from '../PixelSceneRenderer';
import { SceneContent } from '../components/PixelScene';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-void)] text-neutral-100">
      <div className="h-screen w-screen overflow-hidden rounded border border-white/10">
        <PixelSceneRenderer>
          <SceneContent />
        </PixelSceneRenderer>
      </div>
    </div>
  );
}
