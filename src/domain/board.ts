import { BOARD_COLS, BOARD_ROWS } from '#/domain/cells';
import { CELL_SIZE, TILE_SPACING, TILE_THICKNESS } from '#/domain/tiles';

export { BOARD_COLS, BOARD_ROWS };

export const BOARD_SCALE = 0.3;

export const BOARD_BASE_HEIGHT = 0.08;

export const BOARD_MARGIN = 0.7;
export const BOARD_BASE_SIZE: [number, number, number] = [
  BOARD_COLS * TILE_SPACING + BOARD_MARGIN,
  BOARD_BASE_HEIGHT,
  BOARD_ROWS * TILE_SPACING + BOARD_MARGIN,
];
export const BOARD_BASE_Y = -0.1;

export const GROUND_SIZE: [number, number, number] = [200, 0.1, 200];
export const GROUND_Y = -0.5;
/** Top face of ground slab. */
export const GROUND_TOP_Y = GROUND_Y + GROUND_SIZE[1] / 2;
/** Wall group Y on board (mesh bottom at −TILE_THICKNESS/2). */
export const BOARD_WALL_Y = 0;
/** Wall group Y resting on ground top. */
export const GROUND_WALL_Y = GROUND_TOP_Y + TILE_THICKNESS / 2;

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

export function isOverTileField(x: number, z: number, pad = 0): boolean {
  const halfW = (BOARD_COLS / 2) * TILE_SPACING + pad;
  const halfD = (BOARD_ROWS / 2) * TILE_SPACING + pad;
  return Math.abs(x) <= halfW && Math.abs(z) <= halfD;
}

/** Board seat Y only when every segment lands in a free groove. Else ground (clips board). */
export function wallRestY({
  originX,
  originZ,
  yaw,
  segments,
  blockedKeys,
}: {
  originX: number;
  originZ: number;
  yaw: number;
  segments: readonly WallSegFootprint[];
  blockedKeys?: ReadonlySet<string>;
}): number {
  return wallPlacementFitsGrooves({
    originX,
    originZ,
    yaw,
    segments,
    blockedKeys,
  })
    ? BOARD_WALL_Y
    : GROUND_WALL_Y;
}

export function wallRestYAtCenter({
  cx,
  cz,
  yaw,
  centerOffset,
  segments,
  blockedKeys,
}: {
  cx: number;
  cz: number;
  yaw: number;
  centerOffset: { x: number; z: number };
  segments: readonly WallSegFootprint[];
  blockedKeys?: ReadonlySet<string>;
}): number {
  const r = rotateYawXZ(centerOffset.x, centerOffset.z, yaw);
  return wallRestY({
    originX: cx - r.x,
    originZ: cz - r.z,
    yaw,
    segments,
    blockedKeys,
  });
}

function yawParityOdd(yaw: number) {
  return Math.abs(Math.round(yaw / (Math.PI / 2))) % 2 === 1;
}

function rotateYawXZ(x: number, z: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}

export function grooveSlotKey(slot: GrooveSlot): string {
  return `${slot.horizontal ? 'h' : 'v'}:${slot.x.toFixed(4)}:${slot.z.toFixed(4)}`;
}

function findMatchingSlot({
  wx,
  wz,
  horizontal,
  slots,
}: {
  wx: number;
  wz: number;
  horizontal: boolean;
  slots: readonly GrooveSlot[];
}): GrooveSlot | null {
  for (const slot of slots) {
    if (slot.horizontal !== horizontal) continue;
    if (
      Math.abs(slot.x - wx) <= SLOT_EPS &&
      Math.abs(slot.z - wz) <= SLOT_EPS
    ) {
      return slot;
    }
  }

  return null;
}

export function wallOccupiedSlotKeys({
  originX,
  originZ,
  yaw,
  segments,
}: {
  originX: number;
  originZ: number;
  yaw: number;
  segments: readonly WallSegFootprint[];
}): string[] {
  const odd = yawParityOdd(yaw);
  const keys: string[] = [];

  for (const seg of segments) {
    const r = rotateYawXZ(seg.x, seg.z, yaw);
    const horizontal = odd ? !seg.horizontal : seg.horizontal;
    const slot = findMatchingSlot({
      wx: originX + r.x,
      wz: originZ + r.z,
      horizontal,
      slots: TILE_GROOVE_SLOTS,
    });
    if (slot) keys.push(grooveSlotKey(slot));
  }

  return keys;
}

