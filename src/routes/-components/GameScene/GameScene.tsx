import type * as THREE from 'three/webgpu';

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three/webgpu';

import type { LevelInput, WallInput } from '#/domain/level';

import { useGameAudio } from '#/context/GameAudioContext';
import { useGame } from '#/context/GameContext';
import {
  BOARD_BASE_SIZE,
  BOARD_BASE_Y,
  BOARD_SCALE,
  grooveKeysLeadingToCorner,
  GROUND_SIZE,
  GROUND_Y,
  wallCornerWorldKeys,
  wallCornerWorldPositions,
  wallOccupiedSlotKeys,
} from '#/domain/board';
import { resolveLevel, serializeWalls } from '#/domain/level';
import { TILE_POSITIONS, TILE_SIZE } from '#/domain/tiles';
import {
  getWallCornerLocals,
  getWallFilledCornerLocals,
  hasFilledCorners,
  wallToNumberKeyMap,
} from '#/domain/walls';
import { CAM_DIST, CAM_Y, PLAY_ZOOM } from '#/PixelSceneRenderer';
import { palette } from '#/theme/palette';
import { easeInOutCubic } from '#/utils/easeInOutCubic';

import { BorderBox } from './components/BorderBox';
import { LightOrb } from './components/LightOrb';
import {
  getWallFootprints,
  Wall,
  wallOriginFromCenter,
} from './components/Wall';

const ISO_CAM_POS = new Vector3(0, CAM_Y, CAM_DIST);
const TOP_CAM_POS = new Vector3(0, Math.hypot(CAM_Y, CAM_DIST), 0);
const ISO_CAM_UP = new Vector3(0, 1, 0);
const TOP_CAM_UP = new Vector3(0, 0, -1);
const CLEAR_ZOOM = 0.72;
const CLEAR_PAN_Z = 0.3;
const PLAY_AMBIENT = 0.72;
const CLEAR_AMBIENT = 1.05;
const PLAY_DIR_INTENSITY = 0.48;
const CLEAR_DIR_INTENSITY = 1.15;

function shortestYawToZero(current: number) {
  const twoPi = Math.PI * 2;
  let delta = (((0 - current) % twoPi) + twoPi) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  return current + delta;
}

const INTRO_BOARD_DURATION = 1.8;
const INTRO_WALL_DURATION = 1.4;
const INTRO_WALL_STAGGER = 1.2;
const INTRO_DURATION =
  INTRO_BOARD_DURATION + INTRO_WALL_DURATION + INTRO_WALL_STAGGER;
const INTRO_START_Y = 14;
const PLAY_Y = 0;

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

interface GameSceneProps {
  level?: LevelInput;
  snapWallsToGrooves?: boolean;
  onWallsChange: (walls: WallInput[]) => void;
}

