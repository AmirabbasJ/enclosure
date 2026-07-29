import { BorderBox } from '#/components/BorderBox';
import { LightOrb } from '#/components/LightOrb';
import { Wall, WALL_PATHS } from '#/components/Wall';
import { palette } from '#/theme/palette';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';

export function SceneContent() {
  const cols = 5;
  const rows = 4;
  const spacing = 0.8;

  const tilePositions = useMemo<[number, number, number][]>(() => {
    const positions: [number, number, number][] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const isCorner =
          (row === 0 || row === rows - 1) && (col === 0 || col === cols - 1);
        if (isCorner) continue;

        positions.push([
          (col - (cols - 1) / 2) * spacing,
          0,
          (row - (rows - 1) / 2) * spacing,
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
          (col - (cols - 1) / 2) * spacing,
          0.35,
          (row - (rows - 1) / 2) * spacing,
        ] as [number, number, number],
      })),
    []
  );

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

  const groundSize: [number, number, number] = [100, 0.1, 100];
  const groundY = -0.5;
  const groundTop = groundY + groundSize[1] / 2;

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <ambientLight intensity={1} color={'#4895ef'} />

      {/* <PresentationControls
        global
        cursor
        speed={2}
        // enabled={false}
        rotation={[0, Math.PI / 4, 0]}
        polar={[0, 0]}
        azimuth={[-Infinity, Infinity]}
      > */}
      <group
        ref={boardRef}
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={0.4}
      >
        {/* Ground plane — walls + board sit on this. */}
        <BorderBox
          size={groundSize}
          position={[0, groundY, 0]}
          backgroundColor={palette.board}
          borderColor={palette.border}
          showBorder={false}
          receiveShadow
        />
        <BorderBox
          size={[5.2 - 0.5, 0.08, 4.4 - 0.5]}
          position={[0, -0.1, 0]}
          backgroundColor={palette.board}
          borderColor={palette.border}
          receiveShadow
        />
        {tilePositions.map((position, index) => (
          <BorderBox
            key={index}
            size={[0.72, 0.1, 0.72]}
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

        {/* Wall pieces rest on ground plane around board. */}
        <Wall
          path={WALL_PATHS.u}
          position={[-3.2, groundTop, -2.6]}
          cellSize={0.8}
          wallHeight={0.55}
          thickness={0.12}
        />
        <Wall
          path={WALL_PATHS.zigzagTall}
          position={[3.2, groundTop, -2.6]}
          cellSize={0.8}
          wallHeight={0.55}
          thickness={0.12}
        />
        <Wall
          path={WALL_PATHS.snake}
          position={[-3.2, groundTop, 2.6]}
          cellSize={0.8}
          wallHeight={0.55}
          thickness={0.12}
        />
        <Wall
          path={WALL_PATHS.steps}
          position={[3.2, groundTop, 2.6]}
          cellSize={0.8}
          wallHeight={0.55}
          thickness={0.12}
        />
      </group>
      {/* </PresentationControls> */}
    </>
  );
}
