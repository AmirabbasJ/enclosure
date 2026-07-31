import { BOARD_BASE_SIZE } from '#/domain/board';
import { TILE_SPACING } from '#/domain/tiles';

export const WALL_HEIGHT = 0.55;
export const WALL_THICKNESS = 0.12;

export const WALL_OFFSET_X = BOARD_BASE_SIZE[0] / 2 + TILE_SPACING + 0.5;
export const WALL_OFFSET_Z = BOARD_BASE_SIZE[2] / 2 + TILE_SPACING + 0.5;

export const WALL_DRAG_HALF_X = WALL_OFFSET_X;
export const WALL_DRAG_HALF_Z = WALL_OFFSET_Z;

export const GROOVE_SNAP_DIST = TILE_SPACING * 0.4;

export type WallDir = 'D' | 'L' | 'R' | 'U';

export const DIR_DELTA: Record<WallDir, readonly [number, number]> = {
  D: [0, 1],
  L: [-1, 0],
  U: [0, -1],
  R: [1, 0],
};

export const WALL_PATHS = {
  u: ['D', 'L', 'U'] as const satisfies readonly WallDir[],
  zigzagTall: ['D', 'L', 'U', 'L', 'U'] as const satisfies readonly WallDir[],
  snake: ['D', 'L', 'U', 'L', 'D', 'L'] as const satisfies readonly WallDir[],
  steps: ['D', 'L', 'D', 'L'] as const satisfies readonly WallDir[],
} as const;

export type WallPathKey = keyof typeof WALL_PATHS;

interface WallPiece {
  id: string;
  path: readonly WallDir[];
  position: [number, number, number];
  yaw: number;
}

export const WALLS: WallPiece[] = [
  {
    id: 'u',
    path: WALL_PATHS.u,
    position: [-WALL_OFFSET_X, 0, -WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'zigzagTall',
    path: WALL_PATHS.zigzagTall,
    position: [WALL_OFFSET_X, 0, -WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'snake',
    path: WALL_PATHS.snake,
    position: [-WALL_OFFSET_X, 0, WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'steps',
    path: WALL_PATHS.steps,
    position: [WALL_OFFSET_X, 0, WALL_OFFSET_Z],
    yaw: 0,
  },
];

export const wallToNumberKeyMap: Record<string, string> = {
  '1': WALLS[0].id,
  '2': WALLS[3].id,
  '3': WALLS[2].id,
  '4': WALLS[1].id,
};
