import type * as THREE from 'three/webgpu';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { WallDir } from '#/components/Wall';

import { BorderBox } from '#/components/BorderBox';
import { LightOrb } from '#/components/LightOrb';
import { Wall, WALL_PATHS } from '#/components/Wall';
import {
  BOARD_BASE_SIZE,
  BOARD_BASE_Y,
  BOARD_COLS,
  BOARD_ROWS,
  BOARD_SCALE,
  GROUND_SIZE,
  GROUND_Y,
  ORB_HEIGHT,
  TILE_SIZE,
  TILE_SPACING,
  WALL_OFFSET_X,
  WALL_OFFSET_Z,
} from '#/theme/board';
import { palette } from '#/theme/palette';

interface WallPiece {
  id: string;
  path: readonly WallDir[];
  position: [number, number, number];
}

const INITIAL_WALLS: WallPiece[] = [
  {
    id: 'u',
    path: WALL_PATHS.u,
    position: [-WALL_OFFSET_X, 0, -WALL_OFFSET_Z],
  },
  {
    id: 'zigzagTall',
    path: WALL_PATHS.zigzagTall,
    position: [WALL_OFFSET_X, 0, -WALL_OFFSET_Z],
  },
  {
    id: 'snake',
    path: WALL_PATHS.snake,
    position: [-WALL_OFFSET_X, 0, WALL_OFFSET_Z],
  },
  {
    id: 'steps',
    path: WALL_PATHS.steps,
    position: [WALL_OFFSET_X, 0, WALL_OFFSET_Z],
  },
];

export function SceneContent() {
  const tilePositions = useMemo<[number, number, number][]>(() => {
    const positions: [number, number, number][] = [];

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const isCorner =
          (row === 0 || row === BOARD_ROWS - 1) &&
          (col === 0 || col === BOARD_COLS - 1);
        if (isCorner) continue;

        positions.push([
          (col - (BOARD_COLS - 1) / 2) * TILE_SPACING,
          0,
          (row - (BOARD_ROWS - 1) / 2) * TILE_SPACING,
        ]);
      }
    }

    return positions;
  }, []);

  const orbSpawns = useMemo(
    () =>
      (
        [
          { col: 1, row: 1, kind: 'good' as const },
          { col: 2, row: 1, kind: 'bad' as const },
          { col: 1, row: 2, kind: 'bad' as const },
          { col: 2, row: 2, kind: 'good' as const },
        ] as const
      ).map(({ col, row, kind }, i) => ({
        kind,
        floatPhase: i * 1.1,
        position: [
          (col - (BOARD_COLS - 1) / 2) * TILE_SPACING,
          ORB_HEIGHT,
          (row - (BOARD_ROWS - 1) / 2) * TILE_SPACING,
        ] as [number, number, number],
      })),
    []
  );

  const [walls, setWalls] = useState(INITIAL_WALLS);

  const moveWall = (id: string, position: [number, number, number]) => {
    setWalls((prev) =>
      prev.map((wall) => (wall.id === id ? { ...wall, position } : wall))
    );
  };

  const boardRef = useRef<THREE.Group>(null);
  const boardYaw = useRef(Math.PI / 4);
  const boardYawTarget = useRef(Math.PI / 4);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        boardYawTarget.current += Math.PI / 4;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        boardYawTarget.current -= Math.PI / 4;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useFrame((_, delta) => {
    const group = boardRef.current;
    if (!group) return;
    const t = 1 - Math.exp(-8 * delta);
    boardYaw.current += (boardYawTarget.current - boardYaw.current) * t;
    group.rotation.y = boardYaw.current;
  });

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <ambientLight intensity={0.55} color="#4895ef" />
      <directionalLight
        intensity={0.85}
        color="#c8d6e5"
        position={[0.4, 4, 0.6]}
      />

      <group
        ref={boardRef}
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={BOARD_SCALE}
      >
        <BorderBox
          size={GROUND_SIZE}
          position={[0, GROUND_Y, 0]}
          backgroundColor={palette.board}
          borderColor={palette.border}
          showBorder={false}
          receiveShadow
        />
        <BorderBox
          size={BOARD_BASE_SIZE}
          position={[0, BOARD_BASE_Y, 0]}
          backgroundColor={palette.board}
          borderColor={palette.border}
          receiveShadow
        />
        {tilePositions.map((position, index) => (
          <BorderBox
            key={index}
            size={TILE_SIZE}
            position={position}
            backgroundColor={palette.tiles}
            borderColor={palette.border}
            receiveShadow
          />
        ))}
        {orbSpawns.map((orb, index) => (
          <LightOrb
            key={index}
            kind={orb.kind}
            position={orb.position}
            floatPhase={orb.floatPhase}
          />
        ))}

        {walls.map((wall) => (
          <Wall
            key={wall.id}
            path={wall.path}
            position={wall.position}
            draggable
            onPositionChange={(position) => moveWall(wall.id, position)}
          />
        ))}
      </group>
    </>
  );
}
