import type { LevelInput } from '#/domain/level';
import type { WallInput, YawQuarters } from '#/domain/walls';

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
] as const satisfies readonly WallInput[];

export const TUTORIAL_ANSWER: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: [...(TUTORIAL_QUESTION.walls ?? []), ...TUTORIAL_ANSWER_WALLS],
};

/** Solution with u moved/spun — blue knights not fully enclosed. */
export const TUTORIAL_SURROUND_WRONG: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: (TUTORIAL_ANSWER.walls ?? []).map((wall) =>
    wall.id === 'u'
      ? {
          ...wall,
          col: 4,
          row: 0,
          yawQuarters: ((wall.yawQuarters + 2) % 4) as YawQuarters,
        }
      : wall
  ),
};

/**
 * Solution but zigzagTall yaw 0 — seals left opening around red (1,1).
 * Snake already covers top/right/bottom of that tile.
 */
export const TUTORIAL_RED_WRONG: LevelInput = {
  orbs: TUTORIAL_QUESTION.orbs,
  walls: (TUTORIAL_ANSWER.walls ?? []).map((wall) =>
    wall.id === 'u'
      ? {
          ...wall,
          col: 1,
          row: 2,
          yawQuarters: ((wall.yawQuarters + 1) % 4) as YawQuarters,
        }
      : wall
  ),
};
