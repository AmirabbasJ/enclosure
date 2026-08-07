import { z as zod } from 'zod';

import {
  BOARD_BASE_SIZE,
  GROUND_WALL_Y,
  snapWallOriginToGrooves,
  wallPlacementFitsGrooves,
  wallRestY,
} from '#/domain/board';
import { BOARD_COLS, BOARD_ROWS } from '#/domain/cells';
import { cellToWorld } from '#/domain/coords';
import { CELL_SIZE, TILE_SPACING, TILE_THICKNESS } from '#/domain/tiles';

export const WALL_HEIGHT = 0.55;
export const WALL_THICKNESS = 0.12;

export const WALL_OFFSET_X = BOARD_BASE_SIZE[0] / 2 + TILE_SPACING + 0.5;
export const WALL_OFFSET_Z = BOARD_BASE_SIZE[2] / 2 + TILE_SPACING + 0.5;

export const WALL_DRAG_HALF_X = WALL_OFFSET_X;
export const WALL_DRAG_HALF_Z = WALL_OFFSET_Z;

export const GROOVE_SNAP_DIST = TILE_SPACING * 0.4;
export const GROOVE_SNAP_RELEASE = GROOVE_SNAP_DIST * 1.85;

export type WallDir = 'D' | 'L' | 'R' | 'U';

export type YawQuarters = 0 | 1 | 2 | 3;

export type WallId = 'snake' | 'steps' | 'u' | 'zigzagTall';

export interface WallInput {
  id: WallId;
  col: number;
  row: number;
  yawQuarters: YawQuarters;
}
export const WallInputSchema = zod.object({
  id: zod.enum(['snake', 'steps', 'u', 'zigzagTall']),
  col: zod.number(),
  row: zod.number(),
  yawQuarters: zod.union([
    zod.literal(0),
    zod.literal(1),
    zod.literal(2),
    zod.literal(3),
  ]),
});

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

export const FILLED_CORNER_WALLS: ReadonlySet<WallId> = new Set([
  'steps',
  'u',
  'zigzagTall',
]);

export const WALL_FILLED_CORNER_TURNS: Partial<
  Record<WallId, readonly number[]>
> = {
  steps: [0, 2],
  u: [0],
  zigzagTall: [1],
};

export function hasFilledCorners(id: WallId): boolean {
  return FILLED_CORNER_WALLS.has(id);
}

export interface WallPiece {
  id: WallId;
  path: readonly WallDir[];
  position: [number, number, number];
  yaw: number;
  locked?: boolean;
}

export interface WallSegFootprint {
  x: number;
  z: number;
  horizontal: boolean;
}

export function compareWalls(
  walls1: WallInput[],
  walls2: WallInput[]
): boolean {
  return walls1.every((w) => {
    return walls2.some(
      (w2) =>
        w2.id === w.id &&
        w2.col === w.col &&
        w2.row === w.row &&
        w2.yawQuarters === w.yawQuarters
    );
  });
}

export function yawFromQuarters(yawQuarters: YawQuarters): number {
  return yawQuarters * (Math.PI / 2);
}

