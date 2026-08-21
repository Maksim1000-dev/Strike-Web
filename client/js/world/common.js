import * as THREE from 'three';
import { graphics } from '../config.js';
import { loadTexture } from '../graphics/textures.js';
import { clearShards } from './breakables.js';

// ---------- Базовый мир карты: небо, туман, свет ----------
export function createWorld(scene, opts = {}) {
  const world = {
    groundY: 0,
    colliders: [],
    breakables: [],
    spawn: new THREE.Vector3(...(opts.spawn || [0, 1.7, 16])),
    meshes: [],              // вся геометрия (для освобождения при смене карты)
    bulletTargets: [],       // то, во что попадают пули (без травы/кактусов — быстрее рейкаст)
    lights: [],              // источники света (без raycast)
    proceduralTextures: [],  // процедурные текстуры этой карты (dispose при смене)
    updateEffects: null,
    applyGraphics: null,
    skyColor: null,
    fog: null,
  };

  const sky = new THREE.Color(opts.sky ?? 0x87ceeb);
  scene.background = sky;
  world.skyColor = sky;

  const fog = new THREE.Fog(sky, opts.fogNear ?? 60, opts.fogFar ?? 240);
  scene.fog = fog;
  world.fog = fog;

  const hemi = new THREE.HemisphereLight(
    opts.hemiSky ?? 0xbfe3ff,
    opts.hemiGround ?? 0x8a6f4d,
    opts.hemiIntensity ?? 0.9
  );
  scene.add(hemi);
  world.lights.push(hemi);

  const sun = new THREE.DirectionalLight(opts.sunColor ?? 0xfff2d8, opts.sunIntensity ?? 1.5);
  sun.position.set(opts.sunPos?.[0] ?? 40, opts.sunPos?.[1] ?? 60, opts.sunPos?.[2] ?? 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const ext = opts.shadowExtent ?? 70;
  sun.shadow.camera.left = -ext;
  sun.shadow.camera.right = ext;
  sun.shadow.camera.top = ext;
  sun.shadow.camera.bottom = -ext;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  world.lights.push(sun);
  world.sun = sun;

  return world;
}

// ---------- Коробка: меш + AABB-коллизия ----------
export function addBox(world, scene, { x = 0, y = 0, z = 0, w = 1, h = 1, d = 1, material, castShadow = true, receiveShadow = true }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  scene.add(mesh);
  world.meshes.push(mesh);
  world.bulletTargets.push(mesh);
  world.colliders.push({
    min: new THREE.Vector3(x - w / 2, y, z - d / 2),
    max: new THREE.Vector3(x + w / 2, y + h, z + d / 2),
  });
  return mesh;
}

// ---------- Стена с дверным проёмом ----------
// axis 'x': стена идёт вдоль X (длина = w, толщина = d), проём по X в точке gapCenter.
// axis 'z': стена идёт вдоль Z (длина = d, толщина = w), проём по Z в точке gapCenter.
export function wallWithDoor(world, scene, material, { axis, x, z, w, h, d, gapCenter, gapW }) {
  const half = gapW / 2;
  if (axis === 'x') {
    const from = x - w / 2;
    const to = x + w / 2;
    const a = gapCenter - half;
    const b = gapCenter + half;
    if (a - from > 0) addBox(world, scene, { x: (from + a) / 2, z, w: a - from, h, d, material });
    if (to - b > 0) addBox(world, scene, { x: (b + to) / 2, z, w: to - b, h, d, material });
  } else {
    const from = z - d / 2;
    const to = z + d / 2;
    const a = gapCenter - half;
    const b = gapCenter + half;
    if (a - from > 0) addBox(world, scene, { x, z: (from + a) / 2, w, h, d: a - from, material });
    if (to - b > 0) addBox(world, scene, { x, z: (b + to) / 2, w, h, d: to - b, material });
  }
}

// ---------- Арка (декоративный проём): две колонны + перемычка сверху ----------
export function arch(world, scene, material, x, z, alongZ = true) {
  const pw = 0.9;    // ширина колонны
  const gap = 2.6;   // ширина прохода
  const ph = 3.4;    // высота проёма
  const top = 4.6;   // высота верха
  const thick = 1.6;
  const half = gap / 2 + pw / 2;

  if (alongZ) {
    addBox(world, scene, { x: x - half, z, w: pw, h: top, d: thick, material });
    addBox(world, scene, { x: x + half, z, w: pw, h: top, d: thick, material });
    addBox(world, scene, { x, y: ph, z, w: gap + pw, h: top - ph, d: thick, material });
  } else {
    addBox(world, scene, { x, z: z - half, w: thick, h: top, d: pw, material });
    addBox(world, scene, { x, z: z + half, w: thick, h: top, d: pw, material });
    addBox(world, scene, { x, y: ph, z, w: thick, h: top - ph, d: gap + pw, material });
  }
}

// ---------- Материал: реальная текстура (Medium/Ultra) + процедурный fallback ----------
export function createTexturedMaterial(world, level, {
  path = null,
  procedural = null,
  repeat = [1, 1],
  color = 0xffffff,
  roughness = 0.9,
  metalness = 0,
}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });

  mat.applyTextureLevel = (lvl) => {
    mat.map = null;
    mat.color.set(color);
    mat.needsUpdate = true;

    if (procedural) {
      const t = procedural(lvl);
      if (t) {
        t.repeat.set(repeat[0], repeat[1]);
        mat.map = t;
        mat.needsUpdate = true;
        world.proceduralTextures.push(t);
      }
    }

    if (lvl !== 'low' && path) {
      loadTexture(path).then((tex) => {
        if (tex && graphics.level !== 'low') {
          tex.repeat.set(repeat[0], repeat[1]);
          mat.map = tex;
          mat.needsUpdate = true;
        }
      });
    }
  };

  mat.applyTextureLevel(level);
  return mat;
}

// ---------- Очистка мира при смене карты ----------
export function disposeWorld(scene, world) {
  if (!world) return;
  const mats = new Set();
  for (const m of world.meshes || []) {
    m.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        arr.forEach((mm) => mats.add(mm));
      }
    });
    scene.remove(m);
  }
  mats.forEach((mm) => mm.dispose());
  for (const l of world.lights || []) scene.remove(l);
  for (const t of world.proceduralTextures || []) t.dispose();

  if (world.breakables) world.breakables.length = 0;
  world.colliders.length = 0;
  clearShards(scene);
}
