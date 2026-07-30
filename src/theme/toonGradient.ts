import * as THREE from 'three/webgpu';

export function createToonGradient(steps = 4): THREE.DataTexture {
  const data = new Uint8Array(steps * 4);

  for (let i = 0; i < steps; i += 1) {
    const v = Math.round((i / Math.max(steps - 1, 1)) * 255);
    const o = i * 4;
    data[o] = v;
    data[o + 1] = v;
    data[o + 2] = v;
    data[o + 3] = 255;
  }

  const tex = new THREE.DataTexture(data, steps, 1);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export const toonGradient = createToonGradient(6);
