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

// --- Реальные текстуры из client/assets/textures/ ---
// Medium/Ultra используют загруженные файлы; если файла нет — вернём null и подставим процедурную.

export const TEXTURE_PATHS = {
  grass: '/assets/textures/ground/grass_diffuse.png',
  grunt: '/assets/textures/ground/grunt_diffuse.png',
  sand: '/assets/textures/ground/sand_diffuse.png',
  beton: '/assets/textures/buildings/beton_diffuse.png',
};

const loaderCache = new Map();

export function loadTexture(path) {
  if (loaderCache.has(path)) return loaderCache.get(path);
  const promise = new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      path,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        resolve(tex);
      },
      undefined,
      () => resolve(null) // не загрузилась — используем процедурную
    );
  });
  loaderCache.set(path, promise);
  return promise;
}

// Профнастил (гофрированный металл) — генерируется процедурно.
// Вертикальные рёбра трапециевидного профиля + лёгкая «сталь» и полосы износа.
// Бесшовный: профиль строится по фазе u * ridges, поэтому края текстуры сходятся.
export function makeCorrugatedMetalTexture(level, repeat = 4) {
  const p = PRESETS[level];
  const rand = mulberry32(71);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = p.size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(p.size, p.size);
  const data = img.data;

  const ridges = level === 'low' ? 5 : level === 'medium' ? 12 : 22; // число рёбер на текстуру
  const flat = 0.22;   // доля плоской вершины ребра
  const slope = 0.16;  // доля скоса

  const ridgeProfile = (t) => {
    if (t < flat) return 1.0;
    if (t < flat + slope) return 1.0 - (t - flat) / slope;
    if (t < 1 - flat - slope) return 0.0;
    if (t < 1 - flat) return (t - (1 - flat - slope)) / slope;
    return 1.0;
  };

  for (let y = 0; y < p.size; y++) {
    const v = y / p.size;
    for (let x = 0; x < p.size; x++) {
      const u = x / p.size;
      const phase = u * ridges;
      const t = phase - Math.floor(phase);
      const ridge = ridgeProfile(t);

      // Стальной цвет: тёмный в желобе, светлый на вершине ребра.
      let luma = 0.42 + 0.5 * ridge;

      // Периодические полосы износа + зернистость (бесшовные).
      luma += Math.sin(u * Math.PI * 2 * 2) * 0.03;
      luma += Math.sin(v * Math.PI * 2 * 5) * 0.02;
      luma += (rand() - 0.5) * 0.07;

      luma = Math.max(0, Math.min(1, luma));
      const r = luma * 0.80 * 255;
      const g = luma * 0.83 * 255;
      const b = luma * 0.90 * 255;

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
  tex.repeat.set(repeat, repeat);
  return tex;
}

// Бетон — процедурный (fallback для real-текстуры beton).
export function makeConcreteTexture(level, repeat = 3) {
  const stops = [
    [168, 166, 160],
    [150, 148, 142],
    [180, 178, 172],
    [158, 156, 150],
  ];
  const tex = makeTexture(level, 53, stops, level === 'low' ? 0 : 6);
  tex.repeat.set(repeat, repeat);
  return tex;
}

// Грунт — процедурный (fallback для real-текстуры grunt).
export function makeDirtTexture(level, repeat = 8) {
  const stops = [
    [110, 84, 58],
    [94, 70, 48],
    [124, 98, 70],
    [102, 78, 54],
  ];
  const tex = makeTexture(level, 59, stops, level === 'low' ? 0 : 9);
  tex.repeat.set(repeat, repeat);
  return tex;
}

// Дерево (доски) — процедурное: зерно вдоль X + доски со швами.
export function makeWoodTexture(level, repeat = 2) {
  const p = PRESETS[level];
  const noise = makeValueNoise(41);
  const rand = mulberry32(41);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = p.size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(p.size, p.size);
  const data = img.data;

  const planks = level === 'low' ? 4 : level === 'medium' ? 8 : 12;
  const plankH = p.size / planks;
  const plankShade = [];
  for (let i = 0; i < planks; i++) plankShade[i] = 0.78 + rand() * 0.3;

  for (let y = 0; y < p.size; y++) {
    const pi = Math.min(planks - 1, Math.floor(y / plankH));
    const shade = plankShade[pi];
    const seam = (y % plankH) < (level === 'low' ? 2 : 1.5);
    for (let x = 0; x < p.size; x++) {
      const grain = fbm(noise, x * 0.012, y * 0.06, 3); // зерно вдоль X
      const streak = Math.sin(x * 0.02 + grain * 6) * 8; // прожилки
      let r = 128 * shade + grain * 36 + streak;
      let g = 84 * shade + grain * 22 + streak;
      let b = 52 * shade + grain * 12 + streak;
      if (seam) { r *= 0.5; g *= 0.46; b *= 0.4; }
      const i = (y * p.size + x) * 4;
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(repeat, repeat);
  return tex;
}
