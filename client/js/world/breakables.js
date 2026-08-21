import * as THREE from 'three';

// Ломающиеся стёкла + осколки. Стекло разбивается выстрелом (пока — левый клик,
// в Части 4 будет выстрел из оружия).

const shards = []; // глобальный список летящих осколков

export function spawnShards(scene, pos) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xcfe9f5,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.75,
  });
  const count = 9;
  for (let i = 0; i < count; i++) {
    const s = 0.04 + Math.random() * 0.16;
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, 0.03), mat);
    m.position.copy(pos);
    m.position.x += (Math.random() - 0.5) * 0.4;
    m.position.y += (Math.random() - 0.5) * 0.4;
    m.position.z += (Math.random() - 0.5) * 0.4;
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(m);
    shards.push({
      mesh: m,
      mat,
      vx: (Math.random() - 0.5) * 3.5,
      vy: 1 + Math.random() * 2,
      vz: (Math.random() - 0.5) * 3.5,
      life: 0,
      ttl: 0.9 + Math.random() * 0.5,
    });
  }
}

export function updateShards(scene, dt, groundY = 0) {
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.life += dt;
    s.vy -= 12 * dt;
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.y += s.vy * dt;
    s.mesh.position.z += s.vz * dt;
    s.mesh.rotation.x += dt * 4;
    s.mesh.rotation.y += dt * 3;

    if (s.mesh.position.y < groundY + 0.04) {
      s.mesh.position.y = groundY + 0.04;
      s.vy *= -0.25;
      s.vx *= 0.6;
      s.vz *= 0.6;
    }

    if (s.life > s.ttl) {
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mat.dispose();
      shards.splice(i, 1);
    }
  }
}

export function clearShards(scene) {
  for (const s of shards) {
    scene.remove(s.mesh);
    if (s.mesh.geometry) s.mesh.geometry.dispose();
    if (s.mat) s.mat.dispose();
  }
  shards.length = 0;
}

export class GlassPane {
  constructor(scene, world, material, { x, y, z, w, h, ry = 0 }) {
    this.scene = scene;
    this.world = world;
    this.w = w;
    this.h = h;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), material);
    this.mesh.position.set(x, y + h / 2, z);
    this.mesh.rotation.y = ry;
    this.mesh.castShadow = false;
    scene.add(this.mesh);
    if (world && world.meshes) world.meshes.push(this.mesh);
    this.broken = false;
  }

  break() {
    if (this.broken) return;
    this.broken = true;
    spawnShards(this.scene, this.mesh.position.clone());
    this.scene.remove(this.mesh);
  }
}
