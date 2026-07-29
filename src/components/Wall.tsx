import { BorderBox } from '#/components/BorderBox';
import {
  CELL_SIZE,
  TILE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from '#/theme/board';
import { palette } from '#/theme/palette';
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three/webgpu';
import * as THREE from 'three/webgpu';

export type WallDir = 'D' | 'L' | 'U' | 'R';

/** Top-down dirs: D=+Z, L=-X, U=-Z, R=+X */
const DIR_DELTA: Record<WallDir, readonly [number, number]> = {
  D: [0, 1],
  L: [-1, 0],
  U: [0, -1],
  R: [1, 0],
};

export const WALL_PATHS = {
  /** D → L → U  (U-shape) */
  u: ['D', 'L', 'U'] as const satisfies ReadonlyArray<WallDir>,
  /** D → L → U → L → U */
  zigzagTall: [
    'D',
    'L',
    'U',
    'L',
    'U',
  ] as const satisfies ReadonlyArray<WallDir>,
  /** D → L → U → L → D → L */
  snake: [
    'D',
    'L',
    'U',
    'L',
    'D',
    'L',
  ] as const satisfies ReadonlyArray<WallDir>,
  /** D → L → D → L */
  steps: ['D', 'L', 'D', 'L'] as const satisfies ReadonlyArray<WallDir>,
} as const;

export type WallPathKey = keyof typeof WALL_PATHS;

type Segment = {
  position: [number, number, number];
  size: [number, number, number];
};

function buildSegments(
  path: ReadonlyArray<WallDir>,
  cellSize: number,
  wallHeight: number,
  _thickness: number
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

const GRAB_LIFT = 0.42;
const LIFT_LERP = 14;
const GRAVITY = -28;
const BOUNCE = 0.28;
const BOUNCE_CUTOFF = 1.2;
const MAX_THROW = 14;
const AIR_DRAG = 0.8;
const GROUND_FRICTION = 7;
const THROW_UP = 0.18;
const SPIN_FACTOR = 0.55;
const SPIN_DAMP = 4;
const EDGE_BOUNCE = 0.85;
const VIEWPORT_PAD = 0.08;

type LiftMode = 'idle' | 'lifting' | 'held' | 'falling';

type ViewportBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

const NDC_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

type WallProps = {
  path: ReadonlyArray<WallDir>;
  position?: [number, number, number];
  rotation?: [number, number, number];
  cellSize?: number;
  wallHeight?: number;
  thickness?: number;
  backgroundColor?: string | number;
  borderColor?: string | number;
  showBorder?: boolean;
  orbitSpeed?: number;
  floatAmplitude?: number;
  floatPhase?: number;
  /** Drag on XZ plane (parent-local). */
  draggable?: boolean;
  /** Snap drag to this grid step. 0 = free drag. */
  snapStep?: number;
  /** Called while / after drag with parent-local position. */
  onPositionChange?: (position: [number, number, number]) => void;
};

/** Wall built from top-down path (D/L/U/R steps). */
export function Wall({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
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
  const velX = useRef(0);
  const velZ = useRef(0);
  const spinVel = useRef(0);
  const throwSample = useRef({ x: 0, z: 0, t: 0 });
  const liftMode = useRef<LiftMode>('idle');
  const wallExtent = useRef({ x: 0.4, z: 0.4 });
  const boundsScratch = useRef<ViewportBounds>({
    minX: -1,
    maxX: 1,
    minZ: -1,
    maxZ: 1,
  });
  positionRef.current = position;
  onPositionChangeRef.current = onPositionChange;
  snapStepRef.current = snapStep;

  const { camera, gl } = useThree();

  const segments = useMemo(
    () => buildSegments(path, cellSize, wallHeight, thickness),
    [path, cellSize, wallHeight, thickness]
  );

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
    wallExtent.current = {
      x: (maxX - minX) / 2,
      z: (maxZ - minZ) / 2,
    };
    return {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    };
  }, [segments]);

  /** Viewport footprint on ground → parent-local XZ playable box. */
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

    // Degenerate (tiny viewport) → pin near center.
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

  /** Keep inside viewport; flip throw vel on edge hit. */
  const bounceInsideViewport = (x: number, z: number, groundY: number) => {
    const parent = groupRef.current?.parent;
    if (!parent) return { x, z };

    const b = boundsScratch.current;
    fillViewportBounds(parent, groundY, b);

    let nx = x;
    let nz = z;
    if (nx < b.minX) {
      nx = b.minX;
      velX.current = Math.abs(velX.current) * EDGE_BOUNCE;
      spinVel.current *= -0.6;
    } else if (nx > b.maxX) {
      nx = b.maxX;
      velX.current = -Math.abs(velX.current) * EDGE_BOUNCE;
      spinVel.current *= -0.6;
    }
    if (nz < b.minZ) {
      nz = b.minZ;
      velZ.current = Math.abs(velZ.current) * EDGE_BOUNCE;
      spinVel.current *= -0.6;
    } else if (nz > b.maxZ) {
      nz = b.maxZ;
      velZ.current = -Math.abs(velZ.current) * EDGE_BOUNCE;
      spinVel.current *= -0.6;
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
        spinRef.current.rotation.y = rotation[1] + t * orbitSpeed;
      } else if (Math.abs(spinVel.current) > 0.01) {
        spinRef.current.rotation.y += spinVel.current * dt;
        spinVel.current *= Math.exp(-SPIN_DAMP * dt);
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

      const [px, py, pz] = positionRef.current;
      let nx = px + velX.current * dt;
      let nz = pz + velZ.current * dt;
      const bounced = bounceInsideViewport(nx, nz, py);
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
            liftMode.current = 'idle';
          }
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

      // Drag on ground plane (base Y), not lifted mesh — keeps aim stable.
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

      // Soft clamp while dragging (no bounce).
      const b = boundsScratch.current;
      fillViewportBounds(parent, base[1], b);
      x = Math.min(b.maxX, Math.max(b.minX, x));
      z = Math.min(b.maxZ, Math.max(b.minZ, z));

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
      // Clamp throw speed, fling up a bit from flick strength.
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
      spinVel.current = (vx - vz) * SPIN_FACTOR;

      // Stale sample → soft drop, no throw.
      if (performance.now() / 1000 - throwSample.current.t > 0.08) {
        velX.current = 0;
        velZ.current = 0;
        velY.current = 0;
        spinVel.current = 0;
      }

      setDragging(false);
      liftMode.current = 'falling';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, camera, gl]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    // Only solid fill mesh — not edges / empty space around wall.
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

    velX.current = 0;
    velZ.current = 0;
    velY.current = 0;
    spinVel.current = 0;
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
      <group ref={spinRef} rotation={[0, rotation[1], 0]}>
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
