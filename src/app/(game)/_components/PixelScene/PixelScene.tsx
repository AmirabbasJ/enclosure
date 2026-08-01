import type * as THREE from 'three/webgpu';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useGameAudio } from '#/context/GameAudioContext';
import { useGame } from '#/context/GameContext';
import {
  BOARD_BASE_SIZE,
  BOARD_BASE_Y,
  BOARD_SCALE,
  GROUND_SIZE,
  GROUND_Y,
  wallOccupiedSlotKeys,
} from '#/domain/board';
import { resolveLevel, type LevelInput } from '#/domain/level';
import { TILE_POSITIONS, TILE_SIZE } from '#/domain/tiles';
import { wallToNumberKeyMap } from '#/domain/walls';
import { palette } from '#/theme/palette';
import { easeInOutCubic } from '#/utils/easeInOutCubic';

import { BorderBox } from './components/BorderBox';
import { LightOrb } from './components/LightOrb';
import {
  getWallFootprints,
  Wall,
  wallOriginFromCenter,
} from './components/Wall';

const INTRO_DURATION = 1.8;
const INTRO_START_Y = 8;
const PLAY_Y = 0;
const INTRO_WALL_SPREAD = 2.8;

interface SceneContentProps {
  level?: LevelInput;
}

export function SceneContent({ level }: SceneContentProps) {
  const { isPlaying: started } = useGame();
  const { orbs, walls: spawnWalls } = useMemo(
    () => resolveLevel(level),
    [level]
  );
  const [walls, setWalls] = useState(spawnWalls);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const { playWallGroundHit } = useGameAudio();

  useEffect(() => {
    setWalls(spawnWalls);
  }, [spawnWalls]);

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
  const introRef = useRef<THREE.Group>(null);
  const wallIntroRefs = useRef<(THREE.Group | null)[]>([]);
  const boardYaw = useRef(Math.PI / 4);
  const boardYawTarget = useRef(Math.PI / 4);
  const introElapsedRef = useRef(0);
  const introDoneRef = useRef(false);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      boardYawTarget.current += Math.PI / 4;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      boardYawTarget.current -= Math.PI / 4;
    } else if (wallToNumberKeyMap[e.key]) {
      e.preventDefault();
      const id = wallToNumberKeyMap[e.key];
      setSelectedWallId((prev) => (prev === id ? null : id));
    } else if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      setSelectedWallId(null);
    }
  };

  const onBlur = () => setSelectedWallId(null);

  useEffect(() => {
    if (!started) return;

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [started]);

  useFrame((_, delta) => {
    const group = boardRef.current;
    if (!group) return;
    const t = 1 - Math.exp(-8 * delta);
    boardYaw.current += (boardYawTarget.current - boardYaw.current) * t;
    group.rotation.y = boardYaw.current;

    if (!started || introDoneRef.current) return;

    introElapsedRef.current = Math.min(
      INTRO_DURATION,
      introElapsedRef.current + delta
    );
    const u = easeInOutCubic(introElapsedRef.current / INTRO_DURATION);

    const pieces = introRef.current;

    if (pieces) {
      pieces.position.y = INTRO_START_Y + (PLAY_Y - INTRO_START_Y) * u;
    }

    const outward = (INTRO_WALL_SPREAD - 1) * (1 - u);

    for (let i = 0; i < spawnWalls.length; i += 1) {
      const slot = wallIntroRefs.current[i];
      const rest = spawnWalls[i].position;
      if (!slot) continue;
      slot.position.set(rest[0] * outward, 0, rest[2] * outward);
    }

    if (introElapsedRef.current >= INTRO_DURATION) {
      if (pieces) pieces.position.y = PLAY_Y;

      for (let i = 0; i < spawnWalls.length; i += 1) {
        wallIntroRefs.current[i]?.position.set(0, 0, 0);
      }

      introDoneRef.current = true;
    }
  });

  return (
    <>
      <color attach="background" args={[palette.surface]} />
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
          backgroundColor={palette.surface}
          borderColor={palette.bg}
          showBorder={false}
          receiveShadow
        />
        {walls.map((wall, index) => {
          const rest = spawnWalls[index]?.position ?? wall.position;
          const startOutward = INTRO_WALL_SPREAD - 1;
          return (
            <group
              key={wall.id}
              ref={(node) => {
                wallIntroRefs.current[index] = node;
              }}
              position={[rest[0] * startOutward, 0, rest[2] * startOutward]}
            >
              <Wall
                path={wall.path}
                position={wall.position}
                rotation={[0, wall.yaw, 0]}
                blockedKeys={blockedKeysByWall[wall.id]}
                selected={selectedWallId === wall.id}
                draggable={started}
                onPositionChange={(position) => moveWall(wall.id, position)}
                onYawChange={(yaw) => rotateWall(wall.id, yaw)}
                onGroundHit={playWallGroundHit}
                onDeselect={() => setSelectedWallId(null)}
              />
            </group>
          );
        })}
        <group ref={introRef} position={[0, INTRO_START_Y, 0]}>
          <BorderBox
            size={BOARD_BASE_SIZE}
            position={[0, BOARD_BASE_Y, 0]}
            backgroundColor={palette.surface}
            borderColor={palette.bg}
            receiveShadow
          />
          {TILE_POSITIONS.map((position, index) => (
            <BorderBox
              // eslint-disable-next-line @eslint-react/no-array-index-key
              key={index}
              size={TILE_SIZE}
              position={position}
              backgroundColor={palette.surface}
              borderColor={palette.bg}
              receiveShadow
            />
          ))}
          {orbs.map((orb, index) => (
            <LightOrb
              // eslint-disable-next-line @eslint-react/no-array-index-key
              key={index}
              kind={orb.kind}
              position={orb.position}
              floatPhase={orb.floatPhase}
            />
          ))}
        </group>
      </group>
    </>
  );
}
