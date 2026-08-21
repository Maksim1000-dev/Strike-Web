import * as THREE from 'three';
import { mulberry32 } from '../utils/random.js';

// Поле травы: тысячи травинок через InstancedMesh.
// Шейдер качает травинки ветром — в Ultra ветер включён (uWind=1), в Medium трава статична.
export function buildGrass(scene, opts = {}) {
  const count = opts.count ?? 4500;
  const radius = opts.radius ?? 42;

  // В Low трава выключена — возвращаем заглушку.
  if (count <= 0) {
    return { mesh: null, update() {}, setWind() {} };
  }
  const bladeW = 0.06;
  const bladeH = 0.95;

  const geo = new THREE.PlaneGeometry(bladeW, bladeH, 1, 4);
  geo.translate(0, bladeH / 2, 0); // основание травинки в y = 0

  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a8f38,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const phases = new Float32Array(count);
  const dummy = new THREE.Object3D();
  const rng = mulberry32(opts.seed ?? 1);

  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius; // равномернее по площади
    const s = 0.55 + rng() * 1.0;
    dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0);
    dummy.scale.set(1, s, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    phases[i] = rng() * Math.PI * 2;
  }

  mesh.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const time = { value: 0 };
  const wind = { value: 0 };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nuniform float uWind;\nattribute float aPhase;'
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float sway = sin(uTime * 1.7 + aPhase) * 0.20 * uWind;
          float sway2 = cos(uTime * 1.3 + aPhase * 1.4) * 0.12 * uWind;
          float bend = uv.y * uv.y; // основание закреплено, верх качается
          transformed.x += sway * bend;
          transformed.z += sway2 * bend;
        }`
      );
    mat.userData.shader = shader;
  };

  scene.add(mesh);

  return {
    mesh,
    update(dt) {
      time.value += dt;
    },
    setWind(v) {
      wind.value = v;
    },
  };
}
