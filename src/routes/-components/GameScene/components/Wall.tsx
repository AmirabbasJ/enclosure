import type { ThreeEvent } from '@react-three/fiber';
import type { Group } from 'three/webgpu';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';

import type { WallDir, WallId, WallSegFootprint } from '#/domain/walls';

import {
  BOARD_WALL_Y,
  enumerateValidWallCenters,
  isOverTileField,
  pickWallCenterInDirection,
  snapWallOriginToGrooves,
  wallPlacementFitsGrooves,
  wallRestYAtCenter,
} from '#/domain/board';
import { CELL_SIZE, TILE_THICKNESS } from '#/domain/tiles';
import {
  DIR_DELTA,
  getWallCornerLocals,
  getWallFilledCornerLocals,
  getWallFootprints,
  GROOVE_SNAP_DIST,
  GROOVE_SNAP_RELEASE,
  WALL_DRAG_HALF_X,
  WALL_DRAG_HALF_Z,
  WALL_HEIGHT,
  WALL_THICKNESS,
  wallDragHalf,
  wallOriginFromCenter,
} from '#/domain/walls';
import { palette } from '#/theme/palette';

import { BorderBox } from './BorderBox';

export type { WallSegFootprint } from '#/domain/walls';
export { getWallFootprints, wallOriginFromCenter };

interface Segment {
  position: [number, number, number];
  size: [number, number, number];
}

const MERLON_HEIGHT = TILE_THICKNESS * 0.9;
const MERLONS_PER_SEG = 2;

function buildSegments(
  path: readonly WallDir[],
  cellSize: number,
  wallHeight: number
): Segment[] {
  let x = 0;
  let z = 0;
  const segments: Segment[] = [];

  for (const dir of path) {
    const [dx, dz] = DIR_DELTA[dir];
    const nx = x + dx * cellSize;
    const nz = z + dz * cellSize;
    const cx = (x + nx) / 2;
    const cz = (z + nz) / 2;

    const horizontal = dx !== 0;
    const size: [number, number, number] = horizontal
      ? [cellSize - TILE_THICKNESS, wallHeight, TILE_THICKNESS]
      : [TILE_THICKNESS, wallHeight, cellSize - TILE_THICKNESS];

    segments.push({
      position: [cx, wallHeight / 2 - TILE_THICKNESS / 2, cz],
      size,
    });

    x = nx;
    z = nz;
  }

  return segments;
}

function buildMerlons(segments: readonly Segment[]): Segment[] {
  const merlons: Segment[] = [];
  const parts = 2 * MERLONS_PER_SEG - 1;

  for (const seg of segments) {
    const [sx, sy, sz] = seg.size;
    const [px, py, pz] = seg.position;
    const horizontal = sx >= sz;
    const length = horizontal ? sx : sz;
    const thickness = horizontal ? sz : sx;
    const part = length / parts;
    const topY = py + sy / 2;
    const my = topY + MERLON_HEIGHT / 2;

    for (let i = 0; i < MERLONS_PER_SEG; i += 1) {
      const along = -length / 2 + part * (2 * i + 0.5);

      if (horizontal) {
        merlons.push({
          position: [px + along, my, pz],
          size: [part * 0.92, MERLON_HEIGHT, thickness],
        });
      } else {
        merlons.push({
          position: [px, my, pz + along],
          size: [thickness, MERLON_HEIGHT, part * 0.92],
        });
      }
    }
  }

  return merlons;
}

const FILLED_CORNER_BOX = TILE_THICKNESS * 1.1;
const FILLED_CORNER_CAP_H = TILE_THICKNESS * 0.45;
const FILLED_CORNER_CAP_SCALE = 1.35;

function buildFilledCorners({
  cellSize,
  path,
  wallHeight,
  wallId,
}: {
  path: readonly WallDir[];
  cellSize: number;
  wallHeight: number;
  wallId?: WallId;
}): Segment[] {
  const w = FILLED_CORNER_BOX * 2;
  const height = wallHeight - TILE_THICKNESS + MERLON_HEIGHT;
  const y = TILE_THICKNESS / 2 + height / 2;
  const size: [number, number, number] = [w, height, w];

  return getWallFilledCornerLocals(path, cellSize, wallId).map((corner) => ({
    position: [corner.x, y, corner.z] as [number, number, number],
    size,
  }));
}

