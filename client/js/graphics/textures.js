import * as THREE from 'three';
import { mulberry32 } from '../utils/random.js';

// Процедурные текстуры на основе value-noise + fBm.
// Качество влияет на размер и число октав: low — грубо и мелко, ultra — детально и крупно.
// (Заготовка под «реальные текстуры из интернета»: в этом окружении внешние CDN закрыты,
//  поэтому пока генерируем процедурно — заменить на загружаемые PBR-текстуры можно позже.)

const PRESETS = {
  low: { size: 128, octaves: 2, speckle: 0 },
  medium: { size: 512, octaves: 5, speckle: 400 },
  ultra: { size: 1024, octaves: 7, speckle: 1400 },
};

function makeValueNoise(seed) {
  const rand = mulberry32(seed);
  const SIZE = 8;
  const lattice = [];
  for (let i = 0; i < SIZE; i++) {
    lattice[i] = [];
    for (let j = 0; j < SIZE; j++) lattice[i][j] = rand();
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  return function (x, y) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const fx = x - gx;
    const fy = y - gy;
    const ix = ((gx % SIZE) + SIZE) % SIZE;
    const iy = ((gy % SIZE) + SIZE) % SIZE;
    const ix2 = (ix + 1) % SIZE;
    const iy2 = (iy + 1) % SIZE;
    const a = lattice[ix][iy];
    const b = lattice[ix2][iy];
    const c = lattice[ix][iy2];
    const d = lattice[ix2][iy2];
    const u = smooth(fx);
    const v = smooth(fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(noise, x, y, octaves) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    value += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / norm;
}

function lerpColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function sampleGradient(stops, t) {
  if (t <= 0) return stops[0];
  if (t >= 1) return stops[stops.length - 1];
  const seg = t * (stops.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  return lerpColor(stops[i], stops[i + 1], f);
}

function makeTexture(level, seed, stops, speckleIntensity) {
  const p = PRESETS[level];
  const noise = makeValueNoise(seed);
  const rand = mulberry32(seed + 1234);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = p.size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(p.size, p.size);
  const data = img.data;
  const scale = 4.0 / p.size; // частота шума не зависит от разрешения

  for (let y = 0; y < p.size; y++) {
    for (let x = 0; x < p.size; x++) {
      const n = fbm(noise, x * scale, y * scale, p.octaves);
      let [r, g, b] = sampleGradient(stops, n);

      // Зернистость/детали — имитация «реальной» поверхности.
      if (p.speckle > 0) {
        const grain = (rand() - 0.5) * 2 * speckleIntensity;
        r = Math.max(0, Math.min(255, r + grain));
        g = Math.max(0, Math.min(255, g + grain));
        b = Math.max(0, Math.min(255, b + grain));
      }

      const i = (y * p.size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Земля (трава) — для песочницы/травянистой карты.
export function makeGroundTexture(level, repeat = 24) {
  const stops = [
    [86, 130, 66],
    [66, 110, 52],
    [112, 154, 84],
    [76, 120, 58],
  ];
  const tex = makeTexture(level, 11, stops, level === 'low' ? 0 : 8);
  tex.repeat.set(repeat, repeat);
  return tex;
}

// Песок — для пустынных зон/карты Desert 2.
export function makeSandTexture(level, repeat = 8) {
  const stops = [
    [196, 168, 118],
    [212, 184, 132],
    [176, 148, 100],
    [204, 178, 126],
  ];
  const tex = makeTexture(level, 29, stops, level === 'low' ? 0 : 10);
  tex.repeat.set(repeat, repeat);
  return tex;
}
