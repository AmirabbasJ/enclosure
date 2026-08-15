import type { QueryClient } from '@tanstack/react-query';

import { TanStackDevtools } from '@tanstack/react-devtools';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { GameAudioProvider } from '../context/GameAudioContext';
import { GameProvider } from '../context/GameContext';
import { getAudioStateFn } from '../data/audio/audio.functions';
import { queryKeys } from '../data/queries';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';
import { rootHead } from './-metadata';

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => rootHead,
  component: RootProviders,
  shellComponent: RootDocument,
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(queryKeys.user.me);
    await queryClient.ensureQueryData(queryKeys.user.metadata);
    const progress = await queryClient.ensureQueryData(queryKeys.user.progress);

    if (progress?.level_id != null && !progress.finished) {
      await queryClient.ensureQueryData(
        queryKeys.user.level(progress.level_id)
      );
    }

    const audioState = await getAudioStateFn();
    return { audioState };
  },
});

function RootProviders() {
  const { audioState } = Route.useRouteContext();

  return (
    <GameProvider>
      <GameAudioProvider initialAudioState={audioState}>
        <Outlet />
      </GameAudioProvider>
    </GameProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="m-0  font-pixel text-text-light">
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