function buildFilledCornerCaps(posts: readonly Segment[]): Segment[] {
  return posts.map((post) => {
    const [sx, sy, sz] = post.size;
    const [px, py, pz] = post.position;
    const topY = py + sy / 2;
    const cw = sx * FILLED_CORNER_CAP_SCALE;
    const cd = sz * FILLED_CORNER_CAP_SCALE;
    return {
      position: [px, topY + FILLED_CORNER_CAP_H / 2, pz] as [
        number,
        number,
        number,
      ],
      size: [cw, FILLED_CORNER_CAP_H, cd] as [number, number, number],
    };
  });
}

function buildFilledCornerMerlons(caps: readonly Segment[]): Segment[] {
  const merlons: Segment[] = [];

  for (const cap of caps) {
    const [sx, sy, sz] = cap.size;
    const [px, py, pz] = cap.position;
    const topY = py + sy / 2;
    const my = topY + MERLON_HEIGHT / 2;
    const tw = sx * 0.34;
    const td = sz * 0.34;
    const ox = (sx - tw) / 2;
    const oz = (sz - td) / 2;

    for (const dx of [-ox, ox]) {
      for (const dz of [-oz, oz]) {
        merlons.push({
          position: [px + dx, my, pz + dz],
          size: [tw, MERLON_HEIGHT, td],
        });
      }
    }
  }

  return merlons;
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

const HALF_PI = Math.PI / 2;

const GRAB_LIFT = 0.42;
const HOVER_Y = BOARD_WALL_Y + GRAB_LIFT;
const SHADOW_CAST_MAX_WORLD_Y = 0.35;
const LIFT_LERP = 14;
const YAW_LERP = 16;
const MOVE_LERP = 14;
const GRAVITY = -28;
const BOUNCE = 0.12;
const BOUNCE_CUTOFF = 1.2;
const MAX_THROW = 14;
const AIR_DRAG = 0.8;
const GROUND_FRICTION = 7;
const THROW_UP = 0.18;
const EDGE_BOUNCE = 0.15;

type LiftMode = 'falling' | 'held' | 'idle' | 'lifting';

function quantizeBoardDir(x: number, z: number): [number, number] {
  if (Math.abs(x) >= Math.abs(z)) {
    return [x >= 0 ? 1 : -1, 0];
  }

  return [0, z >= 0 ? 1 : -1];
}

function wasdBoardStep(
  code: string,
  camera: THREE.Camera,
  boardYaw: number
): [number, number] | null {
  const camX = camera.position.x;
  const camZ = camera.position.z;
  const len = Math.hypot(camX, camZ);
  if (len < 1e-6) return null;

  const worldUpX = -camX / len;
  const worldUpZ = -camZ / len;

  const c = Math.cos(boardYaw);
  const s = Math.sin(boardYaw);
  const localUpX = worldUpX * c - worldUpZ * s;
  const localUpZ = worldUpX * s + worldUpZ * c;
  const [fwdX, fwdZ] = quantizeBoardDir(localUpX, localUpZ);
  const rightX = -fwdZ;
  const rightZ = fwdX;

  switch (code) {
    case 'KeyW':
      return [fwdX, fwdZ];

    case 'KeyS':
      return [-fwdX, -fwdZ];

    case 'KeyD':
      return [rightX, rightZ];

    case 'KeyA':
      return [-rightX, -rightZ];

    default:
      return null;
  }
}

interface WallProps {
  path: readonly WallDir[];
  wallId?: WallId;
  position?: [number, number, number];
  rotation?: [number, number, number];
  cellSize?: number;
  wallHeight?: number;
  thickness?: number;
  backgroundColor?: number | string;
  borderColor?: number | string;
  showBorder?: boolean;
  orbitSpeed?: number;
  floatAmplitude?: number;
  floatPhase?: number;
  selected?: boolean;
  draggable?: boolean;
  snapToGrooves?: boolean;
  snapStep?: number;
  blockedKeys?: ReadonlySet<string>;
  blockedFilledCorners?: ReadonlySet<string>;
  occupiedCorners?: ReadonlySet<string>;
  filledCorners?: boolean;
  onPositionChange?: (position: [number, number, number]) => void;
  onYawChange?: (yaw: number) => void;
  onGroundHit?: (impact: number) => void;
  onPlace?: () => void;
  onDeselect?: () => void;
  /** Mobile dock: follow canvas-corner home while parked. */
  docked?: boolean;
  getDockHome?: () => [number, number, number] | null;
  onDock?: () => void;
  onUndock?: () => void;
}

const defaultPosition = [0, 0, 0] as [number, number, number];
const defaultRotation = [0, 0, 0] as [number, number, number];

export function Wall({
  path,
  wallId,
  position = defaultPosition,
  rotation = defaultRotation,
  cellSize = CELL_SIZE,
  wallHeight = WALL_HEIGHT,
  thickness = WALL_THICKNESS,
  backgroundColor = palette.textMuted,
  borderColor = palette.bg,
  showBorder = true,
  orbitSpeed = 0,
  floatAmplitude = 0,
  floatPhase = 0,
  selected = false,
  draggable = false,
  snapToGrooves = true,
  snapStep = 0,
  blockedKeys,
  blockedFilledCorners,
  occupiedCorners,
  filledCorners = false,
  onPositionChange,
  onYawChange,
  onGroundHit,
  onPlace,
  onDeselect,
  docked = false,
  getDockHome,
  onDock,
  onUndock,
}: WallProps) {
  const { camera, gl, size } = useThree();
  const dragHalfRef = useRef(wallDragHalf(1));
  const aspect = size.width / Math.max(size.height, 1);
  // Dock homes sit at canvas corners — past the tight mobile board pad.
  dragHalfRef.current = getDockHome
    ? { x: WALL_DRAG_HALF_X * 3, z: WALL_DRAG_HALF_Z * 3 }
    : wallDragHalf(aspect);

  const groupRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);
  const draggingRef = useRef(false);
  const grabOffset = useRef(new THREE.Vector2());
  const plane = useRef(new THREE.Plane());
  const hit = useRef(new THREE.Vector3());
  const local = useRef(new THREE.Vector3());
  const ndc = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const positionRef = useRef(position);
  const displayPosRef = useRef({ x: position[0], z: position[2] });
  const onPositionChangeRef = useRef(onPositionChange);
  const onYawChangeRef = useRef(onYawChange);
  const onPlaceRef = useRef(onPlace);
  const onGroundHitRef = useRef(onGroundHit);
  const onDockRef = useRef(onDock);
  const onUndockRef = useRef(onUndock);
  const getDockHomeRef = useRef(getDockHome);
  const dockedRef = useRef(docked);
  const snapStepRef = useRef(snapStep);
  const snapToGroovesRef = useRef(snapToGrooves);
  const blockedKeysRef = useRef(blockedKeys);
  const blockedFilledCornersRef = useRef(blockedFilledCorners);
  const occupiedCornersRef = useRef(occupiedCorners);
  const cornerLocalsRef = useRef<{ x: number; z: number }[]>([]);
  const filledCornerLocalsRef = useRef<{ x: number; z: number }[]>([]);
  const liftY = useRef(0);
  const hoverAbsY = useRef(HOVER_Y);
  const velY = useRef(0);
  const velX = useRef(0);
  const velZ = useRef(0);
  const throwSample = useRef({ x: 0, z: 0, t: 0 });
  const yawRef = useRef(rotation[1]);
  const yawTargetRef = useRef(rotation[1]);
  const liftMode = useRef<LiftMode>('idle');
  const groundHitFired = useRef(false);
  const castShadowRef = useRef(false);
  const worldPos = useRef(new THREE.Vector3());
  const snapEngagedRef = useRef(false);
  const dragPlaneYRef = useRef(HOVER_Y);
  const centerOffsetRef = useRef({ x: 0, z: 0 });
  const segFootprintsRef = useRef<WallSegFootprint[]>([]);

  if (!draggingRef.current && liftMode.current === 'idle' && !dockedRef.current) {
    const { x: halfX, z: halfZ } = dragHalfRef.current;
    positionRef.current = [
      Math.min(halfX, Math.max(-halfX, position[0])),
      position[1],
      Math.min(halfZ, Math.max(-halfZ, position[2])),
    ];
  }
  onPositionChangeRef.current = onPositionChange;
  onYawChangeRef.current = onYawChange;
  onPlaceRef.current = onPlace;
  onGroundHitRef.current = onGroundHit;
  onDockRef.current = onDock;
  onUndockRef.current = onUndock;
  getDockHomeRef.current = getDockHome;
  dockedRef.current = docked;
  snapStepRef.current = snapStep;
  snapToGroovesRef.current = snapToGrooves;
  blockedKeysRef.current = blockedKeys;
  blockedFilledCornersRef.current = blockedFilledCorners;
  occupiedCornersRef.current = occupiedCorners;

  const rotateYaw = (ox: number, oz: number, yaw: number) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return { x: ox * c + oz * s, z: -ox * s + oz * c };
  };

  const restYAt = (x: number, z: number) => wallRestYAtCenter(x, z);

  const wallPos = (x: number, z: number): [number, number, number] => [
    x,
    restYAt(x, z),
    z,
  ];

  const pinToBoardGrid = (x: number, z: number): { x: number; z: number } => {
    if (!snapToGroovesRef.current) return { x, z };

    const off = centerOffsetRef.current;
    const yaw = yawTargetRef.current;
    const r = rotateYaw(off.x, off.z, yaw);
    const originX = x - r.x;
    const originZ = z - r.z;
    const overTiles = isOverTileField(x, z);
    // Over board → always nearest valid pin. Off board → short snap magnet.
    const maxDist = overTiles
      ? Number.POSITIVE_INFINITY
      : snapEngagedRef.current
        ? GROOVE_SNAP_RELEASE
        : GROOVE_SNAP_DIST;
    const snapped = snapWallOriginToGrooves({
      originX,
      originZ,
      yaw,
      segments: segFootprintsRef.current,
      maxDist,
      blockedKeys: blockedKeysRef.current,
      corners: cornerLocalsRef.current,
      filledCorners: filledCornerLocalsRef.current,
      blockedFilledCorners: blockedFilledCornersRef.current,
      occupiedCorners: occupiedCornersRef.current,
    });

    if (!snapped) {
      snapEngagedRef.current = false;
      return { x, z };
    }

    snapEngagedRef.current = true;
    return { x: snapped[0] + r.x, z: snapped[1] + r.z };
  };

  const isValidPlacementAt = (x: number, z: number): boolean => {
    if (!snapToGroovesRef.current) return isOverTileField(x, z);

    const off = centerOffsetRef.current;
    const yaw = yawTargetRef.current;
    const r = rotateYaw(off.x, off.z, yaw);
    return wallPlacementFitsGrooves({
      originX: x - r.x,
      originZ: z - r.z,
      yaw,
      segments: segFootprintsRef.current,
      blockedKeys: blockedKeysRef.current,
      corners: cornerLocalsRef.current,
      filledCorners: filledCornerLocalsRef.current,
      blockedFilledCorners: blockedFilledCornersRef.current,
      occupiedCorners: occupiedCornersRef.current,
    });
  };

  const returnToDock = () => {
    const home = getDockHomeRef.current?.();
    if (!home) return false;

    velX.current = 0;
    velZ.current = 0;
    velY.current = 0;
    positionRef.current = wallPos(home[0], home[2]);
    displayPosRef.current.x = home[0];
    displayPosRef.current.z = home[2];
    onPositionChangeRef.current?.(positionRef.current);
    onDockRef.current?.();
    return true;
  };

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const [x, , z] = positionRef.current;
    group.position.set(x, restYAt(x, z), z);
    displayPosRef.current.x = x;
    displayPosRef.current.z = z;
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, []);

  useEffect(() => {
    if (draggingRef.current) return;

    if (selected) {
      onUndockRef.current?.();
      velX.current = 0;
      velZ.current = 0;
      velY.current = 0;
      hoverAbsY.current =
        restYAt(displayPosRef.current.x, displayPosRef.current.z) +
        liftY.current;
      liftMode.current = 'lifting';
      return;
    }

    if (liftMode.current === 'lifting' || liftMode.current === 'held') {
      groundHitFired.current = false;
      liftMode.current = 'falling';
    }
  }, [selected]);

  useEffect(() => {
    if (!selected || draggingRef.current) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        yawTargetRef.current += HALF_PI;
        onYawChangeRef.current?.(yawTargetRef.current);

        const [px, , pz] = positionRef.current;
        const pinned = pinToBoardGrid(px, pz);

        if (pinned.x !== px || pinned.z !== pz) {
          const next = wallPos(pinned.x, pinned.z);
          onPositionChangeRef.current?.(next);
          positionRef.current = next;
        }

        onPlaceRef.current?.();
        return;
      }

      const boardYaw =
        groupRef.current?.parent?.parent?.rotation.y ??
        groupRef.current?.parent?.rotation.y ??
        0;
      const step = wasdBoardStep(e.code, camera, boardYaw);
      if (!step) return;
      e.preventDefault();

      const [dx, dz] = step;
      const [px, , pz] = positionRef.current;

      if (!snapToGroovesRef.current) {
        const clamped = clampToDragBounds(
          px + dx * CELL_SIZE,
          pz + dz * CELL_SIZE
        );
        const pos = wallPos(clamped.x, clamped.z);
        onPositionChangeRef.current?.(pos);
        positionRef.current = pos;
        onPlaceRef.current?.();
        return;
      }

      const next = pickWallCenterInDirection({
        cx: px,
        cz: pz,
        dx,
        dz,
        candidates: enumerateValidWallCenters({
          segments: segFootprintsRef.current,
          centerOffset: centerOffsetRef.current,
          yaw: yawTargetRef.current,
          blockedKeys: blockedKeysRef.current,
          corners: cornerLocalsRef.current,
          filledCorners: filledCornerLocalsRef.current,
          blockedFilledCorners: blockedFilledCornersRef.current,
          occupiedCorners: occupiedCornersRef.current,
        }),
      });
      if (!next) return;

      const pos = wallPos(next.x, next.z);
      onPositionChangeRef.current?.(pos);
      positionRef.current = pos;
      onPlaceRef.current?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [selected, camera]);

  const segments = useMemo(
    () => buildSegments(path, cellSize, wallHeight),
    [path, cellSize, wallHeight]
  );

  const merlons = useMemo(() => buildMerlons(segments), [segments]);

  const cornerPosts = useMemo(
    () =>
      filledCorners
        ? buildFilledCorners({ path, cellSize, wallHeight, wallId })
        : [],
    [filledCorners, path, cellSize, wallHeight, wallId]
  );

  const cornerCaps = useMemo(
    () => buildFilledCornerCaps(cornerPosts),
    [cornerPosts]
  );

  const cornerMerlons = useMemo(
    () => buildFilledCornerMerlons(cornerCaps),
    [cornerCaps]
  );

  const wallPieces = useMemo(
    () => [
      ...segments,
      ...merlons,
      ...cornerPosts,
      ...cornerCaps,
      ...cornerMerlons,
    ],
    [segments, merlons, cornerPosts, cornerCaps, cornerMerlons]
  );

  const segCount = segments.length;
  const merlonCount = merlons.length;
  const cornerCount = cornerPosts.length;
  const capCount = cornerCaps.length;

  cornerLocalsRef.current = getWallCornerLocals(path, cellSize);
  filledCornerLocalsRef.current = filledCorners
    ? getWallFilledCornerLocals(path, cellSize, wallId)
    : [];

  segFootprintsRef.current = segments.map((seg) => ({
    x: seg.position[0],
    z: seg.position[2],
    horizontal: seg.size[0] > seg.size[2],
  }));

  const centerOffset = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const seg of segments) {
      const [sx, , sz] = seg.size;
      const [px, , pz] = seg.position;
      minX = Math.min(minX, px - sx / 2);
      maxX = Math.max(maxX, px + sx / 2);
      minZ = Math.min(minZ, pz - sz / 2);
      maxZ = Math.max(maxZ, pz + sz / 2);
    }

    const offset = {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    };
    centerOffsetRef.current = offset;
    return offset;
  }, [segments]);

  const clampToDragBounds = (x: number, z: number) => {
    const { x: halfX, z: halfZ } = dragHalfRef.current;
    return {
      x: Math.min(halfX, Math.max(-halfX, x)),
      z: Math.min(halfZ, Math.max(-halfZ, z)),
    };
  };

  const bounceInsideBounds = (x: number, z: number) => {
    let nx = x;
    let nz = z;
    const { x: halfX, z: halfZ } = dragHalfRef.current;

    if (nx < -halfX) {
      nx = -halfX;
      velX.current = Math.abs(velX.current) * EDGE_BOUNCE;
    } else if (nx > halfX) {
      nx = halfX;
      velX.current = -Math.abs(velX.current) * EDGE_BOUNCE;
    }
    if (nz < -halfZ) {
      nz = -halfZ;
      velZ.current = Math.abs(velZ.current) * EDGE_BOUNCE;
    } else if (nz > halfZ) {
      nz = halfZ;
      velZ.current = -Math.abs(velZ.current) * EDGE_BOUNCE;
    }

    return { x: nx, z: nz };
  };

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    if (
      dockedRef.current &&
      !draggingRef.current &&
      liftMode.current === 'idle'
    ) {
      const home = getDockHomeRef.current?.();

      if (home) {
        positionRef.current = wallPos(home[0], home[2]);
        // Instant — no MOVE_LERP. Board yaw change → wall looks fixed on canvas.
        displayPosRef.current.x = home[0];
        displayPosRef.current.z = home[2];
      }
    }

    const mode = liftMode.current;

    if (spinRef.current) {
      if (orbitSpeed !== 0 && mode === 'idle') {
        spinRef.current.rotation.y = yawRef.current + t * orbitSpeed;
      } else {
        const yawErr = yawTargetRef.current - yawRef.current;

        if (Math.abs(yawErr) > 0.0005) {
          yawRef.current += yawErr * (1 - Math.exp(-YAW_LERP * dt));
        } else {
          yawRef.current = yawTargetRef.current;
        }

        spinRef.current.rotation.y = yawRef.current;
      }
    }

    if (mode === 'lifting' || mode === 'held') {
      const k = 1 - Math.exp(-LIFT_LERP * dt);
      hoverAbsY.current += (HOVER_Y - hoverAbsY.current) * k;

      if (Math.abs(HOVER_Y - hoverAbsY.current) < 0.002) {
        hoverAbsY.current = HOVER_Y;
        liftMode.current = 'held';
      }

      velY.current = 0;
    } else if (mode === 'falling') {
      const prevY = hoverAbsY.current;
      velY.current += GRAVITY * dt;
      hoverAbsY.current += velY.current * dt;

      const [px, , pz] = positionRef.current;
      let nx = px + velX.current * dt;
      let nz = pz + velZ.current * dt;
      const bounced = bounceInsideBounds(nx, nz);
      nx = bounced.x;
      nz = bounced.z;

      if (nx !== px || nz !== pz) {
        positionRef.current = wallPos(nx, nz);
      }

      const restY = restYAt(positionRef.current[0], positionRef.current[2]);
      const grounded = hoverAbsY.current <= restY;
      const drag = grounded ? GROUND_FRICTION : AIR_DRAG;
      const damp = Math.exp(-drag * dt);
      velX.current *= damp;
      velZ.current *= damp;

      if (hoverAbsY.current <= restY) {
        hoverAbsY.current = restY;
        liftY.current = 0;

        const rest = wallPos(positionRef.current[0], positionRef.current[2]);
        positionRef.current = rest;

        if (prevY > restY && !groundHitFired.current) {
          groundHitFired.current = true;
          onGroundHitRef.current?.(Math.abs(velY.current));
        }

        if (Math.abs(velY.current) > BOUNCE_CUTOFF) {
          velY.current *= -BOUNCE;
          velX.current *= 0.85;
          velZ.current *= 0.85;
        } else {
          velY.current = 0;
          const speed = Math.hypot(velX.current, velZ.current);

          if (speed < 0.08) {
            velX.current = 0;
            velZ.current = 0;
            yawRef.current = yawTargetRef.current;
            liftMode.current = 'idle';
            const settled = positionRef.current;
            queueMicrotask(() => {
              if (
                getDockHomeRef.current &&
                !isValidPlacementAt(settled[0], settled[2])
              ) {
                returnToDock();
                onPlaceRef.current?.();
                return;
              }

              onPositionChangeRef.current?.(settled);
              onPlaceRef.current?.();
            });
          }
        }
      }
    } else if (floatAmplitude !== 0) {
      liftY.current = Math.sin(t * 1.2 + floatPhase) * floatAmplitude;
    }

    const [px, , pz] = positionRef.current;

    if (dockedRef.current && !draggingRef.current && mode === 'idle') {
      displayPosRef.current.x = px;
      displayPosRef.current.z = pz;
    } else {
      const k = 1 - Math.exp(-MOVE_LERP * dt);
      displayPosRef.current.x += (px - displayPosRef.current.x) * k;
      displayPosRef.current.z += (pz - displayPosRef.current.z) * k;

      if (
        Math.hypot(px - displayPosRef.current.x, pz - displayPosRef.current.z) <
        0.0005
      ) {
        displayPosRef.current.x = px;
        displayPosRef.current.z = pz;
      }
    }

    const displayY =
      mode === 'lifting' || mode === 'held' || mode === 'falling'
        ? hoverAbsY.current
        : restYAt(displayPosRef.current.x, displayPosRef.current.z) +
          liftY.current;

    group.position.set(
      displayPosRef.current.x,
      displayY,
      displayPosRef.current.z
    );

    group.updateWorldMatrix(true, false);
    group.getWorldPosition(worldPos.current);
    const cast = worldPos.current.y < SHADOW_CAST_MAX_WORLD_Y;

    if (cast !== castShadowRef.current) {
      castShadowRef.current = cast;
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.castShadow = cast;
      });
    }
  });

  const endDrag = () => {
    if (!draggingRef.current) return;

    const dockMode = Boolean(getDockHomeRef.current);

    if (dockMode) {
      velX.current = 0;
      velZ.current = 0;
      velY.current = 0;

      const [px, , pz] = positionRef.current;

      if (isOverTileField(px, pz)) {
        const pinned = pinToBoardGrid(px, pz);
        positionRef.current = wallPos(pinned.x, pinned.z);
      }

      const [qx, , qz] = positionRef.current;

      if (!isValidPlacementAt(qx, qz)) {
        returnToDock();
      }

      draggingRef.current = false;
      groundHitFired.current = false;
      liftMode.current = 'falling';
      document.body.style.cursor = '';
      return;
    }

    let vx = velX.current;
    let vz = velZ.current;
    const speed = Math.hypot(vx, vz);

    if (speed > MAX_THROW) {
      const s = MAX_THROW / speed;
      vx *= s;
      vz *= s;
    }

    velX.current = vx;
    velZ.current = vz;
    velY.current = Math.min(speed * THROW_UP, 5);

    if (performance.now() / 1000 - throwSample.current.t > 0.08) {
      velX.current = 0;
      velZ.current = 0;
      velY.current = 0;
    }

    const [px, , pz] = positionRef.current;

    if (isOverTileField(px, pz)) {
      velX.current = 0;
      velZ.current = 0;
      velY.current = 0;
      const pinned = pinToBoardGrid(px, pz);
      positionRef.current = wallPos(pinned.x, pinned.z);
    } else if (velX.current === 0 && velZ.current === 0) {
      const pinned = pinToBoardGrid(px, pz);
      positionRef.current = wallPos(pinned.x, pinned.z);
    }

    draggingRef.current = false;
    groundHitFired.current = false;
    liftMode.current = 'falling';
    document.body.style.cursor = '';
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    if (!(e.object instanceof THREE.Mesh)) return;
    e.stopPropagation();
    e.nativeEvent.preventDefault();

    const group = groupRef.current;
    const parent = group?.parent;
    if (!group || !parent) return;

    const base = positionRef.current;
    hit.current.set(base[0], HOVER_Y, base[2]);
    parent.localToWorld(hit.current);
    plane.current.setFromNormalAndCoplanarPoint(up.current, hit.current);
    if (!e.ray.intersectPlane(plane.current, hit.current)) return;

    parent.worldToLocal(local.current.copy(hit.current));
    grabOffset.current.set(
      local.current.x - base[0],
      local.current.z - base[2]
    );

    const pointerId = e.pointerId;
    const canvas = gl.domElement;
    try {
      canvas.setPointerCapture(pointerId);
    } catch {
      // ignore — capture unsupported
    }

    onDeselect?.();
    onUndockRef.current?.();

    velX.current = 0;
    velZ.current = 0;
    velY.current = 0;
    yawTargetRef.current = snap(yawRef.current, HALF_PI);
    throwSample.current = {
      x: base[0],
      z: base[2],
      t: performance.now() / 1000,
    };
    snapEngagedRef.current = false;
    dragPlaneYRef.current = HOVER_Y;
    hoverAbsY.current =
      restYAt(displayPosRef.current.x, displayPosRef.current.z) + liftY.current;
    liftMode.current = 'lifting';
    draggingRef.current = true;
    document.body.style.cursor = 'grabbing';

    const drag = new AbortController();

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      const g = groupRef.current;
      const p = g?.parent;
      if (!g || !p) return;

      const rect = canvas.getBoundingClientRect();
      ndc.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(ndc.current, camera);

      const cur = positionRef.current;
      hit.current.set(cur[0], dragPlaneYRef.current, cur[2]);
      p.localToWorld(hit.current);
      plane.current.setFromNormalAndCoplanarPoint(up.current, hit.current);

      if (!raycaster.current.ray.intersectPlane(plane.current, hit.current)) {
        return;
      }

      p.worldToLocal(local.current.copy(hit.current));
      const stepSize = snapStepRef.current;
      let x = local.current.x - grabOffset.current.x;
      let z = local.current.z - grabOffset.current.y;

      if (stepSize > 0) {
        x = snap(x, stepSize);
        z = snap(z, stepSize);
      }

      const { x: cx, z: cz } = clampToDragBounds(x, z);
      const wasOver = isOverTileField(
        positionRef.current[0],
        positionRef.current[2]
      );
      const pinned = pinToBoardGrid(cx, cz);
      x = pinned.x;
      z = pinned.z;
      const nowOver = isOverTileField(x, z);

      if (nowOver && !wasOver) {
        displayPosRef.current.x = x;
        displayPosRef.current.z = z;
      }

      const now = performance.now() / 1000;
      const sample = throwSample.current;
      const sampleDt = now - sample.t;

      if (sample.t > 0 && sampleDt > 0.001 && sampleDt < 0.12) {
        const mvx = (x - sample.x) / sampleDt;
        const mvz = (z - sample.z) / sampleDt;
        velX.current = velX.current * 0.25 + mvx * 0.75;
        velZ.current = velZ.current * 0.25 + mvz * 0.75;
      }

      sample.x = x;
      sample.z = z;
      sample.t = now;

      positionRef.current = wallPos(x, z);
    };

    const finishDrag = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      drag.abort();
      try {
        if (canvas.hasPointerCapture?.(pointerId)) {
          canvas.releasePointerCapture(pointerId);
        }
      } catch {
        // ignore
      }
      endDrag();
    };

    const rotateWhileDragging = () => {
      yawTargetRef.current += HALF_PI;
      onYawChangeRef.current?.(yawTargetRef.current);

      const [sx, , sz] = positionRef.current;
      const pinned = pinToBoardGrid(sx, sz);

      if (pinned.x !== sx || pinned.z !== sz) {
        positionRef.current = wallPos(pinned.x, pinned.z);
      }
    };

    const onSecondFinger = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) return;
      ev.preventDefault();
      rotateWhileDragging();
    };

    const onSpace = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || ev.repeat) return;
      ev.preventDefault();
      rotateWhileDragging();
    };

    window.addEventListener('pointermove', onMove, {
      passive: false,
      signal: drag.signal,
    });
    window.addEventListener('pointerup', finishDrag, { signal: drag.signal });
    window.addEventListener('pointercancel', finishDrag, {
      signal: drag.signal,
    });
    window.addEventListener('pointerdown', onSecondFinger, {
      passive: false,
      signal: drag.signal,
    });
    window.addEventListener('keydown', onSpace, { signal: drag.signal });
  };

  return (
    <group
      ref={groupRef}
      rotation={[rotation[0], 0, rotation[2]]}
      onPointerDown={handlePointerDown}
      onPointerOver={
        draggable
          ? () => {
              if (!draggingRef.current) document.body.style.cursor = 'grab';
            }
          : undefined
      }
      onPointerOut={
        draggable
          ? () => {
              if (!draggingRef.current) document.body.style.cursor = '';
            }
          : undefined
      }
    >
      <group ref={spinRef} rotation={[0, yawRef.current, 0]}>
        <group position={[-centerOffset.x, 0, -centerOffset.z]}>
          {segments.map((seg, i) => (
            <BorderBox
              key={`seg-${i}`}
              castShadow={false}
              size={seg.size}
              position={seg.position}
              backgroundColor={backgroundColor}
              borderColor={borderColor}
              showBorder={showBorder}
              allPieces={wallPieces}
              pieceIndex={i}
            />
          ))}
          {merlons.map((merlon, i) => (
            <BorderBox
              key={`merlon-${i}`}
              castShadow={false}
              size={merlon.size}
              position={merlon.position}
              backgroundColor={backgroundColor}
              borderColor={borderColor}
              showBorder={showBorder}
              allPieces={wallPieces}
              pieceIndex={segCount + i}
            />
          ))}
          {cornerPosts.map((post, i) => (
            <BorderBox
              key={`corner-${i}`}
              castShadow={false}
              size={post.size}
              position={post.position}
              backgroundColor={backgroundColor}
              borderColor={borderColor}
              showBorder={showBorder}
              allPieces={wallPieces}
              pieceIndex={segCount + merlonCount + i}
            />
          ))}
          {cornerCaps.map((cap, i) => (
            <BorderBox
              key={`corner-cap-${i}`}
              castShadow={false}
              size={cap.size}
              position={cap.position}
              backgroundColor={backgroundColor}
              borderColor={borderColor}
              showBorder={showBorder}
              allPieces={wallPieces}
              pieceIndex={segCount + merlonCount + cornerCount + i}
            />
          ))}
          {cornerMerlons.map((merlon, i) => (
            <BorderBox
              key={`corner-merlon-${i}`}
              castShadow={false}
              size={merlon.size}
              position={merlon.position}
              backgroundColor={backgroundColor}
              borderColor={borderColor}
              showBorder={showBorder}
              allPieces={wallPieces}
              pieceIndex={segCount + merlonCount + cornerCount + capCount + i}
            />
          ))}
        </group>
      </group>
    </group>
  );
}
