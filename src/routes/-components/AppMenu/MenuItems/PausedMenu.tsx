import { useGame } from '@/context/GameContext';

import { MenuButton } from './components/MenuButton';

export function PausedMenu() {
  const { send } = useGame();

  return (
    <>
      <p className="mb-3 text-center text-base opacity-80">Paused</p>
      <MenuButton onClick={() => send({ type: 'PLAY' })}>Resume</MenuButton>
      <MenuButton onClick={() => send({ type: 'SETTINGS' })}>
        Settings
      </MenuButton>
      <MenuButton onClick={() => send({ type: 'HELP' })}>Help</MenuButton>
      <MenuButton onClick={() => send({ type: 'BACK' })}>Main Menu</MenuButton>
    </>
  );
}
