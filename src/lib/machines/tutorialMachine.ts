import { assign, emit, setup } from 'xstate';

import type { WallId, WallInput } from '#/domain/walls';

import {
  TUTORIAL_ANSWER,
  TUTORIAL_STEPS_ANSWER,
  TUTORIAL_ZIGZAG_ANSWER,
} from '#/domain/tutorialLevel';
import { compareWalls } from '#/domain/walls';

export const TUTORIAL_LEVEL_ID = -1;

export type TutorialStep =
  | 'goal'
  | 'placeSteps'
  | 'placeZigzag'
  | 'rotateBoard'
  | 'toggleTopDown'
  | 'solved';

export type TutorialEvent =
  | { type: 'BOARD_ROTATED' }
  | { type: 'VIEW_TOGGLED' }
  | { type: 'CONTINUE' }
  | { type: 'WALLS_CHANGED'; walls: WallInput[] };

export interface TutorialMachineContext {
  allowedWallIds: readonly WallId[] | null;
  dropHintWall: WallInput | null;
}

function matchesWall(placed: WallInput | undefined, answer: WallInput) {
  if (!placed) return false;
  return (
    placed.col === answer.col &&
    placed.row === answer.row &&
    placed.yawQuarters === answer.yawQuarters
  );
}

export const tutorialMachine = setup({
  types: {
    context: {} as TutorialMachineContext,
    events: {} as TutorialEvent,
    emitted: {} as { type: 'SOLVED' },
  },
  guards: {
    isStepsPlaced: ({ event }) =>
      event.type === 'WALLS_CHANGED' &&
      matchesWall(
        event.walls.find((wall) => wall.id === 'steps'),
        TUTORIAL_STEPS_ANSWER
      ),
    isSolved: ({ event }) =>
      event.type === 'WALLS_CHANGED' &&
      matchesWall(
        event.walls.find((wall) => wall.id === 'zigzagTall'),
        TUTORIAL_ZIGZAG_ANSWER
      ) &&
      compareWalls(TUTORIAL_ANSWER.walls ?? [], event.walls),
  },
  actions: {
    lockWallsToNone: assign({
      allowedWallIds: [] as readonly WallId[],
      dropHintWall: null,
    }),
    lockWallsToSteps: assign({
      allowedWallIds: ['steps'] as readonly WallId[],
      dropHintWall: TUTORIAL_STEPS_ANSWER,
    }),
    lockWallsToZigzag: assign({
      allowedWallIds: ['zigzagTall'] as readonly WallId[],
      dropHintWall: TUTORIAL_ZIGZAG_ANSWER,
    }),
    unlockWalls: assign({ allowedWallIds: null, dropHintWall: null }),
  },
}).createMachine({
  id: 'tutorial',
  initial: 'rotateBoard',
  context: {
    allowedWallIds: [],
    dropHintWall: null,
  },
  states: {
    rotateBoard: {
      entry: 'lockWallsToNone',
      on: {
        BOARD_ROTATED: { target: 'toggleTopDown' },
      },
    },

    toggleTopDown: {
      entry: 'lockWallsToNone',
      on: {
        VIEW_TOGGLED: { target: 'goal' },
      },
    },

    goal: {
      entry: 'lockWallsToNone',
      on: {
        CONTINUE: { target: 'placeSteps' },
      },
    },

    placeSteps: {
      entry: 'lockWallsToSteps',
      on: {
        WALLS_CHANGED: {
          guard: 'isStepsPlaced',
          target: 'placeZigzag',
        },
      },
    },

    placeZigzag: {
      entry: 'lockWallsToZigzag',
      on: {
        WALLS_CHANGED: {
          guard: 'isSolved',
          target: 'solved',
        },
      },
    },

    solved: {
      type: 'final',
      entry: ['unlockWalls', emit({ type: 'SOLVED' })],
    },
  },
});

export type TutorialMachine = typeof tutorialMachine;
