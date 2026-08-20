import * as THREE from 'three';
import { mulberry32 } from '../utils/random.js';

// Простые процедурные кактусы (ствол + «руки»). В Ultra слегка покачиваются.
export function buildCacti(scene, positions = []) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2f7a3f, roughness: 0.75 });
  const rng = mulberry32(7);

  const pivots = [];
  positions.forEach(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);

    const h = 1.3 + rng() * 1.3;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, h, 10), bodyMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    pivot.add(trunk);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8);
    const arm1 = new THREE.Mesh(armGeo, bodyMat);
    arm1.position.set(0.17, h * 0.55, 0);
    arm1.rotation.z = Math.PI / 2 - 0.25;
    arm1.castShadow = true;
    pivot.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, bodyMat);
    arm2.position.set(-0.17, h * 0.45, 0.08);
    arm2.rotation.z = -(Math.PI / 2 - 0.2);
    arm2.castShadow = true;
    pivot.add(arm2);

    group.add(pivot);
    pivots.push({ pivot, phase: rng() * Math.PI * 2 });
  });

  scene.add(group);

  let time = 0;
  let sway = 0;

  return {
    group,
    update(dt) {
      time += dt;
      for (const p of pivots) {
        p.pivot.rotation.z = Math.sin(time * 0.9 + p.phase) * 0.03 * sway;
      }
    },
    setSway(v) {
      sway = v;
    },
  };
}
