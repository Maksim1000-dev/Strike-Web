import * as THREE from 'three';

// Эффекты стрельбы: вспышка у дула, трассер, следы от пуль (декали), искры попаданий.
export class WeaponEffects {
  constructor(scene) {
    this.scene = scene;

    // Вспышка у дула: свет + спрайт.
    this.flashLight = new THREE.PointLight(0xffc46a, 0, 9, 1.8);
    this.scene.add(this.flashLight);
    this.flashMat = new THREE.SpriteMaterial({
      color: 0xffc880, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.flashSprite = new THREE.Sprite(this.flashMat);
    this.flashSprite.scale.set(0.16, 0.16, 0.16);
    this.flashSprite.visible = false;
    this.scene.add(this.flashSprite);
    this.flashT = 0;

    // Трассер.
    this.tracerGeo = new THREE.BufferGeometry();
    this.tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.tracerMat = new THREE.LineBasicMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.tracer = new THREE.Line(this.tracerGeo, this.tracerMat);
    this.tracer.frustumCulled = false;
    this.tracer.visible = false;
    this.scene.add(this.tracer);
    this.tracerT = 0;

    // Пулевые следы.
    this.decalPool = [];
    this.decalIdx = 0;
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 12),
        new THREE.MeshBasicMaterial({
          color: 0x0d0d0d, transparent: true, opacity: 0.7,
          depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
        })
      );
      m.visible = false;
      this.scene.add(m);
      this.decalPool.push({ mesh: m, life: 0, max: 0 });
    }

    // Искры/вспышки на месте попадания.
    this.impactPool = [];
    this.impactIdx = 0;
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.SpriteMaterial({
        color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      });
      const s = new THREE.Sprite(mat);
      s.scale.set(0.08, 0.08, 0.08);
      s.visible = false;
      this.scene.add(s);
      this.impactPool.push({ sprite: s, life: 0 });
    }
  }

  muzzleFlash(pos) {
    this.flashLight.position.copy(pos);
    this.flashLight.intensity = 3.5;
    this.flashSprite.position.copy(pos);
    this.flashSprite.material.rotation = Math.random() * Math.PI * 2;
    this.flashSprite.visible = true;
    this.flashT = 0.045;
  }

  tracer(from, to) {
    const arr = this.tracerGeo.attributes.position.array;
    arr[0] = from.x; arr[1] = from.y; arr[2] = from.z;
    arr[3] = to.x; arr[4] = to.y; arr[5] = to.z;
    this.tracerGeo.attributes.position.needsUpdate = true;
    this.tracer.visible = true;
    this.tracerT = 0.06;
  }

  impact(point, normal) {
    const d = this.decalPool[this.decalIdx];
    this.decalIdx = (this.decalIdx + 1) % this.decalPool.length;
    const m = d.mesh;
    m.position.copy(point).addScaledVector(normal, 0.015);
    m.lookAt(point.clone().add(normal));
    m.rotateZ(Math.random() * Math.PI * 2);
    const s = 0.04 + Math.random() * 0.04;
    m.scale.set(s, s, s);
    m.material.opacity = 0.75;
    m.visible = true;
    d.life = 5;
    d.max = 5;

    const f = this.impactPool[this.impactIdx];
    this.impactIdx = (this.impactIdx + 1) % this.impactPool.length;
    f.sprite.position.copy(point).addScaledVector(normal, 0.03);
    f.sprite.visible = true;
    f.life = 0.05;
  }

  update(dt) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flashLight.intensity = 0; this.flashSprite.visible = false; }
    }
    if (this.tracerT > 0) {
      this.tracerT -= dt;
      if (this.tracerT <= 0) this.tracer.visible = false;
    }
    for (const d of this.decalPool) {
      if (!d.mesh.visible) continue;
      d.life -= dt;
      if (d.life <= 0) { d.mesh.visible = false; continue; }
      d.mesh.material.opacity = 0.75 * Math.min(1, d.life / (d.max * 0.15));
    }
    for (const f of this.impactPool) {
      if (!f.sprite.visible) continue;
      f.life -= dt;
      if (f.life <= 0) f.sprite.visible = false;
    }
  }

  clear() {
    this.flashLight.intensity = 0;
    this.flashSprite.visible = false;
    this.tracer.visible = false;
    for (const d of this.decalPool) d.mesh.visible = false;
    for (const f of this.impactPool) f.sprite.visible = false;
  }
}
