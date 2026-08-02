import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { AuthProvider } from '../context/AuthContext';
import { GameAudioProvider } from '../context/GameAudioContext';
import { GameProvider } from '../context/GameContext';
import '../styles.css';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <AuthProvider>
        <GameProvider>
          <GameAudioProvider>
            <Outlet />
          </GameAudioProvider>
        </GameProvider>
      </AuthProvider>

      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}
