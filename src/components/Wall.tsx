import { BorderBox } from '#/components/BorderBox';
import {
  CELL_SIZE,
  TILE_THICKNESS,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from '#/theme/board';
import { palette } from '#/theme/palette';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three/webgpu';

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
  thickness: number
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

    // Horizontal (L/R) → long on X; vertical (U/D) → long on Z.
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

type WallProps = {
  path: ReadonlyArray<WallDir>;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Length of one path step (tile spacing). */
  cellSize?: number;
  wallHeight?: number;
  thickness?: number;
  backgroundColor?: string | number;
  borderColor?: string | number;
  showBorder?: boolean;
  /** Y-spin rad/s. 0 = no orbit. */
  orbitSpeed?: number;
  /** Gentle vertical bob amplitude. */
  floatAmplitude?: number;
  /** Phase offset for bob (radians). */
  floatPhase?: number;
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
}: WallProps) {
  const groupRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);

  const segments = useMemo(
    () => buildSegments(path, cellSize, wallHeight, thickness),
    [path, cellSize, wallHeight, thickness]
  );

  // Center spin around path bounds.
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
    return {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    };
  }, [segments]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (spinRef.current && orbitSpeed !== 0) {
      spinRef.current.rotation.y = rotation[1] + t * orbitSpeed;
    }
    if (groupRef.current && floatAmplitude !== 0) {
      groupRef.current.position.y =
        position[1] + Math.sin(t * 1.2 + floatPhase) * floatAmplitude;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[rotation[0], 0, rotation[2]]}
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
