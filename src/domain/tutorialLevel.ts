import type { LevelInput } from '#/domain/level';

/** Starting board shown in menu + tutorial question. */
export const TUTORIAL_QUESTION: LevelInput = {
  orbs: [
    { kind: 'good', col: 1, row: 0 },
    { kind: 'good', col: 2, row: 1 },
    { kind: 'good', col: 3, row: 0 },
    { kind: 'bad', col: 1, row: 1 },
  ],
  walls: [
    { id: 'u', col: 3, row: 1, yawQuarters: 2 },
    { id: 'snake', col: 1, row: 1, yawQuarters: 1 },
  ],
};

/** Solved placement of the free walls. */
export const TUTORIAL_ANSWER_WALLS = [
  { id: 'zigzagTall', col: 1, row: 1, yawQuarters: 2 },
  { id: 'steps', col: 4, row: 1, yawQuarters: 0 },
] as const;

export const TUTORIAL_ANSWER: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: [...(TUTORIAL_QUESTION.walls ?? []), ...TUTORIAL_ANSWER_WALLS],
};
