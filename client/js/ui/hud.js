// HUD: FPS, карта, прицел, hitmarker, панель оружия, стартовый оверлей.
export class HUD {
  constructor() {
    this.fpsEl = document.getElementById('fps');
    this.mapEl = document.getElementById('map');
    this.overlayEl = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayHint = document.getElementById('overlay-hint');
    this.hintEl = document.getElementById('hint');
    this.crosshairEl = document.getElementById('crosshair');
    this.hitmarkerEl = document.getElementById('hitmarker');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.weaponAmmoEl = document.getElementById('weapon-ammo');
    this.reloadEl = document.getElementById('reload-hint');
    this._hmTimer = null;
  }

  setFps(v) {
    if (this.fpsEl) this.fpsEl.textContent = `${v} FPS`;
  }

  setMap(name) {
    if (this.mapEl) this.mapEl.textContent = name;
  }

  applyGraphics(g) {
    if (this.fpsEl) this.fpsEl.style.display = g.showFps ? '' : 'none';
  }

  setWeapon(name, ammo, reserve, melee) {
    if (this.weaponNameEl) this.weaponNameEl.textContent = name;
    if (this.weaponAmmoEl) {
      if (melee) this.weaponAmmoEl.textContent = '';
      else this.weaponAmmoEl.textContent = `${ammo} / ${reserve}`;
      this.weaponAmmoEl.classList.toggle('low', !melee && ammo === 0);
    }
  }

  setReloading(r) {
    if (this.reloadEl) this.reloadEl.style.opacity = r ? '1' : '0';
  }

  setCrosshair(size) {
    if (this.crosshairEl) this.crosshairEl.style.setProperty('--g', `${size}px`);
  }

  showHitmarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.style.opacity = '1';
    clearTimeout(this._hmTimer);
    this._hmTimer = setTimeout(() => { this.hitmarkerEl.style.opacity = '0'; }, 90);
  }

  // playing=true — курсор захвачен (или включён fallback), оверлей скрыт.
  setPlaying(playing, pointerLockUnavailable) {
    if (!this.overlayEl) return;
    if (playing) {
      this.overlayEl.classList.add('hidden');
      if (this.hintEl) {
        this.hintEl.textContent = pointerLockUnavailable
          ? 'WASD — бег · Space — прыжок · ЛКМ — огонь · ПКМ (зажать) — обзор · R — перезарядка · 1-4 — оружие · M — настройки'
          : 'WASD — бег · Space — прыжок · ЛКМ — огонь · R — перезарядка · 1-4 — оружие · M — настройки';
      }
    } else {
      this.overlayEl.classList.remove('hidden');
      if (this.overlayTitle) this.overlayTitle.textContent = 'STRIKE-WEB';
      if (this.overlayHint) {
        this.overlayHint.textContent = pointerLockUnavailable
          ? 'Кликни, чтобы играть (обзор — ПКМ и веди, огонь — ЛКМ)'
          : 'Кликни, чтобы играть (WASD — движение · ЛКМ — огонь · R — перезарядка · M — настройки)';
      }
    }
  }
}
