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
import { getCurrentUserFn } from '../data/auth/auth.functions';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';
import appCss from '../styles.css?url';

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootProviders,
  shellComponent: RootDocument,
  beforeLoad: async () => {
    const [currentUserData, audioState] = await Promise.all([
      getCurrentUserFn(),
      getAudioStateFn(),
    ]);

    const { metadata, user } = currentUserData;
    return { user, metadata, audioState };
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
