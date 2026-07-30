import type * as THREE from 'three/webgpu';

import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSound from 'use-sound';

import type { WallDir } from '#/components/Wall';

import { BorderBox } from '#/components/BorderBox';
import { LightOrb } from '#/components/LightOrb';
import {
  getWallFootprints,
  Wall,
  WALL_PATHS,
  wallOriginFromCenter,
} from '#/components/Wall';
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
  wallOccupiedSlotKeys,
} from '#/theme/board';
import { palette } from '#/theme/palette';

interface WallPiece {
  id: string;
  path: readonly WallDir[];
  position: [number, number, number];
  yaw: number;
}

const INITIAL_WALLS: WallPiece[] = [
  {
    id: 'u',
    path: WALL_PATHS.u,
    position: [-WALL_OFFSET_X, 0, -WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'zigzagTall',
    path: WALL_PATHS.zigzagTall,
    position: [WALL_OFFSET_X, 0, -WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'snake',
    path: WALL_PATHS.snake,
    position: [-WALL_OFFSET_X, 0, WALL_OFFSET_Z],
    yaw: 0,
  },
  {
    id: 'steps',
    path: WALL_PATHS.steps,
    position: [WALL_OFFSET_X, 0, WALL_OFFSET_Z],
    yaw: 0,
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
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [playHit, { stop: stopHit }] = useSound('/hit.mp3', {
    volume: 0.3,
    sprite: {
      1: [1550, 250],
      2: [2300, 250],
      3: [3010, 250],
      4: [6380, 250],
    },
  });

  const blockedKeysByWall = useMemo(() => {
    const occupiedById: Record<string, string[]> = {};

    for (const wall of walls) {
      const { footprints, centerOffset } = getWallFootprints(wall.path);
      const { originX, originZ } = wallOriginFromCenter({
        cx: wall.position[0],
        cz: wall.position[2],
        yaw: wall.yaw,
        centerOffset,
      });
      occupiedById[wall.id] = wallOccupiedSlotKeys({
        originX,
        originZ,
        yaw: wall.yaw,
        segments: footprints,
      });
    }

    const result: Record<string, ReadonlySet<string>> = {};

    for (const wall of walls) {
      const blocked = new Set<string>();
      for (const other of walls) {
        if (other.id === wall.id) continue;
        for (const key of occupiedById[other.id] ?? []) blocked.add(key);
      }
      result[wall.id] = blocked;
    }

    return result;
  }, [walls]);

  const moveWall = (id: string, position: [number, number, number]) => {
    setWalls((prev) =>
      prev.map((wall) => (wall.id === id ? { ...wall, position } : wall))
    );
  };

  const rotateWall = (id: string, yaw: number) => {
    setWalls((prev) =>
      prev.map((wall) => (wall.id === id ? { ...wall, yaw } : wall))
    );
  };

  const boardRef = useRef<THREE.Group>(null);
  const boardYaw = useRef(Math.PI / 4);
  const boardYawTarget = useRef(Math.PI / 4);

  const handleWallGroundHit = useCallback(() => {
    console.log('handleWallGroundHit');
    stopHit();
    const random = Math.floor(Math.random() * 4) + 1;
    playHit({ id: random.toString() });
  }, [playHit, stopHit]);

  useEffect(() => {
    const wallKeys: Record<string, string> = {
      '1': INITIAL_WALLS[0].id,
      '2': INITIAL_WALLS[1].id,
      '3': INITIAL_WALLS[2].id,
      '4': INITIAL_WALLS[3].id,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        boardYawTarget.current += Math.PI / 4;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        boardYawTarget.current -= Math.PI / 4;
      } else if (wallKeys[e.key]) {
        e.preventDefault();
        const id = wallKeys[e.key];
        setSelectedWallId((prev) => (prev === id ? null : id));
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setSelectedWallId(null);
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
            rotation={[0, wall.yaw, 0]}
            blockedKeys={blockedKeysByWall[wall.id]}
            selected={selectedWallId === wall.id}
            draggable
            onPositionChange={(position) => moveWall(wall.id, position)}
            onYawChange={(yaw) => rotateWall(wall.id, yaw)}
            onGroundHit={handleWallGroundHit}
            onDeselect={() => setSelectedWallId(null)}
          />
        ))}
      </group>
    </>
  );
}
