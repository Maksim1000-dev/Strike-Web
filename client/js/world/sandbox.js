import * as THREE from 'three';
import { makeGroundTexture, makeSandTexture, makeCorrugatedMetalTexture, loadTexture, TEXTURE_PATHS } from '../graphics/textures.js';
import { buildGrass } from './grass.js';
import { buildCacti } from './cacti.js';
import { graphics } from '../config.js';

// Песочница для проверки ядра и графики: земля, ящики, трава, кактусы, песчаные зоны.
export function buildSandbox(scene) {
  const world = {
    groundY: 0,
    colliders: [],
    spawn: new THREE.Vector3(0, 1.7, 16),
    grass: null,
    cacti: null,
  };

  // --- Небо и туман ---
  const skyColor = new THREE.Color(0x87ceeb);
  scene.background = skyColor;
  scene.fog = new THREE.Fog(skyColor, 60, 240);

  // --- Свет ---
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a6f4d, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
  sun.position.set(40, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // --- Земля ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture(graphics.level), roughness: 0.95, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  world.ground = ground;

  // Сетка помогает ощущать движение (скрываем в Ultra).
  const grid = new THREE.GridHelper(160, 80, 0x5a4a32, 0x6f5d40);
  grid.position.y = 0.01;
  scene.add(grid);
  world.grid = grid;

  // --- Песчаные зоны под кактусами ---
  const sandMat = new THREE.MeshStandardMaterial({ map: makeSandTexture(graphics.level), roughness: 0.9 });
  const sandPatches = [];
  for (const [sx, sz] of [[-8, -6], [11, -9], [13, 7]]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), sandMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(sx, 0.02, sz);
    patch.receiveShadow = true;
    scene.add(patch);
    sandPatches.push(patch);
  }
  world.sandPatches = sandPatches;

  // --- Препятствия (ящики и колонны) ---
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xc08a4a, roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.85 });
  // Профнастил генерируется процедурно — контейнеры/панели.
  const metalMat = new THREE.MeshStandardMaterial({
    map: makeCorrugatedMetalTexture(graphics.level),
    roughness: 0.45,
    metalness: 0.85,
  });
  // Бетон — реальная текстура в Medium/Ultra, плоский серый в Low.
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9a9891, roughness: 0.9, metalness: 0 });

  const box = (x, z, w, h, d, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    world.colliders.push({
      min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
      max: new THREE.Vector3(x + w / 2, h, z + d / 2),
    });
  };

  box(-3, 0, 2, 2, 2, crateMat);
  box(0, -2, 2, 2, 2, crateMat);
  box(3, 1, 2, 1.4, 2, crateMat);
  box(-1, 4, 2, 3, 1.2, darkMat);

  box(-10, 0, 1.4, 6, 1.4, darkMat);
  box(10, -3, 1.4, 6, 1.4, darkMat);
  box(-10, -8, 1.4, 6, 1.4, darkMat);
  box(10, 8, 1.4, 6, 1.4, darkMat);

  box(-16, -12, 3, 10, 3, crateMat);
  box(16, 12, 3, 10, 3, darkMat);

  // Контейнер из профнастила — превью процедурного металла (заготовка под Часть 3).
  box(6, 3, 3, 2.4, 6, metalMat);

  // Бетонная стена — превью текстуры бетона (стены многоэтажек, Часть 3).
  box(-7, 5, 0.6, 4, 6, concreteMat);

  // --- Реальные текстуры (Medium/Ultra) с процедурным fallback ---
  const applyGroundTexture = (level) => {
    ground.material.map = makeGroundTexture(level);
    ground.material.needsUpdate = true;
    if (level === 'low') return;
    loadTexture(TEXTURE_PATHS.grass).then((tex) => {
      if (tex && graphics.level !== 'low') {
        tex.repeat.set(24, 24);
        ground.material.map = tex;
        ground.material.needsUpdate = true;
      }
    });
  };

  const applySandTexture = (level) => {
    sandMat.map = makeSandTexture(level);
    sandMat.needsUpdate = true;
    if (level === 'low') return;
    loadTexture(TEXTURE_PATHS.sand).then((tex) => {
      if (tex && graphics.level !== 'low') {
        tex.repeat.set(4, 4);
        sandMat.map = tex;
        sandMat.needsUpdate = true;
      }
    });
  };

  const applyConcreteTexture = (level) => {
    concreteMat.map = null;
    concreteMat.color.set(0x9a9891);
    concreteMat.needsUpdate = true;
    if (level === 'low') return;
    loadTexture(TEXTURE_PATHS.beton).then((tex) => {
      if (tex && graphics.level !== 'low') {
        tex.repeat.set(2, 2);
        concreteMat.map = tex;
        concreteMat.needsUpdate = true;
      }
    });
  };

  // Сразу грузим реальные текстуры под текущий пресет.
  applyGroundTexture(graphics.level);
  applySandTexture(graphics.level);
  applyConcreteTexture(graphics.level);

  // --- Трава и кактусы ---
  world.grass = buildGrass(scene, { count: graphics.level === 'low' ? 0 : 4500 });
  world.cacti = buildCacti(scene, [[-8, -6], [-6.2, -4.2], [11, -9], [13, -7.2], [13, 7], [15, 8.2]]);

  // Применение настроек графики к этой сцене.
  world.applyGraphics = (g) => {
    applyGroundTexture(g.level);
    applySandTexture(g.level);
    applyConcreteTexture(g.level);
    metalMat.map = makeCorrugatedMetalTexture(g.level);
    metalMat.needsUpdate = true;
    grid.visible = g.level !== 'ultra';
    world.grass.setWind(g.grassWind);
    world.cacti.setSway(g.grassWind);
  };

  // Покадровые эффекты (ветер, покачивание).
  world.updateEffects = (dt) => {
    world.grass.update(dt);
    world.cacti.update(dt);
  };

  return world;
}
