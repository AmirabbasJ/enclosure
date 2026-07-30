import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';

import { toonGradient } from '#/theme/toonGradient';

interface BorderBoxProps {
  size: number | [number, number, number];
  position?: [number, number, number];
  rotationY?: number;
  rotation?: [number, number, number];
  borderColor: number | string;
  showBorder?: boolean;
  backgroundColor?: number | string;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

function toSize(
  size: number | [number, number, number]
): [number, number, number] {
  return typeof size === 'number' ? [size, size, size] : size;
}

const defaultPosition = [0, 0, 0] as [number, number, number];

export function BorderBox({
  size,
  position = defaultPosition,
  rotationY = 0,
  rotation,
  borderColor,
  showBorder = true,
  backgroundColor,
  castShadow = false,
  receiveShadow = false,
}: BorderBoxProps) {
  const [w, h, d] = toSize(size);
  const rot = rotation ?? [0, rotationY, 0];

  const boxGeo = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  const edgesGeo = useMemo(
    () => (showBorder ? new THREE.EdgesGeometry(boxGeo) : null),
    [boxGeo, showBorder]
  );

  useEffect(() => {
    return () => {
      boxGeo.dispose();
      edgesGeo?.dispose();
    };
  }, [boxGeo, edgesGeo]);

  const hasFill = backgroundColor !== undefined;
  return (
    <group position={position} rotation={rot}>
      <mesh
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        geometry={boxGeo}
      >
        {hasFill ? (
          <meshToonMaterial
            color={backgroundColor}
            gradientMap={toonGradient}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        ) : (
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        )}
      </mesh>
      {showBorder && edgesGeo ? (
        <lineSegments
          geometry={edgesGeo}
          renderOrder={2}
          // Edges use a fat Line threshold — would steal hits around the box.
          raycast={() => undefined}
        >
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
  );
}
