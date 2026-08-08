import type { Group } from 'three/webgpu';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

import type { WallDir, WallInput } from '#/domain/walls';

import { CELL_SIZE, TILE_THICKNESS } from '#/domain/tiles';
import {
  DIR_DELTA,
  getWallFootprints,
  WALL_HEIGHT,
  WALL_PATHS,
  wallCenterFromCell,
  yawFromQuarters,
} from '#/domain/walls';
import { palette } from '#/theme/palette';

interface WallDropHintProps {
  wall: WallInput;
}

function buildHintSegments(path: readonly WallDir[]) {
  const segments: {
    position: [number, number, number];
    size: [number, number, number];
  }[] = [];
  let x = 0;
  let z = 0;

  for (const dir of path) {
    const [dx, dz] = DIR_DELTA[dir];
    const nx = x + dx * CELL_SIZE;
    const nz = z + dz * CELL_SIZE;
    const horizontal = dx !== 0;
    segments.push({
      position: [(x + nx) / 2, WALL_HEIGHT / 2, (z + nz) / 2],
      size: [
        horizontal ? CELL_SIZE - TILE_THICKNESS : TILE_THICKNESS,
        WALL_HEIGHT,
        horizontal ? TILE_THICKNESS : CELL_SIZE - TILE_THICKNESS,
      ],
    });
    x = nx;
    z = nz;
  }

  return segments;
}

export function WallDropHint({ wall }: WallDropHintProps) {
  const groupRef = useRef<Group>(null);
  const path = WALL_PATHS[wall.id];
  const yaw = yawFromQuarters(wall.yawQuarters);
  const position = useMemo(
    () =>
      wallCenterFromCell({
        path,
        col: wall.col,
        row: wall.row,
        yaw,
      }),
    [path, wall.col, wall.row, yaw]
  );
  const { centerOffset } = useMemo(() => getWallFootprints(path), [path]);
  const segments = useMemo(() => buildHintSegments(path), [path]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const pulse = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3));
    group.traverse((obj) => {
      const mesh = obj as { material?: { opacity?: number } };

      if (mesh.material && 'opacity' in mesh.material) {
        mesh.material.opacity = pulse;
      }
    });
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, yaw, 0]}>
      <group position={[-centerOffset.x, 0.12, -centerOffset.z]}>
        {segments.map((seg) => (
          <mesh
            key={`${seg.position[0]}:${seg.position[2]}:${seg.size[0]}`}
            position={seg.position}
          >
            <boxGeometry args={seg.size} />
            <meshBasicMaterial
              color={palette.accent}
              transparent
              opacity={0.45}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
