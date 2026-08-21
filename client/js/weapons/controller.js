import * as THREE from 'three';
import { WEAPONS, WEAPON_ORDER } from './data.js';
import { buildWeaponModels } from './models.js';
import { SoundFX } from './sound.js';
import { WeaponEffects } from './effects.js';

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _muzzlePos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Контроллер оружия: вьюмодель, переключение (только купленное), стрельба (рейкаст),
// перезарядка, отдача.
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

    this.owned = ['knife'];      // оружие, которое купил игрок
    this.current = 'knife';      // по умолчанию — нож (бесплатный)
    this.reloading = false;
    this.reloadT = 0;
    this.lastFire = 0;
    this._lastDry = 0;           // троттлинг «сухого» клика (пустой магазин)
    this.triggerHeld = false;
    this.recoilPitch = 0;
    this.kick = 0;

    this.player = null;   // ссылка на контроллер игрока (для ADS)
    this.onSwitch = null; // вызывается при смене оружия
    this.remoteTargetsProvider = null; // () => меши удалённых игроков
    this.onPlayerHit = null; // (remoteId, damage, weaponId) => {}

    this._applyVisible();
    this._updateHud();
  }

  setWorld(world) { this.world = world; }
  clearEffects() { this.effects.clear(); }

  setOwned(list) {
    this.owned = Array.isArray(list) && list.length ? list : ['knife'];
    if (!this.owned.includes(this.current)) {
      this.current = 'knife';
      this._applyVisible();
      this._updateHud();
    }
  }

  _applyVisible() {
    for (const id of WEAPON_ORDER) this.models[id].group.visible = (id === this.current);
  }

  _ensureAudio() {
    this.sound.ensure();
    this.sound.resume();
  }

  switchTo(id) {
    if (!WEAPONS[id] || id === this.current) return;
    if (!this.owned.includes(id)) {
      this.hud.flashMessage(`«${WEAPONS[id].name}» не куплен — загляни в магазин`);
      return;
    }
    this.current = id;
    this.reloading = false;
    this.reloadT = 0;
    this._applyVisible();
    this._ensureAudio();
    this.sound.switchSound();
    this._updateHud();
    if (this.onSwitch) this.onSwitch();
  }

  cycle(dir) {
    const list = WEAPON_ORDER.filter((w) => this.owned.includes(w));
    if (!list.length) return;
    const i = list.indexOf(this.current);
    const n = (i + dir + list.length) % list.length;
    this.switchTo(list[n]);
  }

  setTriggerHeld(h) { this.triggerHeld = h; }

  reload() {
    const d = WEAPONS[this.current];
    if (this.reloading || d.melee) return;
    const st = this.state[this.current];
    if (st.ammo >= d.magSize || st.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = d.reloadTime;
    this._ensureAudio();
    this.sound.reload();
    this._updateHud();
  }

  // Выстрел (вызывается по клику и каждый кадр для авто-оружия).
  tryFire() {
    const d = WEAPONS[this.current];
    const st = this.state[this.current];
    if (this.reloading) return;
    if (d.melee) { this._swing(d); return; }

    // Проверка скорострельности ДО работы со звуком — иначе при зажатой ЛКМ
    // мы бы каждый кадр дёргали AudioContext (это и вешало игру на AK).
    if (this.time - this.lastFire < d.fireInterval) return;

    if (st.ammo <= 0) {
      // Пустой магазин: один «сухой» клик и одна попытка перезарядки (не спамить!).
      if (this.time - this._lastDry >= 0.4) {
        this._lastDry = this.time;
        this._ensureAudio();
        this.sound.dry();
        this.reload();
      }
      return;
    }

    this.lastFire = this.time;
    st.ammo--;
    this._ensureAudio();
    this._shoot(d);
    this._updateHud();
  }

  _swing(d) {
    if (this.time - this.lastFire < d.fireInterval) return;
    this.lastFire = this.time;
    this._ensureAudio();
    this.kick = 0.22;
    this.sound.swing();
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = d.range;
    const hits = this.raycaster.intersectObjects(this._targets(), false);
    if (hits.length) {
      const h = hits[0];
      const rid = h.object.userData && h.object.userData.remoteId;
      if (rid) {
        this.hud.showHitmarker();
        if (this.onPlayerHit) this.onPlayerHit(rid, d.damage, this.current);
      } else {
        this.effects.impact(h.point, this._faceNormal(h));
        this._tryBreakGlass(h.object);
        this.hud.showHitmarker();
      }
    }
  }

  _shoot(d) {
    const aiming = this.player && this.player.aiming;
    const baseSpread = aiming ? d.spread * 0.12 : d.spread; // в прицеле почти точно
    const spread = baseSpread + this.recoilPitch * 3;
    this.camera.getWorldDirection(_dir);
    _dir.x += (Math.random() - 0.5) * spread;
    _dir.y += (Math.random() - 0.5) * spread;
    _dir.z += (Math.random() - 0.5) * spread * 0.5;
    _dir.normalize();

    this.camera.getWorldPosition(_pos);
    this.raycaster.set(_pos, _dir);
    this.raycaster.far = d.range;
    const hits = this.raycaster.intersectObjects(this._targets(), false);

    this.models[this.current].muzzle.getWorldPosition(_muzzlePos);

    let end;
    let playerHit = null;
    if (hits.length) {
      const h = hits[0];
      end = h.point;
      const rid = h.object.userData && h.object.userData.remoteId;
      if (rid) {
        playerHit = rid;
        this.hud.showHitmarker();
      } else {
        this.effects.impact(h.point, this._faceNormal(h));
        this._tryBreakGlass(h.object);
        this.hud.showHitmarker();
      }
    } else {
      end = _muzzlePos.clone().addScaledVector(_dir, d.range);
    }

    if (playerHit && this.onPlayerHit) this.onPlayerHit(playerHit, d.damage, this.current);

    this.effects.muzzleFlash(_muzzlePos);
    this.effects.tracer(_muzzlePos, end);

    this.recoilPitch += d.recoil;
    this.camera.rotation.x += d.recoil;
    this.kick = Math.min(0.12, 0.05 + d.recoil * 4);

    this.sound.shot(d.sound);
  }

  // Цели для рейкаста: только то, во что должна попадать пуля.
  // Без травы/кактусов (дорогой InstancedMesh) и без рекурсии.
  _targets() {
    const base = this.world && this.world.bulletTargets ? this.world.bulletTargets : [];
    const extra = this.remoteTargetsProvider ? this.remoteTargetsProvider() : [];
    return base.concat(extra);
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

    // Прячем оружие, если игрок мёртв.
    if (this.player && this.player.stats) {
      this.viewmodel.visible = this.player.stats.alive;
    }

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
    const aiming = this.player && this.player.aiming;
    const swayX = aiming ? 0 : Math.sin(t * 1.4) * 0.004;
    const swayY = aiming ? 0 : Math.sin(t * 1.1) * 0.003;
    const x = aiming ? 0 : 0.32 + swayX + (moving ? -0.02 : 0);
    const y = aiming ? -0.265 : -0.3 + swayY + (moving ? -0.015 : 0);
    const z = -0.55 + this.kick;
    let rx = 0;
    if (this.reloading) {
      const d = WEAPONS[this.current];
      const p = 1 - this.reloadT / d.reloadTime;
      const drop = 0.15 * Math.sin(p * Math.PI);
      this.viewmodel.position.set(x, y - drop, z);
      this.viewmodel.rotation.set(0.45 * Math.sin(p * Math.PI), 0, 0);
      return;
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
