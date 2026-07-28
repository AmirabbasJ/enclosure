import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { OrbitControls as OrbitControlsImpl } from 'three/addons/controls/OrbitControls.js'
import { pixelationPass } from 'three/addons/tsl/display/PixelationPassNode.js'
import { uniform } from 'three/tsl'
import * as THREE from 'three/webgpu'

type PixelSceneProps = {
  pixelSize?: number
  normalEdgeStrength?: number
  depthEdgeStrength?: number
  pixelAlignedPanning?: boolean
  className?: string
}

function createCheckerTexture(size = 64, cells = 2): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cell = size / cells
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#e8e4d8' : '#575A57'
      ctx.fillRect(x * cell, y * cell, cell, cell)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function pixelAlignFrustum(
  camera: THREE.OrthographicCamera,
  aspectRatio: number,
  pixelsPerScreenWidth: number,
  pixelsPerScreenHeight: number,
) {
  const worldScreenWidth = (camera.right - camera.left) / camera.zoom
  const worldScreenHeight = (camera.top - camera.bottom) / camera.zoom
  const pixelWidth = worldScreenWidth / pixelsPerScreenWidth
  const pixelHeight = worldScreenHeight / pixelsPerScreenHeight

  const camPos = new THREE.Vector3()
  camera.getWorldPosition(camPos)
  const camRot = new THREE.Quaternion()
  camera.getWorldQuaternion(camRot)
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camRot)
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camRot)

  const fractX =
    camPos.dot(camRight) / pixelWidth -
    Math.round(camPos.dot(camRight) / pixelWidth)
  const fractY =
    camPos.dot(camUp) / pixelHeight -
    Math.round(camPos.dot(camUp) / pixelHeight)

  camera.left = -aspectRatio - fractX * pixelWidth
  camera.right = aspectRatio - fractX * pixelWidth
  camera.top = 1 - fractY * pixelHeight
  camera.bottom = -1 - fractY * pixelHeight
  camera.updateProjectionMatrix()
}

function Controls() {
  const { camera, gl } = useThree()
  const controls = useMemo(() => {
    const c = new OrbitControlsImpl(camera, gl.domElement)
    c.target.set(0, 0.3, 0)
    c.maxZoom = 2
    c.update()
    return c
  }, [camera, gl])

  useEffect(() => () => controls.dispose(), [controls])
  useFrame(() => controls.update())

  return null
}

function CheckerBox({
  size,
  position,
  rotationY,
  map,
}: {
  size: number
  position: [number, number, number]
  rotationY: number
  map: THREE.Texture
}) {
  return (
    <mesh
      castShadow
      receiveShadow
      position={position}
      rotation={[0, rotationY, 0]}
    >
      <boxGeometry args={[size, size, size]} />
      <meshPhongMaterial map={map} />
    </mesh>
  )
}

function PixelationPipeline({
  pixelSize,
  normalEdgeStrength,
  depthEdgeStrength,
  pixelAlignedPanning,
}: Required<
  Pick<
    PixelSceneProps,
    | 'pixelSize'
    | 'normalEdgeStrength'
    | 'depthEdgeStrength'
    | 'pixelAlignedPanning'
  >
>) {
  const { gl, scene, camera, size } = useThree()
  const sizeVec = useMemo(() => new THREE.Vector2(), [])

  const uniforms = useMemo(
    () => ({
      pixelSize: uniform(pixelSize),
      normalEdgeStrength: uniform(normalEdgeStrength),
      depthEdgeStrength: uniform(depthEdgeStrength),
    }),
    [],
  )

  const pipeline = useMemo(() => {
    const renderPipeline = new THREE.RenderPipeline(
      gl as unknown as THREE.WebGPURenderer,
    )
    renderPipeline.outputNode = pixelationPass(
      scene,
      camera,
      uniforms.pixelSize,
      uniforms.normalEdgeStrength,
      uniforms.depthEdgeStrength,
    )
    return renderPipeline
  }, [gl, scene, camera, uniforms])

  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera
    const aspect = size.width / Math.max(size.height, 1)
    ortho.left = -aspect
    ortho.right = aspect
    ortho.top = 1
    ortho.bottom = -1
    ortho.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  // Priority > 0 takes over rendering (skips R3F default gl.render).
  useFrame(() => {
    uniforms.pixelSize.value = pixelSize
    uniforms.normalEdgeStrength.value = normalEdgeStrength
    uniforms.depthEdgeStrength.value = depthEdgeStrength

    const ortho = camera as THREE.OrthographicCamera
    gl.getSize(sizeVec)
    const aspect = sizeVec.x / Math.max(sizeVec.y, 1)

    if (pixelAlignedPanning) {
      pixelAlignFrustum(
        ortho,
        aspect,
        Math.max(1, Math.floor(sizeVec.x / pixelSize)),
        Math.max(1, Math.floor(sizeVec.y / pixelSize)),
      )
    } else if (ortho.left !== -aspect || ortho.top !== 1) {
      ortho.left = -aspect
      ortho.right = aspect
      ortho.top = 1
      ortho.bottom = -1
      ortho.updateProjectionMatrix()
    }

    pipeline.render()
  }, 1)

  return null
}

