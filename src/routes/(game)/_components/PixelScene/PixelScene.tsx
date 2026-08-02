import type * as THREE from 'three/webgpu';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { LevelInput } from '#/domain/level';

import { useGameAudio } from '#/context/GameAudioContext';
import { useGame } from '#/context/GameContext';
import {
  BOARD_BASE_SIZE,
  BOARD_BASE_Y,
  BOARD_SCALE,
  GROUND_SIZE,
  GROUND_Y,
  wallCornerWorldKeys,
  wallOccupiedSlotKeys,
} from '#/domain/board';
import { resolveLevel, serializeLevel } from '#/domain/level';
import { DEFAULT_ORB_INPUTS } from '#/domain/orb';
import { TILE_POSITIONS, TILE_SIZE } from '#/domain/tiles';
import {
  getWallCornerLocals,
  getWallFilledCornerLocals,
  hasFilledCorners,
  wallToNumberKeyMap,
} from '#/domain/walls';
import { palette } from '#/theme/palette';
import { easeInOutCubic } from '#/utils/easeInOutCubic';

import { BorderBox } from './components/BorderBox';
import { LightOrb } from './components/LightOrb';
import {
  getWallFootprints,
  Wall,
  wallOriginFromCenter,
} from './components/Wall';

const INTRO_BOARD_DURATION = 1.8;
const INTRO_WALL_DURATION = 1.4;
const INTRO_WALL_STAGGER = 1.2;
const INTRO_DURATION =
  INTRO_BOARD_DURATION + INTRO_WALL_DURATION + INTRO_WALL_STAGGER;
const INTRO_START_Y = 14;
const PLAY_Y = 0;

/** Intro offset: wall drops from above onto play. */
function wallIntroOffset(u = 0): [number, number, number] {
  const k = 1 - u;
  return [0, INTRO_START_Y * k, 0];
}

function randomWallDelays(count: number): number[] {
  return Array.from(
    { length: count },
    () => Math.random() * INTRO_WALL_STAGGER
  );
}

interface SceneContentProps {
  level?: LevelInput;
  /** Snap level wall inputs to nearest groove. Default true. */
  snapWallsToGrooves?: boolean;
}

