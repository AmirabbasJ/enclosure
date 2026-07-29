import { BorderBox } from '#/components/BorderBox';
import { LightOrb } from '#/components/LightOrb';
import { Wall, WALL_PATHS } from '#/components/Wall';
import { palette } from '#/theme/palette';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';

export function SceneContent() {
  const spotLight = useMemo(() => new THREE.SpotLight(palette.stone, 30), []);
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

  useEffect(() => {
    spotLight.angle = Math.PI / 2;
    spotLight.penumbra = 0;
    spotLight.decay = 0;
    spotLight.distance = 0;
    spotLight.castShadow = false;
    spotLight.position.set(1.8, 0, 0);
    spotLight.shadow.mapSize.width = 0;
    spotLight.shadow.mapSize.height = 0;
    spotLight.shadow.camera.near = 0.1;
    spotLight.shadow.camera.far = 10;
    spotLight.shadow.bias = -0.0001;
    spotLight.target.position.set(0, 0, 0);
  }, [spotLight]);

  return (
    <>
      <color attach="background" args={[palette.void]} />
      <ambientLight intensity={0.65} color={'#4895ef'} />

      {/* <primitive object={spotLight} />
          <primitive object={spotLight.target} /> */}
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
        <BorderBox
          size={[5.2 - 0.5, 0.08, 4.4 - 0.5]}
          position={[0, -0.1, 0]}
          backgroundColor={palette.ink}
          borderColor={palette.cream}
          receiveShadow
        />
        {tilePositions.map((position, index) => (
          <BorderBox
            key={index}
            size={[0.72, 0.1, 0.72]}
            position={position}
            backgroundColor={palette.white}
            borderColor={palette.cream}
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
      </group>
      {/* </PresentationControls> */}

      {/* Floating wall pieces — own orbit, screen corners */}
      <Wall
        path={WALL_PATHS.u}
        position={[-1.6, 0.45, -0.55]}
        cellSize={0.28}
        wallHeight={0.22}
        thickness={0.06}
        orbitSpeed={0.55}
        floatAmplitude={0.04}
        floatPhase={0}
      />
      <Wall
        path={WALL_PATHS.zigzagTall}
        position={[1.4, 0.45, -0.55]}
        cellSize={0.28}
        wallHeight={0.22}
        thickness={0.06}
        orbitSpeed={-0.45}
        floatAmplitude={0.04}
        floatPhase={1.2}
      />
      <Wall
        path={WALL_PATHS.snake}
        position={[-1.4, -0.3, 0.7]}
        cellSize={0.28}
        wallHeight={0.22}
        thickness={0.06}
        orbitSpeed={0.4}
        floatAmplitude={0.04}
        floatPhase={2.4}
      />
      <Wall
        path={WALL_PATHS.steps}
        position={[1.4, -0.3, 0.7]}
        cellSize={0.28}
        wallHeight={0.22}
        thickness={0.06}
        orbitSpeed={-0.5}
        floatAmplitude={0.04}
        floatPhase={3.6}
      />
    </>
  );
}
