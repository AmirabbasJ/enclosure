export const BOARD_SCALE = 0.4;
export const BOARD_COLS = 5;
export const BOARD_ROWS = 4;

export const TILE_LENGTH = 0.72;
export const TILE_THICKNESS = 0.1;
export const TILE_SIZE: [number, number, number] = [
  TILE_LENGTH,
  TILE_THICKNESS,
  TILE_LENGTH,
];

export const TILE_SPACING = TILE_LENGTH + TILE_THICKNESS;

export const CELL_SIZE = TILE_SPACING;

export const WALL_HEIGHT = 0.55;
export const WALL_THICKNESS = 0.12;

export const BOARD_BASE_HEIGHT = 0.08;

export const BOARD_MARGIN = 0.7;
export const BOARD_BASE_SIZE: [number, number, number] = [
  BOARD_COLS * TILE_SPACING + BOARD_MARGIN,
  BOARD_BASE_HEIGHT,
  BOARD_ROWS * TILE_SPACING + BOARD_MARGIN,
];
export const BOARD_BASE_Y = -0.1;

export const GROUND_SIZE: [number, number, number] = [20, 0.1, 20];
export const GROUND_Y = -0.5;
export const GROUND_TOP = GROUND_Y;

export const ORB_HEIGHT = 0.35;

export const WALL_OFFSET_X = BOARD_BASE_SIZE[0] / 2 + TILE_SPACING * 0.75;
export const WALL_OFFSET_Z = BOARD_BASE_SIZE[2] / 2 + TILE_SPACING * 0.75;

export interface GrooveSlot {
  x: number;
  z: number;

  horizontal: boolean;
}

interface WallSegFootprint {
  x: number;
  z: number;

  horizontal: boolean;
}

export function buildTileGrooveSlots(): GrooveSlot[] {
  const slots: GrooveSlot[] = [];
  const seen = new Set<string>();

  const add = (x: number, z: number, horizontal: boolean) => {
    const key = `${horizontal ? 'h' : 'v'}:${x.toFixed(4)}:${z.toFixed(4)}`;
    if (seen.has(key)) return;
    seen.add(key);
    slots.push({ x, z, horizontal });
  };

  const half = TILE_SPACING / 2;

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const isCorner =
        (row === 0 || row === BOARD_ROWS - 1) &&
        (col === 0 || col === BOARD_COLS - 1);
      if (isCorner) continue;

      const tx = (col - (BOARD_COLS - 1) / 2) * TILE_SPACING;
      const tz = (row - (BOARD_ROWS - 1) / 2) * TILE_SPACING;
      add(tx - half, tz, false);
      add(tx + half, tz, false);
      add(tx, tz - half, true);
      add(tx, tz + half, true);
    }
  }

  return slots;
}

const TILE_GROOVE_SLOTS = buildTileGrooveSlots();
const SLOT_EPS = TILE_THICKNESS * 0.75;

export const GROOVE_SNAP_DIST = TILE_SPACING * 0.4;

export function isOverTileField(x: number, z: number, pad = 0): boolean {
  const halfW = (BOARD_COLS / 2) * TILE_SPACING + pad;
  const halfD = (BOARD_ROWS / 2) * TILE_SPACING + pad;
  return Math.abs(x) <= halfW && Math.abs(z) <= halfD;
}

function yawParityOdd(yaw: number) {
  return Math.abs(Math.round(yaw / (Math.PI / 2))) % 2 === 1;
}

function rotateYawXZ(x: number, z: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}

function segmentMatchesSlot({
  wx,
  wz,
  horizontal,
  slots,
}: {
  wx: number;
  wz: number;
  horizontal: boolean;
  slots: readonly GrooveSlot[];
}) {
  for (const slot of slots) {
    if (slot.horizontal !== horizontal) continue;
    if (
      Math.abs(slot.x - wx) <= SLOT_EPS &&
      Math.abs(slot.z - wz) <= SLOT_EPS
    ) {
      return true;
    }
  }

  return false;
}

export function wallPlacementFitsGrooves({
  originX,
  originZ,
  yaw,
  segments,
}: {
  originX: number;
  originZ: number;
  yaw: number;
  segments: readonly WallSegFootprint[];
}): boolean {
  const odd = yawParityOdd(yaw);

  for (const seg of segments) {
    const r = rotateYawXZ(seg.x, seg.z, yaw);
    const horizontal = odd ? !seg.horizontal : seg.horizontal;

    if (
      !segmentMatchesSlot({
        wx: originX + r.x,
        wz: originZ + r.z,
        horizontal,
        slots: TILE_GROOVE_SLOTS,
      })
    ) {
      return false;
    }
  }

  return true;
}

export function snapWallOriginToGrooves({
  originX,
  originZ,
  yaw,
  segments,
  maxDist,
}: {
  originX: number;
  originZ: number;
  yaw: number;
  segments: readonly WallSegFootprint[];
  maxDist: number;
}): [number, number] | null {
  if (segments.length === 0) return null;

  const odd = yawParityOdd(yaw);
  let best: [number, number] | null = null;
  let bestD = maxDist;

  for (const seg of segments) {
    const localH = seg.horizontal;
    const horizontal = odd ? !localH : localH;
    const r = rotateYawXZ(seg.x, seg.z, yaw);

    for (const slot of TILE_GROOVE_SLOTS) {
      if (slot.horizontal !== horizontal) continue;
      const ox = slot.x - r.x;
      const oz = slot.z - r.z;
      const d = Math.hypot(ox - originX, oz - originZ);
      if (d > bestD) continue;
      if (
        !wallPlacementFitsGrooves({ originX: ox, originZ: oz, yaw, segments })
      )
        continue;
      bestD = d;
      best = [ox, oz];
    }
  }

  return best;
}
