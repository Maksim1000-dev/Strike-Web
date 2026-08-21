import * as THREE from 'three';
import { graphics } from '../../config.js';
import { createWorld, addBox, wallWithDoor, arch, createTexturedMaterial } from '../common.js';
import {
  makeSandTexture,
  makeConcreteTexture,
  makeWoodTexture,
  TEXTURE_PATHS,
} from '../../graphics/textures.js';
import { updateShards } from '../breakables.js';

// Пустынная карта в стиле de_dust2: песок, мид-коридор, сайты, арки, ящики.
export function buildDesert2(scene) {
  const world = createWorld(scene, {
    spawn: [0, 1.7, 30],
    sky: 0xe8d3a2,
    fogNear: 70,
    fogFar: 260,
    sunColor: 0xffe7bd,
    sunIntensity: 1.7,
    sunPos: [50, 70, 30],
    shadowExtent: 95,
    hemiSky: 0xfff1d6,
    hemiGround: 0x9a7b52,
  });

  const sand = createTexturedMaterial(world, graphics.level, {
    path: TEXTURE_PATHS.sand, procedural: makeSandTexture, repeat: [18, 18], color: 0xd9bd8a, roughness: 0.96,
  });
  const concrete = createTexturedMaterial(world, graphics.level, {
    path: TEXTURE_PATHS.beton, procedural: makeConcreteTexture, repeat: [3, 3], color: 0xa8a296, roughness: 0.9,
  });
  const stone = createTexturedMaterial(world, graphics.level, {
    path: TEXTURE_PATHS.beton, procedural: makeConcreteTexture, repeat: [2, 2], color: 0xb8a985, roughness: 0.92,
  });
  const crate = createTexturedMaterial(world, graphics.level, {
    procedural: makeWoodTexture, repeat: [1, 1], color: 0xd9a865, roughness: 0.85,
  });

  // Земля
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  world.meshes.push(ground);
  world.ground = ground;

  // Внешние стены (периметр)
  addBox(world, scene, { x: 0, z: -38, w: 80, h: 6, d: 2, material: concrete });
  addBox(world, scene, { x: 0, z: 38, w: 80, h: 6, d: 2, material: concrete });
  addBox(world, scene, { x: -38, z: 0, w: 2, h: 6, d: 76, material: concrete });
  addBox(world, scene, { x: 38, z: 0, w: 2, h: 6, d: 76, material: concrete });

  // Мид: две продольные стены с дверными проёмами
  wallWithDoor(world, scene, concrete, { axis: 'z', x: -7, z: 0, w: 1.2, h: 4.5, d: 44, gapCenter: 0, gapW: 3.2 });
  wallWithDoor(world, scene, concrete, { axis: 'z', x: 7, z: 0, w: 1.2, h: 4.5, d: 44, gapCenter: 0, gapW: 3.2 });

  // Поперечная стена на севере с проёмом
  wallWithDoor(world, scene, concrete, { axis: 'x', x: 0, z: -14, w: 14, h: 4.5, d: 1.2, gapCenter: 0, gapW: 3.2 });

  // Боковые «сайты» A (запад) и B (восток)
  wallWithDoor(world, scene, stone, { axis: 'x', x: -18, z: -4, w: 12, h: 3.4, d: 1.2, gapCenter: -14, gapW: 2.4 });
  wallWithDoor(world, scene, stone, { axis: 'x', x: 18, z: -4, w: 12, h: 3.4, d: 1.2, gapCenter: 14, gapW: 2.4 });

  // Арки
  arch(world, scene, concrete, -12, -14);
  arch(world, scene, concrete, 12, 12);

  // Ящики — укрытия
  addBox(world, scene, { x: -18, z: 6, w: 2.4, h: 2.4, d: 2.4, material: crate });
  addBox(world, scene, { x: -15.4, z: 7.6, w: 1.7, h: 1.7, d: 1.7, material: crate });
  addBox(world, scene, { x: 18, z: 6, w: 2.4, h: 2.4, d: 2.4, material: crate });
  addBox(world, scene, { x: 20.4, z: 7.6, w: 1.7, h: 1.7, d: 1.7, material: crate });
  addBox(world, scene, { x: 0, z: 8, w: 2.4, h: 2.4, d: 2.4, material: crate });
  addBox(world, scene, { x: -2.8, z: 9.5, w: 1.6, h: 1.6, d: 1.6, material: crate });

  // Каменные блоки-укрытия
  addBox(world, scene, { x: -22, z: -2, w: 2, h: 1.4, d: 2, material: stone });
  addBox(world, scene, { x: 22, z: -2, w: 2, h: 1.4, d: 2, material: stone });

  world.updateEffects = (dt) => {
    updateShards(scene, dt, world.groundY);
  };

  world.applyGraphics = (g) => {
    sand.applyTextureLevel(g.level);
    concrete.applyTextureLevel(g.level);
    stone.applyTextureLevel(g.level);
    crate.applyTextureLevel(g.level);
  };

  return world;
}
