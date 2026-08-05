import type { ReactNode } from 'react';

export interface TutorialPage {
  id: (typeof tutorialPages)[number]['id'];
  text: ReactNode;
}

export const tutorialPages = [
  {
    id: 'goal',
    text: (
      <>
        Position the walls using the indents in the board as a guideline, so
        that the <span className="font-bold text-danger">red cones</span> stay
        outside and the <span className="font-bold text-accent">blue orbs</span>{' '}
        remain enclosed.
      </>
    ),
  },
  {
    id: 'surround',
    text: (
      <>
        A <span className="font-bold text-accent">blue orb</span> is safe only
        when surrounded by walls on all sides.
      </>
    ),
  },
  {
    id: 'redOpen',
    text: (
      <>
        <span className="font-bold text-danger">Red cones</span> must never be
        totally surrounded by walls. They can sit in a partially enclosed area,
        as long as a wall has an opening on at least one side.
      </>
    ),
  },
  {
    id: 'meetTower',
    text: 'You can place two walls to meet each other where the indents cross, but you cannot place a wall against a tower as it will not fit.',
  },
  {
    id: 'controls',
    text: 'Drag a wall to place it, or select one and use the keys above.',
  },
] as const;
