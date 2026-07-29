import { palette } from '#/theme/palette'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three/webgpu'

export type OrbKind = 'good' | 'bad'

const ORB_COLOR: Record<OrbKind, string> = {
  good: palette.good,
  bad: palette.bad,
}

/** Defaults: good lights dominate scene; bad stay dim. */
const ORB_LIGHT: Record<
  OrbKind,
  { intensity: number; distance: number }
> = {
  good: { intensity: 2.5, distance: 2.2 },
  bad: { intensity: 0.35, distance: 0.9 },
}

type LightOrbProps = {
  kind?: OrbKind
  position?: [number, number, number]
  /** Sphere / cone size scale. */
  radius?: number
  /** Override pointLight intensity. */
  intensity?: number
  /** Override pointLight range (0 = infinite). */
  distance?: number
  floatAmplitude?: number
  floatPhase?: number
}

function OrbMaterial({
  color,
  flatShading = false,
}: {
  color: string
  flatShading?: boolean
}) {
  return (
    <meshPhysicalMaterial
      color={color}
      emissive={color}
      emissiveIntensity={0.85}
      roughness={0.08}
      metalness={0.65}
      clearcoat={1}
      clearcoatRoughness={0.05}
      reflectivity={1}
      flatShading={flatShading}
    />
  )
}

/** Floating light marker — sphere (good) or pyramid (bad) + point light. */
export function LightOrb({
  kind = 'good',
  position = [0, 0, 0],
  radius = 0.12,
  intensity,
  distance,
  floatAmplitude = 0.06,
  floatPhase = 0,
}: LightOrbProps) {
  const groupRef = useRef<Group>(null)
  const color = ORB_COLOR[kind]
  const light = ORB_LIGHT[kind]
  const lightIntensity = intensity ?? light.intensity
  const lightDistance = distance ?? light.distance

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    const t = clock.getElapsedTime()
    g.position.y =
      position[1] + Math.sin(t * 1.4 + floatPhase) * floatAmplitude
    if (kind === 'bad') {
      g.rotation.y = t * 0.4
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {kind === 'good' ? (
        <mesh>
          <sphereGeometry args={[radius * 1.1, 32, 32]} />
          <OrbMaterial color={color} />
        </mesh>
      ) : (
        <mesh>
          <coneGeometry args={[radius, radius * 2.2, 4]} />
          <OrbMaterial color={color} flatShading />
        </mesh>
      )}
      <pointLight
        color={color}
        intensity={lightIntensity}
        distance={lightDistance}
        decay={1}
        position={[0, 0.02, 0]}
      />
    </group>
  )
}