export function GameScene({
  level,
  snapWallsToGrooves = true,
  onWallsChange,
}: GameSceneProps) {
  const { state, send } = useGame();
  const canInteract = state.matches('playing');
  const showTopDown =
    state.matches('celebrating') ||
    state.matches('levelCompleted') ||
    state.matches('gameCompleted');
  const pinBoardHigh =
    state.matches('levelCompleted') || state.matches('gameCompleted');
  const { camera } = useThree();
  const { orbs, walls: spawnWalls } = useMemo(
    () => resolveLevel(level, { snapWallsToGrooves }),
    [level, snapWallsToGrooves]
  );

  const [walls, setWalls] = useState(spawnWalls);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const { playRandomHit } = useGameAudio();
  const wallsRef = useRef(walls);
  wallsRef.current = walls;

  const boardRef = useRef<THREE.Group>(null);
  const introRef = useRef<THREE.Group>(null);
  const wallIntroRef = useRef<(THREE.Group | null)[]>([]);
  const boardYawRef = useRef(Math.PI / 4);
  const boardYawTargetRef = useRef(Math.PI / 4);
  const viewBlendRef = useRef(0);
  const panBlendRef = useRef(0);
  const camPosRef = useRef(new Vector3());
  const camUpRef = useRef(new Vector3());
  const lookAtRef = useRef(new Vector3());
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const playLightRef = useRef<THREE.DirectionalLight>(null);
  const clearLightRef = useRef<THREE.DirectionalLight>(null);
  const introElapsedRef = useRef(0);
  const introDoneRef = useRef(false);
  const wallDelaysRef = useRef<number[]>([]);
  const lockedWallIdsRef = useRef(new Set<string>());
  lockedWallIdsRef.current = new Set(
    walls.filter((wall) => wall.locked).map((wall) => wall.id)
  );

  useEffect(() => {
    setWalls(spawnWalls);
    introElapsedRef.current = 0;
    introDoneRef.current = false;
    wallDelaysRef.current = randomWallDelays(spawnWalls.length);

    for (let i = 0; i < spawnWalls.length; i += 1) {
      wallIntroRef.current[i]?.position.set(...wallIntroOffset());
    }

    if (introRef.current) introRef.current.position.y = INTRO_START_Y;
  }, [spawnWalls]);

  useEffect(() => {
    if (!showTopDown) return;
    boardYawTargetRef.current = shortestYawToZero(boardYawRef.current);
  }, [showTopDown]);

  const blockedKeysByWall = useMemo(() => {
    const occupiedById: Record<string, string[]> = {};
    const cornersById: Record<string, string[]> = {};
    const filledCornersById: Record<string, string[]> = {};
    const filledApproachGroovesById: Record<string, string[]> = {};

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
      const cornerLocals = getWallCornerLocals(wall.path);
      cornersById[wall.id] = wallCornerWorldKeys({
        originX,
        originZ,
        yaw: wall.yaw,
        corners: cornerLocals,
      });

      if (!hasFilledCorners(wall.id)) {
        filledCornersById[wall.id] = [];
        filledApproachGroovesById[wall.id] = [];
        continue;
      }

      const filledLocals = getWallFilledCornerLocals(
        wall.path,
        undefined,
        wall.id
      );
      filledCornersById[wall.id] = wallCornerWorldKeys({
        originX,
        originZ,
        yaw: wall.yaw,
        corners: filledLocals,
      });

      const approach: string[] = [];

      for (const pos of wallCornerWorldPositions({
        originX,
        originZ,
        yaw: wall.yaw,
        corners: filledLocals,
      })) {
        for (const key of grooveKeysLeadingToCorner(pos.x, pos.z)) {
          approach.push(key);
        }
      }

      filledApproachGroovesById[wall.id] = approach;
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
        for (const key of filledApproachGroovesById[other.id] ?? [])
          grooves.add(key);
        for (const key of filledCornersById[other.id] ?? [])
          blockedFilledCorners.add(key);
        for (const key of cornersById[other.id] ?? []) occupiedCorners.add(key);
      }

      result[wall.id] = { grooves, blockedFilledCorners, occupiedCorners };
    }

    return result;
  }, [walls]);

  const moveWall = (id: string, position: [number, number, number]) => {
    wallsRef.current = wallsRef.current.map((wall) =>
      wall.id === id ? { ...wall, position } : wall
    );
    setWalls(wallsRef.current);
  };

  const rotateWall = (id: string, yaw: number) => {
    wallsRef.current = wallsRef.current.map((wall) =>
      wall.id === id ? { ...wall, yaw } : wall
    );
    setWalls(wallsRef.current);
  };

  const onPlaceWalls = () => {
    onWallsChange(serializeWalls(wallsRef.current));
  };

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();

        if (selectedWallId) {
          setSelectedWallId(null);
          return;
        }
        if (canInteract) send({ type: 'PAUSE' });
        return;
      }
      if (!canInteract) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        boardYawTargetRef.current += Math.PI / 4;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        boardYawTargetRef.current -= Math.PI / 4;
      } else if (wallToNumberKeyMap[e.key]) {
        e.preventDefault();
        const id = wallToNumberKeyMap[e.key];
        if (lockedWallIdsRef.current.has(id)) return;
        setSelectedWallId((prev) => (prev === id ? null : id));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setSelectedWallId(null);
      }
    },
    [canInteract, selectedWallId, send]
  );

  const onBlur = () => setSelectedWallId(null);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [onKeyDown]);

  // R3F: animate board clear view on the live camera each frame.
  // eslint-disable-next-line @eslint-react/immutability -- camera pose/zoom
  useFrame((_, delta) => {
    const group = boardRef.current;
    if (!group) return;
    const t = 1 - Math.exp(-8 * delta);
    boardYawRef.current +=
      (boardYawTargetRef.current - boardYawRef.current) * t;
    group.rotation.y = boardYawRef.current;

    const viewTarget = showTopDown ? 1 : 0;
    viewBlendRef.current += (viewTarget - viewBlendRef.current) * t;
    const u = viewBlendRef.current;

    const panTarget = pinBoardHigh ? 1 : 0;
    panBlendRef.current += (panTarget - panBlendRef.current) * t;
    const panZ = CLEAR_PAN_Z * panBlendRef.current * u;

    camera.position
      .copy(camPosRef.current.lerpVectors(ISO_CAM_POS, TOP_CAM_POS, u))
      .add(lookAtRef.current.set(0, 0, panZ));
    camera.up.copy(camUpRef.current.lerpVectors(ISO_CAM_UP, TOP_CAM_UP, u));
    camera.lookAt(lookAtRef.current.set(0, 0, panZ));

    if (introDoneRef.current || showTopDown) {
      const ortho = camera as THREE.OrthographicCamera;
      // eslint-disable-next-line @eslint-react/immutability -- ortho zoom for clear view
      ortho.zoom = PLAY_ZOOM + (CLEAR_ZOOM - PLAY_ZOOM) * u;
      ortho.updateProjectionMatrix();
    }

    const ambient = ambientLightRef.current;

    if (ambient) {
      ambient.intensity = PLAY_AMBIENT + (CLEAR_AMBIENT - PLAY_AMBIENT) * u;
    }

    const playLight = playLightRef.current;

    if (playLight) {
      playLight.intensity = PLAY_DIR_INTENSITY * (1 - u);
    }

    const clearLight = clearLightRef.current;

    if (clearLight) {
      clearLight.intensity = CLEAR_DIR_INTENSITY * u;
    }

    if (introDoneRef.current) return;

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
      const slot = wallIntroRef.current[i];
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
        wallIntroRef.current[i]?.position.set(0, 0, 0);
      }

      introDoneRef.current = true;
    }
  });

  return (
    <>
      <color attach="background" args={[palette.surface]} />
      <ambientLight
        ref={ambientLightRef}
        intensity={PLAY_AMBIENT}
        color="#4895ef"
      />
      <directionalLight
        ref={playLightRef}
        castShadow
        intensity={PLAY_DIR_INTENSITY}
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
      <directionalLight
        ref={clearLightRef}
        intensity={0}
        color="#f2f7ff"
        position={[0, 20, 0]}
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
        {walls.map((wall, index) => (
          <group
            key={wall.id}
            ref={(node) => {
              wallIntroRef.current[index] = node;

              if (
                node &&
                !introDoneRef.current &&
                introElapsedRef.current === 0
              ) {
                node.position.set(...wallIntroOffset());
              }
            }}
          >
            <Wall
              path={wall.path}
              wallId={wall.id}
              position={wall.position}
              rotation={[0, wall.yaw, 0]}
              snapToGrooves={snapWallsToGrooves}
              blockedKeys={blockedKeysByWall[wall.id].grooves}
              blockedFilledCorners={
                blockedKeysByWall[wall.id].blockedFilledCorners
              }
              occupiedCorners={blockedKeysByWall[wall.id].occupiedCorners}
              filledCorners={hasFilledCorners(wall.id)}
              selected={selectedWallId === wall.id}
              draggable={canInteract && !wall.locked}
              onPositionChange={(position) => moveWall(wall.id, position)}
              onYawChange={(yaw) => rotateWall(wall.id, yaw)}
              onGroundHit={playRandomHit}
              onPlace={onPlaceWalls}
              onDeselect={() => setSelectedWallId(null)}
            />
          </group>
        ))}
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
