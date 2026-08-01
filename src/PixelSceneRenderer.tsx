/* eslint-disable @eslint-react/immutability */
import type { PropsWithChildren } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { pixelationPass } from 'three/addons/tsl/display/PixelationPassNode.js';
import { uniform } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { useGame } from '#/context/GameContext';

export const PIXEL_SIZE = 2.5;
export const NORMAL_EDGE = 0.3;
export const DEPTH_EDGE = 0;
export const PIXEL_ALIGNED_PANNING = true;

const PLAY_ZOOM = 1;
const INTRO_START_ZOOM = 0.8;
const INTRO_DURATION = 1.8;
/** View distance — ortho size from zoom; distance only buys near/far headroom. */
const CAM_DIST = 5;
const CAM_Y = CAM_DIST * Math.tan(Math.PI / 6);

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function IntroCameraZoom() {
  const { isPlaying: started } = useGame();
  const { camera } = useThree();
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = INTRO_START_ZOOM;
    ortho.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, delta) => {
    if (!started || doneRef.current) return;

    elapsedRef.current = Math.min(INTRO_DURATION, elapsedRef.current + delta);
    const t = easeInOutCubic(elapsedRef.current / INTRO_DURATION);
    const zoom = INTRO_START_ZOOM + (PLAY_ZOOM - INTRO_START_ZOOM) * t;

    const orthoCam = camera as THREE.OrthographicCamera;
    orthoCam.zoom = zoom;
    orthoCam.updateProjectionMatrix();

    if (elapsedRef.current >= INTRO_DURATION) {
      orthoCam.zoom = PLAY_ZOOM;
      orthoCam.updateProjectionMatrix();
      doneRef.current = true;
    }
  });

  return null;
}

function pixelAlignFrustum({
  camera,
  aspectRatio,
  pixelsPerScreenWidth,
  pixelsPerScreenHeight,
}: {
  camera: THREE.OrthographicCamera;
  aspectRatio: number;
  pixelsPerScreenWidth: number;
  pixelsPerScreenHeight: number;
}) {
  const worldScreenWidth = (camera.right - camera.left) / camera.zoom;
  const worldScreenHeight = (camera.top - camera.bottom) / camera.zoom;
  const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
  const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  const camRot = new THREE.Quaternion();
  camera.getWorldQuaternion(camRot);
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camRot);
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camRot);

  const fractX =
    camPos.dot(camRight) / pixelWidth -
    Math.round(camPos.dot(camRight) / pixelWidth);
  const fractY =
    camPos.dot(camUp) / pixelHeight -
    Math.round(camPos.dot(camUp) / pixelHeight);

  camera.left = -aspectRatio - fractX * pixelWidth;
  camera.right = aspectRatio - fractX * pixelWidth;
  camera.top = 1 - fractY * pixelHeight;
  camera.bottom = -1 - fractY * pixelHeight;
  camera.updateProjectionMatrix();
}

interface PixelationPipelineProps {
  pixelSize: number;
  normalEdgeStrength: number;
  depthEdgeStrength: number;
  pixelAlignedPanning: boolean;
}

export function PixelationPipeline({
  pixelSize,
  normalEdgeStrength,
  depthEdgeStrength,
  pixelAlignedPanning,
}: PixelationPipelineProps) {
  const { gl, scene, camera, size } = useThree();
  const sizeVec = useMemo(() => new THREE.Vector2(), []);

  const uniforms = useMemo(
    () => ({
      pixelSize: uniform(pixelSize),
      normalEdgeStrength: uniform(normalEdgeStrength),
      depthEdgeStrength: uniform(depthEdgeStrength),
    }),
    // eslint-disable-next-line @eslint-react/exhaustive-deps
    []
  );

  const pipeline = useMemo(() => {
    const renderPipeline = new THREE.RenderPipeline(
      gl as unknown as THREE.WebGPURenderer
    );
    renderPipeline.outputNode = pixelationPass(
      scene,
      camera,
      uniforms.pixelSize,
      uniforms.normalEdgeStrength,
      uniforms.depthEdgeStrength
    );
    return renderPipeline;
  }, [gl, scene, camera, uniforms]);

  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    const aspect = size.width / Math.max(size.height, 1);
    ortho.left = -aspect;
    ortho.right = aspect;
    ortho.top = 1;
    ortho.bottom = -1;
    ortho.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  useFrame(() => {
    uniforms.pixelSize.value = pixelSize;
    uniforms.normalEdgeStrength.value = normalEdgeStrength;
    uniforms.depthEdgeStrength.value = depthEdgeStrength;

    const ortho = camera as THREE.OrthographicCamera;
    gl.getSize(sizeVec);
    const aspect = sizeVec.x / Math.max(sizeVec.y, 1);

    if (pixelAlignedPanning) {
      pixelAlignFrustum({
        camera: ortho,
        aspectRatio: aspect,
        pixelsPerScreenWidth: Math.max(1, Math.floor(sizeVec.x / pixelSize)),
        pixelsPerScreenHeight: Math.max(1, Math.floor(sizeVec.y / pixelSize)),
      });
    } else if (ortho.left !== -aspect || ortho.top !== 1) {
      ortho.left = -aspect;
      ortho.right = aspect;
      ortho.top = 1;
      ortho.bottom = -1;
      ortho.updateProjectionMatrix();
    }

    pipeline.render();
  }, 1);

  return null;
}

export async function createWebGPURenderer(
  props: THREE.WebGPURendererParameters & { canvas: HTMLCanvasElement }
) {
  const renderer = new THREE.WebGPURenderer({ ...props, antialias: false });
  await renderer.init();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function PixelSceneRenderer({ children }: PropsWithChildren) {
  return (
    <Canvas
      orthographic
      dpr={1}
      shadows
      camera={{
        manual: true,
        zoom: INTRO_START_ZOOM,
        position: [0, CAM_Y, CAM_DIST],
        near: 0.1,
        far: 50,
      }}
      gl={async (props) => {
        return createWebGPURenderer(
          props as THREE.WebGPURendererParameters & {
            canvas: HTMLCanvasElement;
          }
        );
      }}
      onCreated={({ camera, gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        camera.lookAt(0, 0, 0);
      }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {children}
      <IntroCameraZoom />
      <PixelationPipeline
        pixelSize={PIXEL_SIZE}
        normalEdgeStrength={NORMAL_EDGE}
        depthEdgeStrength={DEPTH_EDGE}
        pixelAlignedPanning={PIXEL_ALIGNED_PANNING}
      />
    </Canvas>
  );
}
