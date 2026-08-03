import type { LevelInput } from '#/domain/level';
import type { WallId, WallInput, YawQuarters } from '#/domain/walls';

import { palette } from '#/theme/palette';

const COLORS = {
  bg: palette.bg,
} as const;

const TILES_W = 80;
const TILES_H = 79;
const ISO = 12;
const ISO_ORIGIN_X = 45;
const ISO_ORIGIN_Y = -3;

const WALL_SRC: Record<
  WallId,
  { href: string; w: number; h: number; ax: number; ay: number }
> = {
  u: { href: '/level-shot/u.svg', w: 26, h: 25, ax: 13, ay: 0 },
  steps: { href: '/level-shot/steps.svg', w: 17, h: 48, ax: 0, ay: 0 },
  snake: {
    href: '/level-shot/snake.svg',
    w: 25,
    h: 49,
    ax: 26,
    ay: 37,
  },
  zigzagTall: {
    href: '/level-shot/zigzag.svg',
    w: 48,
    h: 40,
    ax: 49,
    ay: 26,
  },
};

const ORB = {
  good: { href: '/level-shot/orb.svg', w: 7, h: 7 },
  bad: { href: '/level-shot/triangle.svg', w: 5, h: 5 },
} as const;

/** Board (col, row) → tiles.svg pixel space. */
function boardToIso(bx: number, by: number): [number, number] {
  bx = 4 - bx;
  return [ISO_ORIGIN_X + (by - bx) * ISO, (bx + by) * ISO + ISO_ORIGIN_Y];
}

function wallAnchor(wall: WallInput): [number, number] {
  return boardToIso(wall.col - 0.5, wall.row - 0.5);
}

function yawDeg(yawQuarters: YawQuarters): number {
  return yawQuarters * 90;
}

interface LevelShotProps {
  level: LevelInput;
  className?: string;
  pad?: number;
}

export function LevelShot({ level, className, pad = 4 }: LevelShotProps) {
  const orbs = level.orbs ?? [];
  const walls = level.walls ?? [];

  const viewW = TILES_W + pad * 2;
  const viewH = TILES_H + pad * 2;

  return (
    <svg
      className={className}
      viewBox={`${-pad} ${-pad} ${viewW} ${viewH}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Level preview"
    >
      <rect x={-pad} y={-pad} width={viewW} height={viewH} fill={COLORS.bg} />

      <image
        href="/level-shot/tiles.svg"
        x={0}
        y={0}
        width={TILES_W}
        height={TILES_H}
      />

      {walls.map((wall) => {
        const asset = WALL_SRC[wall.id];

        const [ix, iy] = wallAnchor(wall);

        const deg = yawDeg(wall.yawQuarters);
        return (
          <g
            key={`${wall.id}-${wall.col}-${wall.row}-${wall.yawQuarters}`}
            transform={`translate(${ix} ${iy}) rotate(${deg}) translate(${-asset.ax} ${-asset.ay})`}
          >
            <image href={asset.href} width={asset.w} height={asset.h} />
          </g>
        );
      })}

      {orbs.map((orb) => {
        const asset = ORB[orb.kind];
        const [ix, iy] = boardToIso(orb.col, orb.row);
        return (
          <image
            key={`${orb.kind}-${orb.col}-${orb.row}`}
            href={asset.href}
            x={ix - asset.w / 2}
            y={iy - asset.h / 2}
            width={asset.w}
            height={asset.h}
          />
        );
      })}
    </svg>
  );
}
