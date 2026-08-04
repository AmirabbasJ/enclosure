import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';

import { toonGradient } from '#/theme/toonGradient';

export interface BorderOccluder {
  position: [number, number, number];
  size: [number, number, number];
}

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
  allPieces?: readonly BorderOccluder[];
  pieceIndex?: number;
}

function toSize(
  size: number | [number, number, number]
): [number, number, number] {
  return typeof size === 'number' ? [size, size, size] : size;
}

const defaultPosition = [0, 0, 0] as [number, number, number];

function boxEdgePairs(
  w: number,
  h: number,
  d: number
): [THREE.Vector3, THREE.Vector3][] {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const p = (px: number, py: number, pz: number) =>
    new THREE.Vector3(px, py, pz);

  return [
    [p(-x, -y, -z), p(x, -y, -z)],
    [p(-x, -y, z), p(x, -y, z)],
    [p(-x, y, -z), p(x, y, -z)],
    [p(-x, y, z), p(x, y, z)],
    [p(-x, -y, -z), p(-x, y, -z)],
    [p(x, -y, -z), p(x, y, -z)],
    [p(-x, -y, z), p(-x, y, z)],
    [p(x, -y, z), p(x, y, z)],
    [p(-x, -y, -z), p(-x, -y, z)],
    [p(x, -y, -z), p(x, -y, z)],
    [p(-x, y, -z), p(-x, y, z)],
    [p(x, y, -z), p(x, y, z)],
  ];
}

function pointInOccluder({
  wx,
  wy,
  wz,
  occluder,
  eps,
}: {
  wx: number;
  wy: number;
  wz: number;
  occluder: BorderOccluder;
  eps: number;
}): boolean {
  const [ox, oy, oz] = occluder.position;
  const [sx, sy, sz] = occluder.size;
  return (
    wx >= ox - sx / 2 - eps &&
    wx <= ox + sx / 2 + eps &&
    wy >= oy - sy / 2 - eps &&
    wy <= oy + sy / 2 + eps &&
    wz >= oz - sz / 2 - eps &&
    wz <= oz + sz / 2 + eps
  );
}

function pointOccluded({
  eps,
  local,
  occluders,
  selfPos,
}: {
  local: THREE.Vector3;
  selfPos: [number, number, number];
  occluders: readonly BorderOccluder[];
  eps: number;
}): boolean {
  const wx = local.x + selfPos[0];
  const wy = local.y + selfPos[1];
  const wz = local.z + selfPos[2];

  for (const occluder of occluders) {
    if (pointInOccluder({ wx, wy, wz, occluder, eps })) return true;
  }

  return false;
}

function buildOccludedEdgesGeometry({
  w,
  h,
  d,
  selfPos,
  occluders,
  eps,
  samples = 10,
}: {
  w: number;
  h: number;
  d: number;
  selfPos: [number, number, number];
  occluders: readonly BorderOccluder[];
  eps: number;
  samples?: number;
}): THREE.BufferGeometry {
  const positions: number[] = [];
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const mid = new THREE.Vector3();

  for (const [a, b] of boxEdgePairs(w, h, d)) {
    for (let i = 0; i < samples; i += 1) {
      const t0 = i / samples;
      const t1 = (i + 1) / samples;
      tmpA.lerpVectors(a, b, t0);
      tmpB.lerpVectors(a, b, t1);
      mid.lerpVectors(tmpA, tmpB, 0.5);
      if (pointOccluded({ local: mid, selfPos, occluders, eps })) continue;
      positions.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

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
  allPieces,
  pieceIndex,
}: BorderBoxProps) {
  const [w, h, d] = toSize(size);
  const rot = rotation ?? [0, rotationY, 0];
  const pos = position;

  const boxGeo = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  const edgesGeo = useMemo(() => {
    if (!showBorder) return null;
    if (allPieces && pieceIndex !== undefined && allPieces.length > 1) {
      const occluders = allPieces.filter((_, i) => i !== pieceIndex);
      return buildOccludedEdgesGeometry({
        w,
        h,
        d,
        selfPos: pos,
        occluders,
        eps: 0.012,
      });
    }

    return new THREE.EdgesGeometry(boxGeo);
  }, [boxGeo, showBorder, allPieces, pieceIndex, w, h, d, pos]);

  useEffect(() => {
    return () => {
      boxGeo.dispose();
    };
  }, [boxGeo]);

  useEffect(() => {
    return () => {
      edgesGeo?.dispose();
    };
  }, [edgesGeo]);

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
