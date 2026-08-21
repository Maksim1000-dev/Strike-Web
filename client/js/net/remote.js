import * as THREE from 'three';

// Управление удалёнными игроками: тело-капсула + ник над головой, интерполяция.
export class RemotePlayers {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map(); // id -> { group, body, label, hp, dead, tx, ty, tz }
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xd85a3a, roughness: 0.7, metalness: 0.05 });
  }

  get hitMeshes() {
    return [...this.players.values()].filter((p) => !p.dead).map((p) => p.body);
  }

  add(id, name, state) {
    if (this.players.has(id)) return;
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.0, 4, 10),
      this.bodyMat.clone()
    );
    body.position.y = -0.85;
    body.castShadow = true;
    body.userData.remoteId = id;
    group.add(body);

    const label = makeNameSprite(name);
    label.position.y = 0.35;
    group.add(label);

    const px = state && state.p ? state.p[0] : 0;
    const py = state && state.p ? state.p[1] : 1.7;
    const pz = state && state.p ? state.p[2] : 0;
    group.position.set(px, py, pz);

    this.scene.add(group);
    this.players.set(id, {
      id,
      name,
      group,
      body,
      label,
      hp: state ? state.hp : 100,
      dead: false,
      tx: px, ty: py, tz: pz,
    });
  }

  updateState(id, p, r) {
    const pl = this.players.get(id);
    if (!pl || !p) return;
    pl.tx = p[0]; pl.ty = p[1]; pl.tz = p[2];
  }

  setHp(id, hp, dead) {
    const pl = this.players.get(id);
    if (!pl) return;
    pl.hp = hp;
    pl.dead = dead;
    pl.body.visible = !dead;
  }

  remove(id) {
    const pl = this.players.get(id);
    if (!pl) return;
    this.scene.remove(pl.group);
    pl.body.geometry.dispose();
    pl.body.material.dispose();
    if (pl.label) {
      pl.label.material.map?.dispose();
      pl.label.material.dispose();
    }
    this.players.delete(id);
  }

  update(dt) {
    const k = Math.min(1, dt * 12);
    const v = new THREE.Vector3();
    for (const pl of this.players.values()) {
      if (pl.dead) continue;
      v.set(pl.tx, pl.ty, pl.tz);
      pl.group.position.lerp(v, k);
    }
  }

  clear() {
    for (const id of [...this.players.keys()]) this.remove(id);
  }
}

function makeNameSprite(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  c.font = '600 30px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(0, 0, 256, 64);
  c.fillStyle = '#ffffff';
  c.fillText(String(name).slice(0, 14), 128, 34);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(2.4, 0.6, 1);
  return sp;
}
