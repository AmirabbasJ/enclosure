import { useGame } from '@/context/GameContext';

import { MenuButton } from './components/MenuButton';

export function HelpMenu() {
  const { send, state } = useGame();
  const showTutorial = !state.matches('paused');

  return (
    <>
      <p className="mb-3 text-center text-base opacity-80">Help</p>
      <MenuButton onClick={() => send({ type: 'CONTROLS' })}>
        Controls
      </MenuButton>
      <MenuButton onClick={() => send({ type: 'RULES' })}>Rules</MenuButton>
      {showTutorial ? (
        <MenuButton onClick={() => send({ type: 'TUTORIAL' })}>
          Replay Tutorial
        </MenuButton>
      ) : null}
      <MenuButton onClick={() => send({ type: 'BACK' })}>Back</MenuButton>
    </>
  );
}
