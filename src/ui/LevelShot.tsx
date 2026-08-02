import type { LevelInput } from '#/domain/level';
import type { WallDir, WallInput, YawQuarters } from '#/domain/walls';

import { BOARD_COLS, BOARD_ROWS } from '#/domain/cells';
import { DIR_DELTA, WALL_PATHS } from '#/domain/walls';
import { palette } from '#/theme/palette';

/** Match PixelScene: tiles/ground = surface, walls = textMuted, orbs = accent/danger. */
const COLORS = {
  bg: palette.bg,
  tile: palette.surface,
  tileStroke: palette.bg,
  good: palette.accent,
  bad: palette.danger,
  wall: palette.textMuted,
  wallStroke: palette.bg,
} as const;

function isPlayableTile(col: number, row: number): boolean {
  const isCorner =
    (row === 0 || row === BOARD_ROWS - 1) &&
    (col === 0 || col === BOARD_COLS - 1);
  return !isCorner;
}

/** Match Three.js Y-yaw: (x,z) → (z, -x) per quarter. */
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

/** Groove polyline in cell space (col → x, row → z). */
export function wallPathPoints(wall: WallInput): [number, number][] {
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

function pointsAttr(points: readonly [number, number][]): string {
  return points.map(([x, z]) => `${x},${z}`).join(' ');
}

interface LevelShotProps {
  level: LevelInput;
  className?: string;
  /** Outer padding in cell units. */
  pad?: number;
}

const TILE = 0.88;
const TILE_RX = 0.1;
const ORB_R = 0.28;
const WALL_W = 0.2;

/**
 * Top-down level diagram.
 * Board yaw matches SceneContent (`rotation.y = π/4`).
 * SVG y-down → use rotate(-45), not +45.
 */
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
          Array.from({ length: BOARD_COLS }, (_, col) => {
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
            stroke={COLORS.wall}
            strokeWidth={WALL_W}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

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