function SceneContent(
  props: Required<
    Pick<
      PixelSceneProps,
      | 'pixelSize'
      | 'normalEdgeStrength'
      | 'depthEdgeStrength'
      | 'pixelAlignedPanning'
    >
  >,
) {
  const texChecker = useMemo(() => {
    const t = createCheckerTexture()
    t.repeat.set(3, 3)
    return t
  }, [])
  const texChecker2 = useMemo(() => {
    const t = createCheckerTexture()
    t.repeat.set(1.5, 1.5)
    return t
  }, [])

  useEffect(() => {
    return () => {
      texChecker.dispose()
      texChecker2.dispose()
    }
  }, [texChecker, texChecker2])

  return (
    <>
      <color attach="background" args={[0x151729]} />

      <ambientLight color={0xfffecd} intensity={3} />
      {/* <directionalLight
        color={0xfffecd}
        intensity={1.5}
        position={[100, 100, 100]}
        castShadow
        shadow-mapSize={[2048, 2048]}
      /> */}
    

      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshPhongMaterial  />
      </mesh>

      <CheckerBox
        size={0.4}
        position={[0, 0.2 + 0.0001, 0]}
        rotationY={Math.PI / 4}
        map={texChecker2}
      />
      <CheckerBox
        size={0.5}
        position={[-0.5, 0.25 + 0.0001, -0.5]}
        rotationY={Math.PI / 4}
        map={texChecker2}
      />

      <Controls />
      <PixelationPipeline {...props} />
    </>
  )
}

async function createWebGPURenderer(
  props: THREE.WebGPURendererParameters & { canvas: HTMLCanvasElement },
) {
  const renderer = new THREE.WebGPURenderer({ ...props, antialias: false })
  await renderer.init()
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.BasicShadowMap
  return renderer
}

/**
 * Port of three.js `webgpu_postprocessing_pixel` via React Three Fiber.
 * https://github.com/mrdoob/three.js/blob/master/examples/webgpu_postprocessing_pixel.html
 */
export function PixelScene({
  pixelSize = 6,
  normalEdgeStrength = 0.3,
  depthEdgeStrength = 0.4,
  pixelAlignedPanning = true,
  className,
}: PixelSceneProps) {
  return (
    <div className={className}>
      <Canvas
        orthographic
        dpr={1}
        shadows="basic"
        camera={{
          manual: true,
          position: [0, 2 * Math.tan(Math.PI / 6), 2],
          near: 0.1,
          far: 10,
        }}
        gl={async (props) =>
          createWebGPURenderer(
            props as THREE.WebGPURendererParameters & {
              canvas: HTMLCanvasElement
            },
          )
        }
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0)
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <SceneContent
          pixelSize={pixelSize}
          normalEdgeStrength={normalEdgeStrength}
          depthEdgeStrength={depthEdgeStrength}
          pixelAlignedPanning={pixelAlignedPanning}
        />
      </Canvas>
    </div>
  )
}
