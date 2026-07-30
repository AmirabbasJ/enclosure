import type { ThreeEvent } from '@react-three/fiber';
import type { Group } from 'three/webgpu';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';

import { BorderBox } from '#/components/BorderBox';
import {
  CELL_SIZE,
  GROOVE_SNAP_DIST,
  isOverTileField,
  snapWallOriginToGrooves,
  TILE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from '#/theme/board';
import { palette } from '#/theme/palette';

export type WallDir = 'D' | 'L' | 'R' | 'U';

const DIR_DELTA: Record<WallDir, readonly [number, number]> = {
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

interface Segment {
  position: [number, number, number];
  size: [number, number, number];
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

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

const HALF_PI = Math.PI / 2;

const GRAB_LIFT = 0.42;
const LIFT_LERP = 14;
const YAW_LERP = 16;
const GRAVITY = -28;
const BOUNCE = 0.28;
const BOUNCE_CUTOFF = 1.2;
const VIEWPORT_PAD = 0.08;

type LiftMode = 'falling' | 'held' | 'idle' | 'lifting';

interface ViewportBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const NDC_CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

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
  draggable?: boolean;
  snapStep?: number;
  onPositionChange?: (position: [number, number, number]) => void;
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
  backgroundColor = palette.walls,
  borderColor = palette.border,
  showBorder = true,
  orbitSpeed = 0,
  floatAmplitude = 0,
  floatPhase = 0,
  draggable = false,
  snapStep = 0,
  onPositionChange,
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
  const onPositionChangeRef = useRef(onPositionChange);
  const snapStepRef = useRef(snapStep);
  const liftY = useRef(0);
  const velY = useRef(0);
  const yawRef = useRef(rotation[1]);
  const yawTargetRef = useRef(rotation[1]);
  const liftMode = useRef<LiftMode>('idle');
  const baseExtent = useRef({ x: 0.4, z: 0.4 });
  const wallExtent = useRef({ x: 0.4, z: 0.4 });
  const centerOffsetRef = useRef({ x: 0, z: 0 });
  const segFootprintsRef = useRef<
    { x: number; z: number; horizontal: boolean }[]
  >([]);
  const boundsScratch = useRef<ViewportBounds>({
    minX: -1,
    maxX: 1,
    minZ: -1,
    maxZ: 1,
  });
  positionRef.current = position;
  onPositionChangeRef.current = onPositionChange;
  snapStepRef.current = snapStep;

  const syncExtentToYaw = (yaw: number) => {
    const odd = Math.abs(Math.round(yaw / HALF_PI)) % 2 === 1;
    const b = baseExtent.current;
    wallExtent.current = odd ? { x: b.z, z: b.x } : { x: b.x, z: b.z };
  };

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
    });
    if (!snapped) return { x, z };
    return { x: snapped[0] + r.x, z: snapped[1] + r.z };
  };

  const { camera, gl } = useThree();

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

    baseExtent.current = {
      x: (maxX - minX) / 2,
      z: (maxZ - minZ) / 2,
    };
    syncExtentToYaw(yawTargetRef.current);
    const offset = {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    };
    centerOffsetRef.current = offset;
    return offset;
  }, [segments]);

  const fillViewportBounds = (
    parent: THREE.Object3D,
    groundLocalY: number,
    out: ViewportBounds
  ) => {
    const groundWorld = hit.current.set(0, groundLocalY, 0);
    parent.localToWorld(groundWorld);
    plane.current.setFromNormalAndCoplanarPoint(up.current, groundWorld);

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const [nx, ny] of NDC_CORNERS) {
      ndc.current.set(nx, ny);
      raycaster.current.setFromCamera(ndc.current, camera);

      if (!raycaster.current.ray.intersectPlane(plane.current, hit.current)) {
        continue;
      }

      parent.worldToLocal(local.current.copy(hit.current));
      minX = Math.min(minX, local.current.x);
      maxX = Math.max(maxX, local.current.x);
      minZ = Math.min(minZ, local.current.z);
      maxZ = Math.max(maxZ, local.current.z);
    }

    const ex = wallExtent.current.x + VIEWPORT_PAD;
    const ez = wallExtent.current.z + VIEWPORT_PAD;
    out.minX = minX + ex;
    out.maxX = maxX - ex;
    out.minZ = minZ + ez;
    out.maxZ = maxZ - ez;

    if (out.minX > out.maxX) {
      const mid = (minX + maxX) / 2;
      out.minX = mid;
      out.maxX = mid;
    }
    if (out.minZ > out.maxZ) {
      const mid = (minZ + maxZ) / 2;
      out.minZ = mid;
      out.maxZ = mid;
    }
  };

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);
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
      liftY.current += (GRAB_LIFT - liftY.current) * k;

      if (Math.abs(GRAB_LIFT - liftY.current) < 0.002) {
        liftY.current = GRAB_LIFT;
        liftMode.current = 'held';
      }

      velY.current = 0;
    } else if (mode === 'falling') {
      velY.current += GRAVITY * dt;
      liftY.current += velY.current * dt;

      if (liftY.current <= 0) {
        liftY.current = 0;

        if (Math.abs(velY.current) > BOUNCE_CUTOFF) {
          velY.current *= -BOUNCE;
        } else {
          velY.current = 0;
          yawRef.current = yawTargetRef.current;
          syncExtentToYaw(yawTargetRef.current);
          liftMode.current = 'idle';
        }
      }
    } else if (floatAmplitude !== 0) {
      liftY.current = Math.sin(t * 1.2 + floatPhase) * floatAmplitude;
    }

    const [px, py, pz] = positionRef.current;
    group.position.set(px, py + liftY.current, pz);
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

      const b = boundsScratch.current;
      fillViewportBounds(parent, base[1], b);
      x = Math.min(b.maxX, Math.max(b.minX, x));
      z = Math.min(b.maxZ, Math.max(b.minZ, z));

      const pinned = pinToBoardGrid(x, z);
      x = pinned.x;
      z = pinned.z;

      onChange([x, base[1], z]);
    };

    const onUp = () => {
      const [px, py, pz] = positionRef.current;
      const pinned = pinToBoardGrid(px, pz);

      if (pinned.x !== px || pinned.z !== pz) {
        onPositionChangeRef.current?.([pinned.x, py, pinned.z]);
        positionRef.current = [pinned.x, py, pinned.z];
      }

      velY.current = 0;
      setDragging(false);
      liftMode.current = 'falling';
      document.body.style.cursor = '';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      yawTargetRef.current += HALF_PI;
      syncExtentToYaw(yawTargetRef.current);

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

    velY.current = 0;
    yawTargetRef.current = snap(yawRef.current, HALF_PI);
    syncExtentToYaw(yawTargetRef.current);
    liftMode.current = 'lifting';
    setDragging(true);
    document.body.style.cursor = 'grabbing';
  };

  return (
    <group
      ref={groupRef}
      position={position}
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
