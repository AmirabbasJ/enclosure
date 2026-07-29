import { useEffect, useMemo } from 'react'
import * as THREE from 'three/webgpu'

type BorderBoxProps = {
  /** Uniform edge length, or [width, height, depth]. */
  size: number | [number, number, number]
  position?: [number, number, number]
  /** Y-axis rotation in radians. */
  rotationY?: number
  rotation?: [number, number, number]
  borderColor: string | number
  /** When false, skip EdgesGeometry (fill only). Default true. */
  showBorder?: boolean
  /** Omit for transparent fill (border only). */
  backgroundColor?: string | number
  castShadow?: boolean
  receiveShadow?: boolean
}

function toSize(size: number | [number, number, number]): [number, number, number] {
  return typeof size === 'number' ? [size, size, size] : size
}

/**
 * Box with colored edges. Optional solid fill; without `backgroundColor` only borders render.
 */
export function BorderBox({
  size,
  position = [0, 0, 0],
  rotationY = 0,
  rotation,
  borderColor,
  showBorder = true,
  backgroundColor,
  castShadow = false,
  receiveShadow = false,
}: BorderBoxProps) {
  const [w, h, d] = toSize(size)
  const rot = rotation ?? [0, rotationY, 0]

  const boxGeo = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d])
  const edgesGeo = useMemo(
    () => (showBorder ? new THREE.EdgesGeometry(boxGeo) : null),
    [boxGeo, showBorder],
  )

  useEffect(() => {
    return () => {
      boxGeo.dispose()
      edgesGeo?.dispose()
    }
  }, [boxGeo, edgesGeo])

  const hasFill = backgroundColor !== undefined
  return (
    <group position={position} rotation={rot}>
      <mesh
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        geometry={boxGeo}
      >
        {hasFill ? (
          <meshStandardMaterial
            color={backgroundColor}
            roughness={0.55}
            metalness={0.05}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        ) : (
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        )}
      </mesh>
      {showBorder && edgesGeo ? (
        <lineSegments geometry={edgesGeo} renderOrder={2}>
          <lineBasicMaterial
            color={borderColor}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </lineSegments>
      ) : null}
    </group>
  )
}
