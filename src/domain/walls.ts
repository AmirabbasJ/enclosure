import { BOARD_BASE_SIZE, snapWallOriginToGrooves } from '#/domain/board';
import { cellToWorld } from '#/domain/coords';
import { CELL_SIZE, TILE_SPACING, TILE_THICKNESS } from '#/domain/tiles';

export const WALL_HEIGHT = 0.55;
export const WALL_THICKNESS = 0.12;

export const WALL_OFFSET_X = BOARD_BASE_SIZE[0] / 2 + TILE_SPACING + 0.5;
export const WALL_OFFSET_Z = BOARD_BASE_SIZE[2] / 2 + TILE_SPACING + 0.5;

export const WALL_DRAG_HALF_X = WALL_OFFSET_X;
export const WALL_DRAG_HALF_Z = WALL_OFFSET_Z;

export const GROOVE_SNAP_DIST = TILE_SPACING * 0.4;

export type WallDir = 'D' | 'L' | 'R' | 'U';

export type YawQuarters = 0 | 1 | 2 | 3;

export type WallId = 'snake' | 'steps' | 'u' | 'zigzagTall';

export interface WallInput {
  id: WallId;
  /** Tile whose min-X/min-Z corner is the wall path origin. */
  col: number;
  row: number;
  yawQuarters: YawQuarters;
}

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

export interface WallPiece {
  id: WallId;
  path: readonly WallDir[];
  position: [number, number, number];
  yaw: number;
}

export interface WallSegFootprint {
  x: number;
  z: number;
  horizontal: boolean;
}

export function yawFromQuarters(yawQuarters: YawQuarters): number {
  return yawQuarters * (Math.PI / 2);
}

export function getWallFootprints(
  path: readonly WallDir[],
  cellSize = CELL_SIZE
): {
  footprints: WallSegFootprint[];
  centerOffset: { x: number; z: number };
} {
  let x = 0;
  let z = 0;
  const footprints: WallSegFootprint[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const dir of path) {
    const [dx, dz] = DIR_DELTA[dir];
    const nx = x + dx * cellSize;
    const nz = z + dz * cellSize;
    const cx = (x + nx) / 2;
    const cz = (z + nz) / 2;
    const horizontal = dx !== 0;
    const sx = horizontal ? cellSize - TILE_THICKNESS : TILE_THICKNESS;
    const sz = horizontal ? TILE_THICKNESS : cellSize - TILE_THICKNESS;

    footprints.push({ x: cx, z: cz, horizontal });
    minX = Math.min(minX, cx - sx / 2);
    maxX = Math.max(maxX, cx + sx / 2);
    minZ = Math.min(minZ, cz - sz / 2);
    maxZ = Math.max(maxZ, cz + sz / 2);

    x = nx;
    z = nz;
  }

  return {
    footprints,
    centerOffset: {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    },
  };
}

export function wallOriginFromCenter({
  cx,
  cz,
  yaw,
  centerOffset,
}: {
  cx: number;
  cz: number;
  yaw: number;
  centerOffset: { x: number; z: number };
}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rx = centerOffset.x * c + centerOffset.z * s;
  const rz = -centerOffset.x * s + centerOffset.z * c;
  return { originX: cx - rx, originZ: cz - rz };
}

/** Path origin at min-X/min-Z corner of tile (col, row); position = wall center. */
export function wallCenterFromCell({
  path,
  col,
  row,
  yaw,
}: {
  path: readonly WallDir[];
  col: number;
  row: number;
  yaw: number;
}): [number, number, number] {
  const { footprints, centerOffset } = getWallFootprints(path);
  const half = TILE_SPACING / 2;
  const [tx, , tz] = cellToWorld(col, row);
  const originX = tx - half;
  const originZ = tz - half;

  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rx = centerOffset.x * c + centerOffset.z * s;
  const rz = -centerOffset.x * s + centerOffset.z * c;

  const snapped = snapWallOriginToGrooves({
    originX,
    originZ,
    yaw,
    segments: footprints,
    maxDist: Number.POSITIVE_INFINITY,
  });

  if (snapped) {
    return [snapped[0] + rx, 0, snapped[1] + rz];
  }

  return [originX + rx, 0, originZ + rz];
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

export function resolveWalls(input?: WallInput[]): WallPiece[] {
  if (!input?.length) return WALLS.map((wall) => ({ ...wall }));

  const byId = new Map(input.map((wall) => [wall.id, wall]));

  return WALLS.map((wall) => {
    const override = byId.get(wall.id);
    if (!override) return { ...wall };

    const yaw = yawFromQuarters(override.yawQuarters);
    return {
      ...wall,
      position: wallCenterFromCell({
        path: wall.path,
        col: override.col,
        row: override.row,
        yaw,
      }),
      yaw,
    };
  });
}

export const wallToNumberKeyMap: Record<string, string> = {
  '1': WALLS[0].id,
  '2': WALLS[3].id,
  '3': WALLS[2].id,
  '4': WALLS[1].id,
};
