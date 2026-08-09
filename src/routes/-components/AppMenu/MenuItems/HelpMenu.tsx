import { useGame } from '@/context/GameContext';

import { MenuButton } from './components/MenuButton';

export function HelpMenu() {
  const { send } = useGame();

  return (
    <>
      <p className="mb-3 text-center text-base opacity-80">Help</p>
      <MenuButton onClick={() => send({ type: 'CONTROLS' })}>
        Controls
      </MenuButton>
      <MenuButton onClick={() => send({ type: 'RULES' })}>Rules</MenuButton>
      <MenuButton onClick={() => send({ type: 'TUTORIAL' })}>
        Replay Tutorial
      </MenuButton>
      <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
    </>
  );
}
