import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type PropsWithChildren } from 'react';
import { pixelationPass } from 'three/addons/tsl/display/PixelationPassNode.js';
import { uniform } from 'three/tsl';
import * as THREE from 'three/webgpu';

export const PIXEL_SIZE = 3;
export const NORMAL_EDGE = 0.3;
export const DEPTH_EDGE = 0;
export const PIXEL_ALIGNED_PANNING = true;

function pixelAlignFrustum(
  camera: THREE.OrthographicCamera,
  aspectRatio: number,
  pixelsPerScreenWidth: number,
  pixelsPerScreenHeight: number
) {
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

type PixelationPipelineProps = {
  pixelSize: number;
  normalEdgeStrength: number;
  depthEdgeStrength: number;
  pixelAlignedPanning: boolean;
};

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
      pixelAlignFrustum(
        ortho,
        aspect,
        Math.max(1, Math.floor(sizeVec.x / pixelSize)),
        Math.max(1, Math.floor(sizeVec.y / pixelSize))
      );
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
  renderer.shadowMap.type = THREE.BasicShadowMap;
  return renderer;
}

export function PixelSceneRenderer({ children }: PropsWithChildren) {
  return (
    <Canvas
      orthographic
      dpr={1}
      camera={{
        manual: true,
        position: [0, 2 * Math.tan(Math.PI / 6), 2],
        near: 0.1,
        far: 10,
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
        camera.lookAt(0, 0, 0);
      }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {children}
      <PixelationPipeline
        pixelSize={PIXEL_SIZE}
        normalEdgeStrength={NORMAL_EDGE}
        depthEdgeStrength={DEPTH_EDGE}
        pixelAlignedPanning={PIXEL_ALIGNED_PANNING}
      />
    </Canvas>
  );
}
