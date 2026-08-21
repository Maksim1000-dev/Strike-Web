import * as THREE from 'three';
import { graphics } from '../../config.js';
import { createWorld, addBox, wallWithDoor, createTexturedMaterial } from '../common.js';
import {
  makeGroundTexture,
  makeDirtTexture,
  makeConcreteTexture,
  makeWoodTexture,
  makeCorrugatedMetalTexture,
  TEXTURE_PATHS,
} from '../../graphics/textures.js';
import { buildGrass } from '../grass.js';
import { buildCacti } from '../cacti.js';
import { GlassPane, updateShards } from '../breakables.js';

// Травянистая пустошь: трава, многоэтажки (внутрь нельзя) с ломающимися стёклами,
// контейнеры, старый дом-укрытие в центре.
export function buildWasteland(scene) {
  const world = createWorld(scene, {
    spawn: [0, 1.7, 22],
    sky: 0x8fc7e8,
    fogNear: 70,
    fogFar: 260,
    sunColor: 0xfff2d8,
    sunIntensity: 1.5,
    sunPos: [40, 60, 25],
    shadowExtent: 95,
    hemiSky: 0xbfe3ff,
    hemiGround: 0x6a7a4a,
  });

  const grassMat = createTexturedMaterial(world, graphics.level, {
    path: TEXTURE_PATHS.grass, procedural: makeGroundTexture, repeat: [28, 28], color: 0x6a8f4a, roughness: 0.95,
  });
  const dirt = createTexturedMaterial(world, graphics.level, {
    path: TEXTURE_PATHS.grunt, procedural: makeDirtTexture, repeat: [6, 6], color: 0x8a7448, roughness: 0.95,
  });
  const concrete = createTexturedMaterial(world, graphics.level, {
    path: TEXTURE_PATHS.beton, procedural: makeConcreteTexture, repeat: [3, 3], color: 0x9a9891, roughness: 0.9,
  });
  const wood = createTexturedMaterial(world, graphics.level, {
    procedural: makeWoodTexture, repeat: [2, 2], color: 0xa5886a, roughness: 0.9,
  });
  const metal = createTexturedMaterial(world, graphics.level, {
    procedural: makeCorrugatedMetalTexture, repeat: [3, 1], color: 0xffffff, roughness: 0.45, metalness: 0.85,
  });
  const fence = createTexturedMaterial(world, graphics.level, {
    procedural: makeWoodTexture, repeat: [10, 1], color: 0x8a6a48, roughness: 0.95,
  });
  const crate = createTexturedMaterial(world, graphics.level, {
    procedural: makeWoodTexture, repeat: [1, 1], color: 0xc98e52, roughness: 0.85,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbcd9e8, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.35,
  });

  // Земля
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  world.meshes.push(ground);
  world.bulletTargets.push(ground);
  world.ground = ground;

  // Грунтовые тропы
  for (const [px, pz, r] of [[0, 6, 5], [-8, -6, 4], [10, 8, 4], [-14, 12, 3.5]]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 20), dirt);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(px, 0.02, pz);
    patch.receiveShadow = true;
    scene.add(patch);
    world.meshes.push(patch);
    world.bulletTargets.push(patch);
  }

  // Граница поля (низкий забор, не перепрыгнуть)
  addBox(world, scene, { x: 0, z: -40, w: 84, h: 1.8, d: 0.5, material: fence });
  addBox(world, scene, { x: 0, z: 40, w: 84, h: 1.8, d: 0.5, material: fence });
  addBox(world, scene, { x: -40, z: 0, w: 0.5, h: 1.8, d: 80, material: fence });
  addBox(world, scene, { x: 40, z: 0, w: 0.5, h: 1.8, d: 80, material: fence });

  // --- Многоэтажки (внутрь нельзя) + ломающиеся окна ---
  const buildings = [
    { x: -16, z: -14, w: 10, d: 10, h: 14 },
    { x: 18, z: -12, w: 8, d: 8, h: 11 },
    { x: -18, z: 16, w: 9, d: 9, h: 12 },
    { x: 14, z: 18, w: 8, d: 8, h: 13 },
  ];
  const windowYs = [1.6, 4.0, 6.4, 8.8];

  for (const b of buildings) {
    addBox(world, scene, { x: b.x, z: b.z, w: b.w, h: b.h, d: b.d, material: concrete });

    // Окна на стороне, обращённой к центру карты.
    const facingSouth = b.z < 0;
    const faceZ = facingSouth ? b.z + b.d / 2 : b.z - b.d / 2;
    const off = facingSouth ? 0.06 : -0.06;
    const step = 2.2;
    const maxX = b.w / 2 - 0.9;
    const windowXs = [];
    for (let wx = -maxX; wx <= maxX + 0.01; wx += step) windowXs.push(b.x + wx);

    for (const wy of windowYs) {
      if (wy + 1.3 > b.h - 0.5) continue; // окно не выше крыши
      for (const wx of windowXs) {
        world.breakables.push(new GlassPane(scene, world, glassMat, { x: wx, y: wy, z: faceZ + off, w: 1.3, h: 1.3 }));
      }
    }
  }

  // --- Контейнеры (профнастил) ---
  addBox(world, scene, { x: 8, z: -6, w: 6, h: 2.6, d: 2.4, material: metal });
  addBox(world, scene, { x: 8, z: -3.2, w: 6, h: 2.6, d: 2.4, material: metal });
  addBox(world, scene, { x: 14.5, z: -4.7, w: 6, h: 2.6, d: 2.4, material: metal });

  // --- Старый дом в центре (можно прятаться) ---
  addBox(world, scene, { x: 0, z: -3.6, w: 7, h: 3.1, d: 0.4, material: wood });     // северная стена
  addBox(world, scene, { x: -3.6, z: 0, w: 0.4, h: 3.1, d: 7.6, material: wood });   // западная
  addBox(world, scene, { x: 3.6, z: 0, w: 0.4, h: 3.1, d: 7.6, material: wood });    // восточная
  wallWithDoor(world, scene, wood, { axis: 'x', x: 0, z: 3.8, w: 7.6, h: 3.1, d: 0.4, gapCenter: 0, gapW: 1.7 }); // южная с дверью

  // Ящики: внутри дома и у контейнеров
  addBox(world, scene, { x: 1.4, z: 1, w: 1.4, h: 1.1, d: 1.4, material: crate });
  addBox(world, scene, { x: -1.5, z: -1.5, w: 1.3, h: 1, d: 1.3, material: crate });
  addBox(world, scene, { x: 11, z: -1.5, w: 1.5, h: 1.5, d: 1.5, material: crate });

  // --- Трава и кактусы ---
  world.grass = buildGrass(scene, { count: graphics.level === 'low' ? 0 : 4000, radius: 46 });
  if (world.grass.mesh) world.meshes.push(world.grass.mesh);
  world.cacti = buildCacti(scene, [[20, -20], [23, -17], [-20, -22], [-24, -19]]);
  world.meshes.push(world.cacti.group);

  world.updateEffects = (dt) => {
    world.grass.update(dt);
    world.cacti.update(dt);
    updateShards(scene, dt, world.groundY);
  };

  world.applyGraphics = (g) => {
    grassMat.applyTextureLevel(g.level);
    dirt.applyTextureLevel(g.level);
    concrete.applyTextureLevel(g.level);
    wood.applyTextureLevel(g.level);
    metal.applyTextureLevel(g.level);
    fence.applyTextureLevel(g.level);
    crate.applyTextureLevel(g.level);
    world.grass.setWind(g.grassWind);
    world.cacti.setSway(g.grassWind);
  };

  return world;
}
