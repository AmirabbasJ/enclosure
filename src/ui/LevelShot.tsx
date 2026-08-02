import type { LevelInput } from '#/domain/level';
import type { WallDir, WallId, WallInput, YawQuarters } from '#/domain/walls';

import { BOARD_COLS, BOARD_ROWS } from '#/domain/cells';
import {
  DIR_DELTA,
  hasFilledCorners,
  WALL_FILLED_CORNER_TURNS,
  WALL_PATHS,
} from '#/domain/walls';
import { palette } from '#/theme/palette';

const WALL_FILL: Record<WallId, string> = {
  u: '#E0E6ED',
  steps: '#B8C5D4',
  zigzagTall: '#96A8BC',
  snake: '#6B8199',
};

const COLORS = {
  bg: palette.bg,
  tile: palette.surface,
  tileStroke: palette.bg,
  good: palette.accent,
  bad: palette.danger,
  wallStroke: '#000000',
} as const;

function isPlayableTile(col: number, row: number): boolean {
  const isCorner =
    (row === 0 || row === BOARD_ROWS - 1) &&
    (col === 0 || col === BOARD_COLS - 1);
  return !isCorner;
}

function rotateDelta(
  dx: number,
  dz: number,
  yawQuarters: YawQuarters
): [number, number] {
  let x = dx;
  let z = dz;

  for (let i = 0; i < yawQuarters; i += 1) {
    const nx = z;
    const nz = -x;
    x = nx;
    z = nz;
  }

  return [x, z];
}

function shortenPathEnds(
  points: readonly [number, number][],
  inset: number
): [number, number][] {
  if (points.length < 2 || inset <= 0) return [...points];

  const out = points.map(([px, pz]) => [px, pz] as [number, number]);

  const insetPoint = (
    from: [number, number],
    toward: [number, number]
  ): [number, number] => {
    const dx = toward[0] - from[0];
    const dz = toward[1] - from[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return from;
    const t = Math.min(inset, len * 0.45) / len;
    return [from[0] + dx * t, from[1] + dz * t];
  };

  out[0] = insetPoint(out[0], out[1]);
  out[out.length - 1] = insetPoint(out[out.length - 1], out[out.length - 2]);
  return out;
}

function pointsAttr(points: readonly [number, number][]): string {
  return points.map(([x, z]) => `${x},${z}`).join(' ');
}

/** Full path vertices (no end inset). */
function wallPathVertices(wall: WallInput): [number, number][] {
  const path = WALL_PATHS[wall.id] as readonly WallDir[];
  let x = wall.col - 0.5;
  let z = wall.row - 0.5;
  const points: [number, number][] = [[x, z]];

  for (const dir of path) {
    const [dx, dz] = DIR_DELTA[dir];
    const [rdx, rdz] = rotateDelta(dx, dz, wall.yawQuarters);
    x += rdx;
    z += rdz;
    points.push([x, z]);
  }

  return points;
}

/** Filled-turn vertices in board space (matches 3D filled corners). */
export function wallFilledCornerPoints(wall: WallInput): [number, number][] {
  if (!hasFilledCorners(wall.id)) return [];

  const path = WALL_PATHS[wall.id] as readonly WallDir[];
  if (path.length < 2) return [];

  const verts = wallPathVertices(wall);
  const turnFilter = WALL_FILLED_CORNER_TURNS[wall.id];
  const filled: [number, number][] = [];
  let turnIndex = 0;

  for (let i = 0; i < path.length - 1; i += 1) {
    if (path[i] === path[i + 1]) continue;

    if (!turnFilter || turnFilter.includes(turnIndex)) {
      filled.push(verts[i + 1]);
    }

    turnIndex += 1;
  }

  return filled;
}

interface LevelShotProps {
  level: LevelInput;
  className?: string;
  pad?: number;
}

const TILE = 0.88;
const TILE_RX = 0.1;
const ORB_R = 0.28;
const WALL_W = 0.12;
const WALL_END_INSET = 0.28 + WALL_W / 2;
/** Filled-corner tower footprint in board units. */
const FILLED_CORNER_S = WALL_W * 2.4;
const FILLED_CORNER_CAP_S = FILLED_CORNER_S * 1.35;

export function wallPathPoints(wall: WallInput): [number, number][] {
  return shortenPathEnds(wallPathVertices(wall), WALL_END_INSET);
}

export function LevelShot({ level, className, pad = 0.85 }: LevelShotProps) {
  const orbs = level.orbs ?? [];
  const walls = level.walls ?? [];

  const cx = (BOARD_COLS - 1) / 2;
  const cy = (BOARD_ROWS - 1) / 2;
  const halfW = BOARD_COLS / 2 + pad;
  const halfH = BOARD_ROWS / 2 + pad;
  const extent = Math.hypot(halfW, halfH);
  const view = extent * 2;

  return (
    <svg
      className={className}
      viewBox={`${cx - extent} ${cy - extent} ${view} ${view}`}
      role="img"
      aria-label="Level preview"
    >
      <rect
        x={cx - extent}
        y={cy - extent}
        width={view}
        height={view}
        fill={COLORS.bg}
        rx={0.35}
      />

      <g transform={`rotate(-45 ${cx} ${cy})`}>
        {Array.from({ length: BOARD_ROWS }, (_, row) =>
          Array.from({ length: BOARD_COLS }, (__, col) => {
            if (!isPlayableTile(col, row)) return null;
            return (
              <rect
                key={`${col},${row}`}
                x={col - TILE / 2}
                y={row - TILE / 2}
                width={TILE}
                height={TILE}
                rx={TILE_RX}
                fill={COLORS.tile}
                stroke={COLORS.tileStroke}
                strokeWidth={0.06}
              />
            );
          })
        )}

        {walls.map((wall) => (
          <polyline
            key={`${wall.id}-${wall.col}-${wall.row}-${wall.yawQuarters}`}
            points={pointsAttr(wallPathPoints(wall))}
            fill="none"
            stroke={COLORS.wallStroke}
            strokeWidth={WALL_W + 0.04}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {walls.map((wall) => (
          <polyline
            key={`${wall.id}-fill`}
            points={pointsAttr(wallPathPoints(wall))}
            fill="none"
            stroke={WALL_FILL[wall.id]}
            strokeWidth={WALL_W}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {walls.flatMap((wall) =>
          wallFilledCornerPoints(wall).map(([x, z]) => (
            <g key={`${wall.id}-filled-${x},${z}`}>
              <rect
                x={x - FILLED_CORNER_CAP_S / 2}
                y={z - FILLED_CORNER_CAP_S / 2}
                width={FILLED_CORNER_CAP_S}
                height={FILLED_CORNER_CAP_S}
                fill={WALL_FILL[wall.id]}
                stroke={COLORS.wallStroke}
                strokeWidth={0.04}
              />
              <rect
                x={x - FILLED_CORNER_S / 2}
                y={z - FILLED_CORNER_S / 2}
                width={FILLED_CORNER_S}
                height={FILLED_CORNER_S}
                fill={WALL_FILL[wall.id]}
                stroke={COLORS.wallStroke}
                strokeWidth={0.035}
              />
            </g>
          ))
        )}

        {orbs.map((orb) => (
          <circle
            key={`${orb.kind}-${orb.col}-${orb.row}`}
            cx={orb.col}
            cy={orb.row}
            r={ORB_R}
            fill={orb.kind === 'good' ? COLORS.good : COLORS.bad}
          />
        ))}
      </g>
    </svg>
  );
}
