import { PixelScene } from '#/components/PixelScene'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [pixelSize, setPixelSize] = useState(4)
  const [normalEdge, setNormalEdge] = useState(0.3)
  const [depthEdge, setDepthEdge] = useState(1)
  const [pixelAlignedPanning, setPixelAlignedPanning] = useState(true)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#151729] px-4  text-neutral-100">
      <PixelScene
        className="h-screen w-full overflow-hidden rounded border border-white/10"
        pixelSize={pixelSize}
        normalEdgeStrength={normalEdge}
        depthEdgeStrength={depthEdge}
        pixelAlignedPanning={pixelAlignedPanning}
      />

      <div className="flex hidden w-full max-w-[640px] flex-col gap-3 rounded border border-white/10 bg-black/40 p-4 text-sm">
        <p className="text-xs text-white/60">
          three.js WebGPU pixelation · drag to orbit
        </p>
        <label className="flex flex-col gap-1">
          Pixel size {pixelSize}
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={pixelSize}
            onChange={(e) => setPixelSize(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          Normal edge {normalEdge.toFixed(2)}
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={normalEdge}
            onChange={(e) => setNormalEdge(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          Depth edge {depthEdge.toFixed(2)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={depthEdge}
            onChange={(e) => setDepthEdge(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pixelAlignedPanning}
            onChange={(e) => setPixelAlignedPanning(e.target.checked)}
          />
          Pixel-aligned panning
        </label>
      </div>
    </div>
  )
}
