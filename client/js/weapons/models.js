import * as THREE from 'three';

// Процедурные вьюмодели оружия (без внешних 3D-моделей).
// Ориентация: ствол смотрит вдоль -Z; точка выстрела — пустой Object3D `muzzle`.

const metal = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.4, metalness: 0.85 });
const dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.5, metalness: 0.8 });
const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.85, metalness: 0 });
const grip = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.7, metalness: 0.1 });

function box(parent, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = false;
  m.receiveShadow = false;
  parent.add(m);
  return m;
}

function muzzle(group, z) {
  const m = new THREE.Object3D();
  m.position.set(0, 0, z);
  group.add(m);
  return m;
}

export function buildWeaponModels() {
  return {
    knife: buildKnife(),
    glock: buildGlock(),
    deagle: buildDeagle(),
    ak47: buildAk47(),
  };
}

function buildKnife() {
  const g = new THREE.Group();
  box(g, wood, 0.035, 0.05, 0.13, 0, 0, 0.07);           // рукоять
  box(g, metal, 0.06, 0.02, 0.06, 0, 0, -0.01);          // гарда
  box(g, metal, 0.022, 0.03, 0.2, 0, 0.005, -0.12);      // клинок
  box(g, metal, 0.018, 0.024, 0.05, 0, 0.008, -0.22);    // остриё
  return { group: g, muzzle: muzzle(g, -0.26) };
}

function buildGlock() {
  const g = new THREE.Group();
  box(g, metal, 0.046, 0.05, 0.2, 0, 0, -0.02);          // затвор
  box(g, dark, 0.04, 0.045, 0.17, 0, -0.045, -0.02);     // рамка
  box(g, grip, 0.04, 0.12, 0.055, 0, -0.1, 0.05, 0.3);   // рукоять
  box(g, dark, 0.012, 0.012, 0.06, 0, -0.02, -0.12);     // скоба
  return { group: g, muzzle: muzzle(g, -0.13) };
}

function buildDeagle() {
  const g = new THREE.Group();
  box(g, metal, 0.052, 0.062, 0.28, 0, 0, -0.03);        // затвор
  box(g, dark, 0.046, 0.05, 0.22, 0, -0.055, -0.03);     // рамка
  box(g, grip, 0.045, 0.14, 0.06, 0, -0.115, 0.06, 0.32);// рукоять
  return { group: g, muzzle: muzzle(g, -0.18) };
}

function buildAk47() {
  const g = new THREE.Group();
  box(g, metal, 0.03, 0.03, 0.4, 0, 0.02, -0.28);        // ствол
  box(g, metal, 0.05, 0.06, 0.24, 0, 0, 0);              // ствольная коробка
  box(g, wood, 0.042, 0.05, 0.15, 0, -0.015, -0.2);      // цевьё
  box(g, metal, 0.04, 0.16, 0.09, 0, -0.11, -0.01, 0.35);// магазин
  box(g, wood, 0.046, 0.06, 0.18, 0, 0.035, 0.17, -0.18);// приклад
  box(g, dark, 0.04, 0.06, 0.05, 0, -0.05, 0.06, 0.25);  // пистолетная рукоять
  box(g, metal, 0.012, 0.05, 0.02, 0, 0.05, -0.45);      // мушка
  box(g, metal, 0.012, 0.03, 0.02, 0, 0.05, -0.06);      // целик
  return { group: g, muzzle: muzzle(g, -0.48) };
}
