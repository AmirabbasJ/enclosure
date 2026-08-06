import type { LevelInput } from '#/domain/level';
import type { WallInput } from '#/domain/walls';

export const TUTORIAL_QUESTION: LevelInput = {
  orbs: [
    { kind: 'good', col: 0, row: 1 },
    { kind: 'good', col: 3, row: 1 },
    { kind: 'good', col: 3, row: 2 },
    { kind: 'good', col: 1, row: 3 },
  ],
  walls: [{ id: 'u', col: 3, row: 1, yawQuarters: 1 }],
};

export const TUTORIAL_ANSWER_WALLS = [
  { id: 'zigzagTall', col: 1, row: 0, yawQuarters: 2 },
  { id: 'steps', col: 2, row: 1, yawQuarters: 0 },
] as const satisfies readonly WallInput[];

export const TUTORIAL_ANSWER: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: [...(TUTORIAL_QUESTION.walls ?? []), ...TUTORIAL_ANSWER_WALLS],
};

export const TUTORIAL_SURROUND_WRONG: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: (TUTORIAL_ANSWER.walls ?? []).map((wall) =>
    wall.id === 'u'
      ? {
          ...wall,
          col: 2,
          row: -1,
          yawQuarters: 3,
        }
      : wall
  ),
};

export const TUTORIAL_RED_WRONG: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: (TUTORIAL_ANSWER.walls ?? []).map((wall) =>
    wall.id === 'u'
      ? {
          ...wall,
          col: 1,
          row: 2,
          yawQuarters: 1,
        }
      : wall
  ),
};

export const TUTORIAL_TOWER_WRONG: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: (TUTORIAL_ANSWER.walls ?? []).map((wall) =>
    wall.id === 'u'
      ? {
          ...wall,
          col: 3,
          row: 0,
          yawQuarters: 0,
        }
      : wall
  ),
};
