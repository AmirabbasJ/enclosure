import type { Camera, Object3D } from 'three/webgpu';

import * as THREE from 'three/webgpu';

import type { WallDockCorner, WallId } from '#/domain/walls';

import { GROUND_WALL_Y } from '#/domain/board';
import { WALL_DOCK_CORNER, WALL_DOCK_NDC } from '#/domain/walls';

const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();
const _planePoint = new THREE.Vector3();
const _plane = new THREE.Plane();
const _raycaster = new THREE.Raycaster();
const _up = new THREE.Vector3(0, 1, 0);

/** Project canvas NDC corner through camera onto board-local ground. */
export function projectDockHome({
  corner,
  camera,
  board,
  planeY = GROUND_WALL_Y,
}: {
  corner: WallDockCorner;
  camera: Camera;
  board: Object3D;
  planeY?: number;
}): [number, number, number] {
  const { x: ndcX, y: ndcY } = WALL_DOCK_NDC[corner];
  _ndc.set(ndcX, ndcY);
  _raycaster.setFromCamera(_ndc, camera);

  _planePoint.set(0, planeY, 0);
  board.localToWorld(_planePoint);
  _plane.setFromNormalAndCoplanarPoint(_up, _planePoint);

  if (!_raycaster.ray.intersectPlane(_plane, _hit)) {
    return [0, planeY, 0];
  }

  board.worldToLocal(_hit);
  return [_hit.x, planeY, _hit.z];
}

export function wallDockHome({
  wallId,
  camera,
  board,
}: {
  wallId: WallId;
  camera: Camera;
  board: Object3D;
}): [number, number, number] {
  board.updateWorldMatrix(true, false);
  return projectDockHome({
    corner: WALL_DOCK_CORNER[wallId],
    camera,
    board,
  });
}
