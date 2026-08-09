import { useGame } from '@/context/GameContext';

import { MenuButton } from './components/MenuButton';

export function MainMenu() {
  const { send } = useGame();

  return (
    <>
      <MenuButton onClick={() => send({ type: 'PLAY' })}>Play</MenuButton>
      <MenuButton onClick={() => send({ type: 'HELP' })}>Help</MenuButton>
      <MenuButton
        onClick={() => {
          send({ type: 'PROFILE' });
        }}
      >
        Profile
      </MenuButton>
      <MenuButton onClick={() => send({ type: 'LEADERBOARD' })}>
        Leaderboard
      </MenuButton>
      <MenuButton onClick={() => send({ type: 'SETTINGS' })}>
        Settings
      </MenuButton>
    </>
  );
}