export function SceneContent({
  level,
  snapWallsToGrooves = true,
}: SceneContentProps) {
  const { isPlaying: started } = useGame();
  const { orbs, walls: spawnWalls } = useMemo(
    () => resolveLevel(level, { snapWallsToGrooves }),
    [level, snapWallsToGrooves]
  );
  const [walls, setWalls] = useState(spawnWalls);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const { playWallGroundHit } = useGameAudio();
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const orbInputs = level?.orbs ?? DEFAULT_ORB_INPUTS;

  const boardRef = useRef<THREE.Group>(null);
  const introRef = useRef<THREE.Group>(null);
  const wallIntroRefs = useRef<(THREE.Group | null)[]>([]);
  const boardYaw = useRef(Math.PI / 4);
  const boardYawTarget = useRef(Math.PI / 4);
  const introElapsedRef = useRef(0);
  const introDoneRef = useRef(false);
  const wallDelaysRef = useRef<number[]>([]);
  const lockedWallIds = useRef(new Set<string>());
  lockedWallIds.current = new Set(
    walls.filter((wall) => wall.locked).map((wall) => wall.id)
  );

  useEffect(() => {
    setWalls(spawnWalls);
    setIntroDone(false);
    introElapsedRef.current = 0;
    introDoneRef.current = false;
    wallDelaysRef.current = randomWallDelays(spawnWalls.length);
  }, [spawnWalls]);

  useEffect(() => {
    if (started) {
      wallDelaysRef.current = randomWallDelays(spawnWalls.length);
      return;
    }

    setIntroDone(false);
    introElapsedRef.current = 0;
    introDoneRef.current = false;
  }, [started, spawnWalls.length]);

  const blockedKeysByWall = useMemo(() => {
    const occupiedById: Record<string, string[]> = {};
    const cornersById: Record<string, string[]> = {};
    const filledCornersById: Record<string, string[]> = {};

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
      const cornerKeys = wallCornerWorldKeys({
        originX,
        originZ,
        yaw: wall.yaw,
        corners: getWallCornerLocals(wall.path),
      });
      cornersById[wall.id] = cornerKeys;
      filledCornersById[wall.id] = hasFilledCorners(wall.id)
        ? wallCornerWorldKeys({
            originX,
            originZ,
            yaw: wall.yaw,
            corners: getWallFilledCornerLocals(wall.path, undefined, wall.id),
          })
        : [];
    }

    const result: Record<
      string,
      {
        grooves: ReadonlySet<string>;
        blockedFilledCorners: ReadonlySet<string>;
        occupiedCorners: ReadonlySet<string>;
      }
    > = {};

    for (const wall of walls) {
      const grooves = new Set<string>();
      const blockedFilledCorners = new Set<string>();
      const occupiedCorners = new Set<string>();

      for (const other of walls) {
        if (other.id === wall.id) continue;
        for (const key of occupiedById[other.id] ?? []) grooves.add(key);
        for (const key of filledCornersById[other.id] ?? [])
          blockedFilledCorners.add(key);
        for (const key of cornersById[other.id] ?? []) occupiedCorners.add(key);
      }

      result[wall.id] = { grooves, blockedFilledCorners, occupiedCorners };
    }

    return result;
  }, [walls]);

  const moveWall = (id: string, position: [number, number, number]) => {
    setWalls((prev) => {
      const next = prev.map((wall) =>
        wall.id === id ? { ...wall, position } : wall
      );
      wallsRef.current = next;
      return next;
    });
  };

  const rotateWall = (id: string, yaw: number) => {
    setWalls((prev) => {
      const next = prev.map((wall) =>
        wall.id === id ? { ...wall, yaw } : wall
      );
      wallsRef.current = next;
      return next;
    });
  };

  const logLevelState = () => {
    setTimeout(() => {
      console.log(serializeLevel({ orbs: orbInputs, walls: wallsRef.current }));
    }, 0);
  };

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
      if (lockedWallIds.current.has(id)) return;
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
    const elapsed = introElapsedRef.current;
    const uBoard = easeInOutCubic(Math.min(1, elapsed / INTRO_BOARD_DURATION));
    const wallPhaseT = elapsed - INTRO_BOARD_DURATION;

    const pieces = introRef.current;

    if (pieces) {
      pieces.position.y = INTRO_START_Y + (PLAY_Y - INTRO_START_Y) * uBoard;
    }

    for (let i = 0; i < spawnWalls.length; i += 1) {
      const slot = wallIntroRefs.current[i];
      if (!slot) continue;
      const delay = wallDelaysRef.current[i] ?? 0;
      const localT = wallPhaseT - delay;
      const uWall =
        localT <= 0
          ? 0
          : easeInOutCubic(Math.min(1, localT / INTRO_WALL_DURATION));
      const [ox, oy, oz] = wallIntroOffset(uWall);
      slot.position.set(ox, oy, oz);
    }

    if (introElapsedRef.current >= INTRO_DURATION) {
      if (pieces) pieces.position.y = PLAY_Y;

      for (let i = 0; i < spawnWalls.length; i += 1) {
        wallIntroRefs.current[i]?.position.set(0, 0, 0);
      }

      introDoneRef.current = true;
      setIntroDone(true);
    }
  });

  return (
    <>
      <color attach="background" args={[palette.surface]} />
      <ambientLight intensity={0.72} color="#4895ef" />
      <directionalLight
        castShadow={started}
        intensity={0.48}
        color="#c8d6e5"
        position={[4, 8, 5]}
        shadow-mapSize={[2048, 2048]}
        shadow-radius={12}
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
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
          const introPosition = introDone
            ? ([0, 0, 0] as [number, number, number])
            : !started
              ? wallIntroOffset()
              : undefined;
          return (
            <group
              key={wall.id}
              ref={(node) => {
                wallIntroRefs.current[index] = node;
              }}
              position={introPosition}
            >
              <Wall
                path={wall.path}
                wallId={wall.id}
                position={wall.position}
                rotation={[0, wall.yaw, 0]}
                blockedKeys={blockedKeysByWall[wall.id].grooves}
                blockedFilledCorners={
                  blockedKeysByWall[wall.id].blockedFilledCorners
                }
                occupiedCorners={blockedKeysByWall[wall.id].occupiedCorners}
                filledCorners={hasFilledCorners(wall.id)}
                selected={selectedWallId === wall.id}
                draggable={started && !wall.locked}
                onPositionChange={(position) => moveWall(wall.id, position)}
                onYawChange={(yaw) => rotateWall(wall.id, yaw)}
                onGroundHit={playWallGroundHit}
                onPlace={logLevelState}
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
