import type { ThreeEvent } from '@react-three/fiber';
import type { Group } from 'three/webgpu';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';

import type { WallDir } from '#/domain/walls';

import { BorderBox } from '#/components/BorderBox';
import {
  enumerateValidWallCenters,
  isOverTileField,
  pickWallCenterInDirection,
  snapWallOriginToGrooves,
} from '#/domain/board';
import { CELL_SIZE, TILE_THICKNESS } from '#/domain/tiles';
import {
  DIR_DELTA,
  GROOVE_SNAP_DIST,
  WALL_DRAG_HALF_X,
  WALL_DRAG_HALF_Z,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from '#/domain/walls';
import { palette } from '#/theme/palette';

interface Segment {
  position: [number, number, number];
  size: [number, number, number];
}

export interface WallSegFootprint {
  x: number;
  z: number;
  horizontal: boolean;
}

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

export function getWallFootprints(
  path: readonly WallDir[],
  cellSize = CELL_SIZE
): {
  footprints: WallSegFootprint[];
  centerOffset: { x: number; z: number };
} {
  const segments = buildSegments(path, cellSize, WALL_HEIGHT);
  const footprints = segments.map((seg) => ({
    x: seg.position[0],
    z: seg.position[2],
    horizontal: seg.size[0] > seg.size[2],
  }));

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

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

const HALF_PI = Math.PI / 2;

const GRAB_LIFT = 0.42;
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

/** Map WASD to board-local step using camera view + board yaw. */
function wasdBoardStep(
  code: string,
  camera: THREE.Camera,
  boardYaw: number
): [number, number] | null {
  const camX = camera.position.x;
  const camZ = camera.position.z;
  const len = Math.hypot(camX, camZ);
  if (len < 1e-6) return null;

  // World XZ: away from camera = screen-up on ground plane
  const worldUpX = -camX / len;
  const worldUpZ = -camZ / len;

  const c = Math.cos(boardYaw);
  const s = Math.sin(boardYaw);
  // World → board local (inverse of Three.js Y rotation)
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
  snapStep?: number;
  blockedKeys?: ReadonlySet<string>;
  onPositionChange?: (position: [number, number, number]) => void;
  onYawChange?: (yaw: number) => void;
  onGroundHit?: (impact: number) => void;
  onDeselect?: () => void;
}

const defaultPosition = [0, 0, 0] as [number, number, number];
const defaultRotation = [0, 0, 0] as [number, number, number];

export function Wall({
  path,
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
  snapStep = 0,
  blockedKeys,
  onPositionChange,
  onYawChange,
  onGroundHit,
  onDeselect,
}: WallProps) {
  const groupRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);
  const [dragging, setDragging] = useState(false);
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
  const onGroundHitRef = useRef(onGroundHit);
  const snapStepRef = useRef(snapStep);
  const blockedKeysRef = useRef(blockedKeys);
  const liftY = useRef(0);
  const velY = useRef(0);
  const velX = useRef(0);
  const velZ = useRef(0);
  const throwSample = useRef({ x: 0, z: 0, t: 0 });
  const yawRef = useRef(rotation[1]);
  const yawTargetRef = useRef(rotation[1]);
  const liftMode = useRef<LiftMode>('idle');
  const groundHitFired = useRef(false);
  const centerOffsetRef = useRef({ x: 0, z: 0 });
  const segFootprintsRef = useRef<WallSegFootprint[]>([]);
  positionRef.current = position;
  onPositionChangeRef.current = onPositionChange;
  onYawChangeRef.current = onYawChange;
  onGroundHitRef.current = onGroundHit;
  snapStepRef.current = snapStep;
  blockedKeysRef.current = blockedKeys;

  const rotateYaw = (ox: number, oz: number, yaw: number) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return { x: ox * c + oz * s, z: -ox * s + oz * c };
  };

  const pinToBoardGrid = (x: number, z: number): { x: number; z: number } => {
    const off = centerOffsetRef.current;
    const yaw = yawTargetRef.current;
    const r = rotateYaw(off.x, off.z, yaw);
    const originX = x - r.x;
    const originZ = z - r.z;
    const overTiles = isOverTileField(x, z);
    const snapped = snapWallOriginToGrooves({
      originX,
      originZ,
      yaw,
      segments: segFootprintsRef.current,
      maxDist: overTiles ? Number.POSITIVE_INFINITY : GROOVE_SNAP_DIST,
      blockedKeys: blockedKeysRef.current,
    });
    if (!snapped) return { x, z };
    return { x: snapped[0] + r.x, z: snapped[1] + r.z };
  };

  useEffect(() => {
    if (dragging) return;

    if (selected) {
      velX.current = 0;
      velZ.current = 0;
      velY.current = 0;
      liftMode.current = 'lifting';
      return;
    }

    if (liftMode.current === 'lifting' || liftMode.current === 'held') {
      groundHitFired.current = false;
      liftMode.current = 'falling';
    }
  }, [selected, dragging]);

  const { camera, gl } = useThree();

  useEffect(() => {
    if (!selected || dragging) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        yawTargetRef.current += HALF_PI;
        onYawChangeRef.current?.(yawTargetRef.current);

        const [px, py, pz] = positionRef.current;
        const pinned = pinToBoardGrid(px, pz);

        if (pinned.x !== px || pinned.z !== pz) {
          onPositionChangeRef.current?.([pinned.x, py, pinned.z]);
          positionRef.current = [pinned.x, py, pinned.z];
        }

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
      const [px, py, pz] = positionRef.current;
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
        }),
      });
      if (!next) return;

      onPositionChangeRef.current?.([next.x, py, next.z]);
      positionRef.current = [next.x, py, next.z];
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [selected, dragging, camera]);

  const segments = useMemo(
    () => buildSegments(path, cellSize, wallHeight),
    [path, cellSize, wallHeight]
  );

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

  const clampToDragBounds = (x: number, z: number) => ({
    x: Math.min(WALL_DRAG_HALF_X, Math.max(-WALL_DRAG_HALF_X, x)),
    z: Math.min(WALL_DRAG_HALF_Z, Math.max(-WALL_DRAG_HALF_Z, z)),
  });

  const bounceInsideBounds = (x: number, z: number) => {
    let nx = x;
    let nz = z;

    if (nx < -WALL_DRAG_HALF_X) {
      nx = -WALL_DRAG_HALF_X;
      velX.current = Math.abs(velX.current) * EDGE_BOUNCE;
    } else if (nx > WALL_DRAG_HALF_X) {
      nx = WALL_DRAG_HALF_X;
      velX.current = -Math.abs(velX.current) * EDGE_BOUNCE;
    }
    if (nz < -WALL_DRAG_HALF_Z) {
      nz = -WALL_DRAG_HALF_Z;
      velZ.current = Math.abs(velZ.current) * EDGE_BOUNCE;
    } else if (nz > WALL_DRAG_HALF_Z) {
      nz = WALL_DRAG_HALF_Z;
      velZ.current = -Math.abs(velZ.current) * EDGE_BOUNCE;
    }

    return { x: nx, z: nz };
  };

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);
    const mode = liftMode.current;
    const onChange = onPositionChangeRef.current;

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
      liftY.current += (GRAB_LIFT - liftY.current) * k;

      if (Math.abs(GRAB_LIFT - liftY.current) < 0.002) {
        liftY.current = GRAB_LIFT;
        liftMode.current = 'held';
      }

      velY.current = 0;
    } else if (mode === 'falling') {
      const prevLift = liftY.current;
      velY.current += GRAVITY * dt;
      liftY.current += velY.current * dt;

      const [px, py, pz] = positionRef.current;
      let nx = px + velX.current * dt;
      let nz = pz + velZ.current * dt;
      const bounced = bounceInsideBounds(nx, nz);
      nx = bounced.x;
      nz = bounced.z;

      if (onChange && (nx !== px || nz !== pz)) {
        onChange([nx, py, nz]);
        positionRef.current = [nx, py, nz];
      }

      const grounded = liftY.current <= 0;
      const drag = grounded ? GROUND_FRICTION : AIR_DRAG;
      const damp = Math.exp(-drag * dt);
      velX.current *= damp;
      velZ.current *= damp;

      if (liftY.current <= 0) {
        liftY.current = 0;

        if (prevLift > 0 && !groundHitFired.current) {
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
          }
        }
      }
    } else if (floatAmplitude !== 0) {
      liftY.current = Math.sin(t * 1.2 + floatPhase) * floatAmplitude;
    }

    const [px, py, pz] = positionRef.current;
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

    group.position.set(
      displayPosRef.current.x,
      py + liftY.current,
      displayPosRef.current.z
    );
  });

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const group = groupRef.current;
      const parent = group?.parent;
      const onChange = onPositionChangeRef.current;
      if (!group || !parent || !onChange) return;

      const rect = gl.domElement.getBoundingClientRect();
      ndc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(ndc.current, camera);

      const base = positionRef.current;
      hit.current.set(base[0], base[1], base[2]);
      parent.localToWorld(hit.current);
      plane.current.setFromNormalAndCoplanarPoint(up.current, hit.current);

      if (!raycaster.current.ray.intersectPlane(plane.current, hit.current)) {
        return;
      }

      parent.worldToLocal(local.current.copy(hit.current));
      const step = snapStepRef.current;
      let x = local.current.x - grabOffset.current.x;
      let z = local.current.z - grabOffset.current.y;

      if (step > 0) {
        x = snap(x, step);
        z = snap(z, step);
      }

      const { x: cx, z: cz } = clampToDragBounds(x, z);
      const pinned = pinToBoardGrid(cx, cz);
      x = pinned.x;
      z = pinned.z;

      const now = performance.now() / 1000;
      const sample = throwSample.current;
      const sampleDt = now - sample.t;

      if (sample.t > 0 && sampleDt > 0.001 && sampleDt < 0.12) {
        const vx = (x - sample.x) / sampleDt;
        const vz = (z - sample.z) / sampleDt;
        velX.current = velX.current * 0.25 + vx * 0.75;
        velZ.current = velZ.current * 0.25 + vz * 0.75;
      }

      sample.x = x;
      sample.z = z;
      sample.t = now;

      onChange([x, base[1], z]);
    };

    const onUp = () => {
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

      const [px, py, pz] = positionRef.current;

      if (isOverTileField(px, pz)) {
        velX.current = 0;
        velZ.current = 0;
        velY.current = 0;
        const pinned = pinToBoardGrid(px, pz);

        if (pinned.x !== px || pinned.z !== pz) {
          onPositionChangeRef.current?.([pinned.x, py, pinned.z]);
          positionRef.current = [pinned.x, py, pinned.z];
        }
      } else if (velX.current === 0 && velZ.current === 0) {
        const pinned = pinToBoardGrid(px, pz);

        if (pinned.x !== px || pinned.z !== pz) {
          onPositionChangeRef.current?.([pinned.x, py, pinned.z]);
          positionRef.current = [pinned.x, py, pinned.z];
        }
      }

      setDragging(false);
      groundHitFired.current = false;
      liftMode.current = 'falling';
      document.body.style.cursor = '';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      yawTargetRef.current += HALF_PI;
      onYawChangeRef.current?.(yawTargetRef.current);

      const [px, py, pz] = positionRef.current;
      const pinned = pinToBoardGrid(px, pz);

      if (pinned.x !== px || pinned.z !== pz) {
        onPositionChangeRef.current?.([pinned.x, py, pinned.z]);
        positionRef.current = [pinned.x, py, pinned.z];
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [dragging, camera, gl]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    if (!(e.object instanceof THREE.Mesh)) return;
    e.stopPropagation();

    if (selected) {
      onDeselect?.();
      return;
    }

    const group = groupRef.current;
    const parent = group?.parent;
    if (!group || !parent) return;

    const base = positionRef.current;
    hit.current.set(base[0], base[1], base[2]);
    parent.localToWorld(hit.current);
    plane.current.setFromNormalAndCoplanarPoint(up.current, hit.current);
    if (!e.ray.intersectPlane(plane.current, hit.current)) return;

    parent.worldToLocal(local.current.copy(hit.current));
    grabOffset.current.set(
      local.current.x - position[0],
      local.current.z - position[2]
    );

    velX.current = 0;
    velZ.current = 0;
    velY.current = 0;
    yawTargetRef.current = snap(yawRef.current, HALF_PI);
    throwSample.current = {
      x: position[0],
      z: position[2],
      t: performance.now() / 1000,
    };
    liftMode.current = 'lifting';
    setDragging(true);
    document.body.style.cursor = 'grabbing';
  };

  return (
    <group
      ref={groupRef}
      position={[displayPosRef.current.x, position[1], displayPosRef.current.z]}
      rotation={[rotation[0], 0, rotation[2]]}
      onPointerDown={handlePointerDown}
      onPointerOver={
        draggable
          ? () => {
              if (!dragging) document.body.style.cursor = 'grab';
            }
          : undefined
      }
      onPointerOut={
        draggable
          ? () => {
              if (!dragging) document.body.style.cursor = '';
            }
          : undefined
      }
    >
      <group ref={spinRef} rotation={[0, yawRef.current, 0]}>
        <group position={[-centerOffset.x, 0, -centerOffset.z]}>
          {segments.map((seg, i) => (
            <BorderBox
              key={i}
              size={seg.size}
              position={seg.position}
              backgroundColor={backgroundColor}
              borderColor={borderColor}
              showBorder={showBorder}
            />
          ))}
        </group>
      </group>
    </group>
  );
}
