import type { Group, Object3D, SpotLight } from 'three';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

import { palette } from '#/theme/palette';

export type OrbKind = 'bad' | 'good';

const ORB_COLOR: Record<OrbKind, string> = {
  good: palette.accent,
  bad: palette.danger,
};

const ORB_LIGHT: Record<
  OrbKind,
  {
    fillIntensity: number;
    fillDistance: number;
    spotIntensity: number;
    spotDistance: number;
    spotAngle: number;
  }
> = {
  good: {
    fillIntensity: 1.4,
    fillDistance: 1.8,
    spotIntensity: 1,
    spotDistance: 1.6,
    spotAngle: 0.7,
  },
  bad: {
    fillIntensity: 0.25,
    fillDistance: 0.8,
    spotIntensity: 0.8,
    spotDistance: 1.4,
    spotAngle: 0.5,
  },
};

interface LightOrbProps {
  kind?: OrbKind;
  position?: [number, number, number];
  radius?: number;
  floatAmplitude?: number;
  floatPhase?: number;
}

function OrbMaterial({ color }: { color: string }) {
  return <meshBasicMaterial color={color} toneMapped={false} />;
}

const defaultPosition = [0, 0, 0] as [number, number, number];

export function LightOrb({
  kind = 'good',
  position = defaultPosition,
  radius = 0.12,
  floatAmplitude = 0.06,
  floatPhase = 0,
}: LightOrbProps) {
  const rootRef = useRef<Group>(null);
  const meshRef = useRef<Group>(null);
  const spotRef = useRef<SpotLight>(null);
  const spotTargetRef = useRef<Object3D>(null);
  const color = ORB_COLOR[kind];
  const light = ORB_LIGHT[kind];
  const tileY = -position[1];

  useEffect(() => {
    const spot = spotRef.current;
    const target = spotTargetRef.current;
    if (!spot || !target) return;
    spot.target = target;
    spot.target.updateMatrixWorld();
  }, []);

  useFrame(({ clock }) => {
    const root = rootRef.current;
    const mesh = meshRef.current;
    if (!root) return;
    const t = clock.getElapsedTime();
    root.position.y =
      position[1] + Math.sin(t * 1.4 + floatPhase) * floatAmplitude;

    if (kind === 'bad' && mesh) {
      mesh.rotation.y = t * 0.4;
    }
  });

  return (
    <group ref={rootRef} position={position}>
      <group ref={meshRef}>
        {kind === 'good' ? (
          <mesh>
            <sphereGeometry args={[radius * 1.1, 32, 32]} />
            <OrbMaterial color={color} />
          </mesh>
        ) : (
          <mesh>
            <coneGeometry args={[radius, radius * 2.2, 4]} />
            <OrbMaterial color={color} />
          </mesh>
        )}
      </group>

      <pointLight
        color={color}
        intensity={light.fillIntensity}
        distance={light.fillDistance}
        decay={1}
        position={[0, 0.02, 0]}
      />

      <spotLight
        ref={spotRef}
        color={color}
        intensity={light.spotIntensity}
        distance={light.spotDistance}
        decay={1.5}
        angle={light.spotAngle}
        penumbra={1}
        position={[0, 0.05, 0]}
      />
      <object3D ref={spotTargetRef} position={[0, tileY, 0]} />
    </group>
  );
}
