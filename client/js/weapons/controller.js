import * as THREE from 'three';
import { WEAPONS, WEAPON_ORDER } from './data.js';
import { buildWeaponModels } from './models.js';
import { SoundFX } from './sound.js';
import { WeaponEffects } from './effects.js';

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _muzzlePos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Контроллер оружия: вьюмодель, переключение, стрельба (рейкаст), перезарядка, отдача.
export class WeaponController {
  constructor(scene, camera, world, hud) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.hud = hud;
    this.time = 0;

    this.sound = new SoundFX();
    this.effects = new WeaponEffects(scene);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 200;

    // Вьюмодель — ребёнок камеры (камера должна быть добавлена в сцену).
    this.viewmodel = new THREE.Group();
    this.viewmodel.position.set(0.32, -0.3, -0.55);
    camera.add(this.viewmodel);

    this.models = buildWeaponModels();
    for (const id of WEAPON_ORDER) {
      this.models[id].group.visible = false;
      this.viewmodel.add(this.models[id].group);
    }

    this.state = {};
    for (const id of WEAPON_ORDER) {
      const d = WEAPONS[id];
      this.state[id] = { ammo: d.magSize, reserve: d.reserve };
    }

    this.current = 'glock';
    this.reloading = false;
    this.reloadT = 0;
    this.lastFire = 0;
    this.triggerHeld = false;
    this.recoilPitch = 0;
    this.kick = 0;

    this._applyVisible();
    this._updateHud();
  }

  setWorld(world) { this.world = world; }
  clearEffects() { this.effects.clear(); }

  _applyVisible() {
    for (const id of WEAPON_ORDER) this.models[id].group.visible = (id === this.current);
  }

  switchTo(id) {
    if (!WEAPONS[id] || id === this.current) return;
    this.current = id;
    this.reloading = false;
    this.reloadT = 0;
    this._applyVisible();
    this.sound.ensure();
    this.sound.switchSound();
    this._updateHud();
  }

  cycle(dir) {
    const i = WEAPON_ORDER.indexOf(this.current);
    const n = (i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    this.switchTo(WEAPON_ORDER[n]);
  }

  setTriggerHeld(h) { this.triggerHeld = h; }

  reload() {
    const d = WEAPONS[this.current];
    if (this.reloading || d.melee) return;
    const st = this.state[this.current];
    if (st.ammo >= d.magSize || st.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = d.reloadTime;
    this.sound.ensure();
    this.sound.reload();
    this._updateHud();
  }

  tryFire() {
    this.sound.ensure();
    this.sound.resume();
    const d = WEAPONS[this.current];
    const st = this.state[this.current];
    if (this.reloading) return;
    if (d.melee) { this._swing(d); return; }
    if (st.ammo <= 0) { this.sound.dry(); this.reload(); return; }
    if (this.time - this.lastFire < d.fireInterval) return;
    this.lastFire = this.time;
    st.ammo--;
    this._shoot(d);
    this._updateHud();
  }

  _swing(d) {
    if (this.time - this.lastFire < d.fireInterval) return;
    this.lastFire = this.time;
    this.kick = 0.22;
    this.sound.swing();
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = d.range;
    const hits = this.raycaster.intersectObjects(this.world.meshes || [], true);
    if (hits.length) {
      const h = hits[0];
      this.effects.impact(h.point, this._faceNormal(h));
      this._tryBreakGlass(h.object);
      this.hud.showHitmarker();
    }
  }

  _shoot(d) {
    const spread = d.spread + this.recoilPitch * 3;
    this.camera.getWorldDirection(_dir);
    _dir.x += (Math.random() - 0.5) * spread;
    _dir.y += (Math.random() - 0.5) * spread;
    _dir.z += (Math.random() - 0.5) * spread * 0.5;
    _dir.normalize();

    this.camera.getWorldPosition(_pos);
    this.raycaster.set(_pos, _dir);
    this.raycaster.far = d.range;
    const hits = this.raycaster.intersectObjects(this.world.meshes || [], true);

    this.models[this.current].muzzle.getWorldPosition(_muzzlePos);

    let end;
    if (hits.length) {
      const h = hits[0];
      end = h.point;
      this.effects.impact(h.point, this._faceNormal(h));
      this._tryBreakGlass(h.object);
      this.hud.showHitmarker();
    } else {
      end = _muzzlePos.clone().addScaledVector(_dir, d.range);
    }

    this.effects.muzzleFlash(_muzzlePos);
    this.effects.tracer(_muzzlePos, end);

    this.recoilPitch += d.recoil;
    this.camera.rotation.x += d.recoil;
    this.kick = Math.min(0.12, 0.05 + d.recoil * 4);

    this.sound.shot(d.sound);
  }

  _faceNormal(hit) {
    if (hit.face && hit.face.normal) {
      return hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    }
    return _up.clone();
  }

  _tryBreakGlass(object) {
    const panes = this.world.breakables || [];
    for (const p of panes) {
      if (p.mesh === object && !p.broken) { p.break(); break; }
    }
  }

  update(dt, moving) {
    this.time += dt;

    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this._finishReload();
    }

    // Авто-огонь (AK-47) — пока зажата ЛКМ.
    if (this.triggerHeld && WEAPONS[this.current].auto && !this.reloading) {
      this.tryFire();
    }

    // Возврат камеры после отдачи.
    if (this.recoilPitch > 0.0001) {
      const recover = this.recoilPitch * 7 * dt;
      this.camera.rotation.x -= recover;
      this.recoilPitch -= recover;
      if (this.recoilPitch < 0) this.recoilPitch = 0;
    }

    if (this.kick > 0) this.kick = Math.max(0, this.kick - 3.5 * dt);

    this._updateViewmodel(moving);
    this.effects.update(dt);
    this.hud.setCrosshair(this._crosshairSize());
  }

  _finishReload() {
    const d = WEAPONS[this.current];
    const st = this.state[this.current];
    const take = Math.min(d.magSize - st.ammo, st.reserve);
    st.ammo += take;
    st.reserve -= take;
    this.reloading = false;
    this._updateHud();
  }

  _updateViewmodel(moving) {
    const t = this.time;
    const swayX = Math.sin(t * 1.4) * 0.004;
    const swayY = Math.sin(t * 1.1) * 0.003;
    let x = 0.32 + swayX + (moving ? -0.02 : 0);
    let y = -0.3 + swayY + (moving ? -0.015 : 0);
    let z = -0.55 + this.kick;
    let rx = 0;
    if (this.reloading) {
      const d = WEAPONS[this.current];
      const p = 1 - this.reloadT / d.reloadTime;
      y -= 0.15 * Math.sin(p * Math.PI);
      rx += 0.45 * Math.sin(p * Math.PI);
    }
    this.viewmodel.position.set(x, y, z);
    this.viewmodel.rotation.set(rx, 0, 0);
  }

  _crosshairSize() {
    const d = WEAPONS[this.current];
    const base = 3 + d.spread * 1600;
    return Math.max(3, Math.min(22, base + this.recoilPitch * 350));
  }

  _updateHud() {
    const d = WEAPONS[this.current];
    const st = this.state[this.current];
    this.hud.setWeapon(d.name, d.melee ? null : st.ammo, d.melee ? null : st.reserve, d.melee);
    this.hud.setReloading(this.reloading);
  }
}