export function wallPlacementFitsGrooves({
  originX,
  originZ,
  yaw,
  segments,
  blockedKeys,
}: {
  originX: number;
  originZ: number;
  yaw: number;
  segments: readonly WallSegFootprint[];
  blockedKeys?: ReadonlySet<string>;
}): boolean {
  const odd = yawParityOdd(yaw);

  for (const seg of segments) {
    const r = rotateYawXZ(seg.x, seg.z, yaw);
    const horizontal = odd ? !seg.horizontal : seg.horizontal;
    const slot = findMatchingSlot({
      wx: originX + r.x,
      wz: originZ + r.z,
      horizontal,
      slots: TILE_GROOVE_SLOTS,
    });

    if (!slot) return false;
    if (blockedKeys?.has(grooveSlotKey(slot))) return false;
  }

  return true;
}

export function snapWallOriginToGrooves({
  originX,
  originZ,
  yaw,
  segments,
  maxDist,
  blockedKeys,
}: {
  originX: number;
  originZ: number;
  yaw: number;
  segments: readonly WallSegFootprint[];
  maxDist: number;
  blockedKeys?: ReadonlySet<string>;
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
        !wallPlacementFitsGrooves({
          originX: ox,
          originZ: oz,
          yaw,
          segments,
          blockedKeys,
        })
      )
        continue;
      bestD = d;
      best = [ox, oz];
    }
  }

  return best;
}

export function enumerateValidWallCenters({
  segments,
  centerOffset,
  yaw,
  blockedKeys,
}: {
  segments: readonly WallSegFootprint[];
  centerOffset: { x: number; z: number };
  yaw: number;
  blockedKeys?: ReadonlySet<string>;
}): { x: number; z: number }[] {
  if (segments.length === 0) return [];

  const odd = yawParityOdd(yaw);
  const results: { x: number; z: number }[] = [];
  const seen = new Set<string>();

  for (const seg of segments) {
    const horizontal = odd ? !seg.horizontal : seg.horizontal;
    const r = rotateYawXZ(seg.x, seg.z, yaw);

    for (const slot of TILE_GROOVE_SLOTS) {
      if (slot.horizontal !== horizontal) continue;

      const ox = slot.x - r.x;
      const oz = slot.z - r.z;

      if (
        !wallPlacementFitsGrooves({
          originX: ox,
          originZ: oz,
          yaw,
          segments,
          blockedKeys,
        })
      ) {
        continue;
      }

      const cr = rotateYawXZ(centerOffset.x, centerOffset.z, yaw);
      const cx = ox + cr.x;
      const cz = oz + cr.z;
      const key = `${cx.toFixed(4)}:${cz.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ x: cx, z: cz });
    }
  }

  return results;
}

export function pickWallCenterInDirection({
  cx,
  cz,
  dx,
  dz,
  candidates,
  step = CELL_SIZE,
}: {
  cx: number;
  cz: number;
  dx: number;
  dz: number;
  candidates: readonly { x: number; z: number }[];
  step?: number;
}): { x: number; z: number } | null {
  const onEps = step * 0.35;
  const onGrid = candidates.some(
    (c) => Math.hypot(c.x - cx, c.z - cz) <= onEps
  );

  let best: { x: number; z: number } | null = null;
  let bestScore = Infinity;

  for (const c of candidates) {
    const mx = c.x - cx;
    const mz = c.z - cz;
    const dist = Math.hypot(mx, mz);
    if (dist < 1e-6) continue;

    const along = mx * dx + mz * dz;
    if (along <= step * 0.15) continue;

    if (onGrid) {
      const lateral = Math.abs(mx * -dz + mz * dx);
      if (along > step * 1.6 || lateral > step * 0.6) continue;
      const score = Math.hypot(along - step, lateral);

      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    } else if (dist < bestScore) {
      bestScore = dist;
      best = c;
    }
  }

  if (best !== null) return best;
  if (!onGrid) return null;

  const curLat = cx * -dz + cz * dx;
  let wrap: { x: number; z: number } | null = null;
  let wrapAlong = Infinity;
  let wrapLatDelta = Infinity;

  for (const c of candidates) {
    if (Math.hypot(c.x - cx, c.z - cz) < 1e-6) continue;

    const along = c.x * dx + c.z * dz;
    const latDelta = Math.abs(c.x * -dz + c.z * dx - curLat);

    if (
      latDelta < wrapLatDelta - 1e-6 ||
      (Math.abs(latDelta - wrapLatDelta) <= 1e-6 && along < wrapAlong)
    ) {
      wrapLatDelta = latDelta;
      wrapAlong = along;
      wrap = c;
    }
  }

  return wrap;
}