export function yawToQuarters(yaw: number): YawQuarters {
  return (((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4) as YawQuarters;
}

/** World position of a groove-space corner for (col, row). */
export function spaceToWorld(
  col: number,
  row: number
): { x: number; z: number } {
  const half = TILE_SPACING / 2;
  const [tx, , tz] = cellToWorld(col, row);
  return { x: tx - half, z: tz - half };
}

export function worldToSpace(
  x: number,
  z: number
): { col: number; row: number } {
  return {
    col: Math.round(x / TILE_SPACING + (BOARD_COLS - 1) / 2 + 0.5),
    row: Math.round(z / TILE_SPACING + (BOARD_ROWS - 1) / 2 + 0.5),
  };
}

/** Min board AABB corner of path, relative to path origin, after yaw. */
export function wallAabbMinLocal(
  path: readonly WallDir[],
  yaw: number,
  cellSize = CELL_SIZE
): { x: number; z: number } {
  const corners = getWallCornerLocals(path, cellSize);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  let minX = Infinity;
  let minZ = Infinity;

  for (const corner of corners) {
    const rx = corner.x * c + corner.z * s;
    const rz = -corner.x * s + corner.z * c;
    minX = Math.min(minX, rx);
    minZ = Math.min(minZ, rz);
  }

  return { x: minX, z: minZ };
}

/** Path-origin space indices for an AABB-anchored wall input. */
export function wallPathOriginSpace({
  path,
  col,
  row,
  yaw,
}: {
  path: readonly WallDir[];
  col: number;
  row: number;
  yaw: number;
}): { col: number; row: number } {
  const aabbMin = wallAabbMinLocal(path, yaw);
  const target = spaceToWorld(col, row);
  return worldToSpace(target.x - aabbMin.x, target.z - aabbMin.z);
}

export function wallToInput(wall: WallPiece): WallInput | null {
  const { footprints, centerOffset } = getWallFootprints(wall.path);
  const { originX, originZ } = wallOriginFromCenter({
    cx: wall.position[0],
    cz: wall.position[2],
    yaw: wall.yaw,
    centerOffset,
  });

  if (
    !wallPlacementFitsGrooves({
      originX,
      originZ,
      yaw: wall.yaw,
      segments: footprints,
      corners: getWallCornerLocals(wall.path),
      filledCorners: getWallFilledCornerLocals(wall.path, CELL_SIZE, wall.id),
    })
  ) {
    return null;
  }

  const aabbMin = wallAabbMinLocal(wall.path, wall.yaw);
  const { col, row } = worldToSpace(originX + aabbMin.x, originZ + aabbMin.z);
  const yawQuarters = yawToQuarters(wall.yaw);
  const expected = wallCenterFromCell({
    path: wall.path,
    col,
    row,
    yaw: yawFromQuarters(yawQuarters),
  });

  const dx = wall.position[0] - expected[0];
  const dz = wall.position[2] - expected[2];
  if (Math.hypot(dx, dz) > CELL_SIZE * 0.4) return null;

  return { id: wall.id, col, row, yawQuarters };
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

export function getWallCornerLocals(
  path: readonly WallDir[],
  cellSize = CELL_SIZE
): { x: number; z: number }[] {
  let x = 0;
  let z = 0;
  const corners: { x: number; z: number }[] = [{ x, z }];

  for (const dir of path) {
    const [dx, dz] = DIR_DELTA[dir];
    x += dx * cellSize;
    z += dz * cellSize;
    corners.push({ x, z });
  }

  return corners;
}

export function getWallFilledCornerLocals(
  path: readonly WallDir[],
  cellSize = CELL_SIZE,
  wallId?: WallId
): { x: number; z: number }[] {
  if (path.length < 2) return [];

  const all = getWallCornerLocals(path, cellSize);
  const turnFilter = wallId ? WALL_FILLED_CORNER_TURNS[wallId] : undefined;
  const filled: { x: number; z: number }[] = [];
  let turnIndex = 0;

  for (let i = 0; i < path.length - 1; i += 1) {
    if (path[i] === path[i + 1]) continue;
    if (!turnFilter || turnFilter.includes(turnIndex)) {
      filled.push(all[i + 1]);
    }

    turnIndex += 1;
  }

  return filled;
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

export function wallCenterFromCell({
  path,
  col,
  row,
  yaw,
  snap = true,
}: {
  path: readonly WallDir[];
  col: number;
  row: number;
  yaw: number;
  snap?: boolean;
}): [number, number, number] {
  const { footprints, centerOffset } = getWallFootprints(path);
  const aabbMin = wallAabbMinLocal(path, yaw);
  const target = spaceToWorld(col, row);
  const originX = target.x - aabbMin.x;
  const originZ = target.z - aabbMin.z;

  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rx = centerOffset.x * c + centerOffset.z * s;
  const rz = -centerOffset.x * s + centerOffset.z * c;

  if (snap) {
    const snapped = snapWallOriginToGrooves({
      originX,
      originZ,
      yaw,
      segments: footprints,
      maxDist: Number.POSITIVE_INFINITY,
    });

    if (snapped) {
      const x = snapped[0] + rx;
      const z = snapped[1] + rz;
      return [x, wallRestY(x, z), z];
    }
  }

  const x = originX + rx;
  const z = originZ + rz;
  return [x, wallRestY(x, z), z];
}

export const WALLS: WallPiece[] = [
  {
    id: 'u',
    path: WALL_PATHS.u,
    position: [-WALL_OFFSET_X, GROUND_WALL_Y, -WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'zigzagTall',
    path: WALL_PATHS.zigzagTall,
    position: [WALL_OFFSET_X, GROUND_WALL_Y, -WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'snake',
    path: WALL_PATHS.snake,
    position: [-WALL_OFFSET_X, GROUND_WALL_Y, WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'steps',
    path: WALL_PATHS.steps,
    position: [WALL_OFFSET_X, GROUND_WALL_Y, WALL_OFFSET_Z],
    yaw: 0,
  },
];

export function resolveWalls(
  input?: WallInput[],
  options?: { snap?: boolean }
): WallPiece[] {
  if (!input?.length) return WALLS.map((wall) => ({ ...wall }));

  const snap = options?.snap ?? true;
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
        snap,
      }),
      yaw,
      locked: true,
    };
  });
}

export const wallToNumberKeyMap: Record<string, string> = {
  '1': WALLS[0].id,
  '2': WALLS[3].id,
  '3': WALLS[1].id,
  '4': WALLS[2].id,
};
