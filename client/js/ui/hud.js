// HUD: FPS, карта, прицел, hitmarker, панель оружия, HP/стамина, экран смерти.
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

    this.hpFillEl = document.getElementById('hp-fill');
    this.hpNumEl = document.getElementById('hp-num');
    this.stFillEl = document.getElementById('stamina-fill');
    this.stNumEl = document.getElementById('stamina-num');

    this.damageEl = document.getElementById('damage-flash');
    this.deathEl = document.getElementById('death-overlay');
    this.deathTimerEl = document.getElementById('death-timer');

    this._hmTimer = null;
    this._damageTimer = null;
    this.inGame = false; // в меню оверлей принудительно скрыт
  }

  setInGame(v) {
    this.inGame = v;
    if (!v && this.overlayEl) this.overlayEl.classList.add('hidden');
  }

  setFps(v) { if (this.fpsEl) this.fpsEl.textContent = `${v} FPS`; }
  setMap(name) { if (this.mapEl) this.mapEl.textContent = name; }

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

  setReloading(r) { if (this.reloadEl) this.reloadEl.style.opacity = r ? '1' : '0'; }
  setCrosshair(size) { if (this.crosshairEl) this.crosshairEl.style.setProperty('--g', `${size}px`); }

  setHealth(hp, max) {
    const pct = Math.max(0, Math.min(1, hp / max)) * 100;
    if (this.hpFillEl) this.hpFillEl.style.width = `${pct}%`;
    if (this.hpNumEl) this.hpNumEl.textContent = `${hp}`;
    if (this.hpFillEl) this.hpFillEl.style.background = hp > 50 ? '#5fbf4f' : hp > 25 ? '#ffb43a' : '#ff5a4a';
  }

  setStamina(s, max) {
    const pct = Math.max(0, Math.min(1, s / max)) * 100;
    if (this.stFillEl) this.stFillEl.style.width = `${pct}%`;
    if (this.stNumEl) this.stNumEl.textContent = `${Math.round(s)}`;
    if (this.stFillEl) this.stFillEl.style.background = s > 30 ? '#4fb2ff' : '#ff8a4a';
  }

  showHitmarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.style.opacity = '1';
    clearTimeout(this._hmTimer);
    this._hmTimer = setTimeout(() => { this.hitmarkerEl.style.opacity = '0'; }, 90);
  }

  flashDamage() {
    if (!this.damageEl) return;
    clearTimeout(this._damageTimer);
    this.damageEl.style.transition = 'none';
    this.damageEl.style.opacity = '0.55';
    requestAnimationFrame(() => {
      this.damageEl.style.transition = 'opacity 0.5s ease';
      this.damageEl.style.opacity = '0';
    });
  }

  showDeath() {
    if (this.deathEl) this.deathEl.classList.remove('hidden');
    if (this.deathTimerEl) this.deathTimerEl.textContent = '3';
  }

  hideDeath() {
    if (this.deathEl) this.deathEl.classList.add('hidden');
  }

  setDeathTimer(n) {
    if (this.deathTimerEl) this.deathTimerEl.textContent = `${n}`;
  }

  // playing=true — курсор захвачен (или включён fallback), оверлей скрыт.
  setPlaying(playing, pointerLockUnavailable) {
    if (!this.overlayEl) return;
    if (!this.inGame) {
      this.overlayEl.classList.add('hidden');
      return;
    }
    if (playing) {
      this.overlayEl.classList.add('hidden');
      if (this.hintEl) {
        this.hintEl.textContent = pointerLockUnavailable
          ? 'WASD — бег · Space — прыжок · ЛКМ — огонь · ПКМ — обзор · C — прицел · R — перезарядка · 1-4 — оружие · M — настройки'
          : 'WASD — бег · Space — прыжок · ЛКМ — огонь · ПКМ — прицел · R — перезарядка · 1-4 — оружие · M — настройки';
      }
    } else {
      this.overlayEl.classList.remove('hidden');
      if (this.overlayTitle) this.overlayTitle.textContent = 'STRIKE-WEB';
      if (this.overlayHint) {
        this.overlayHint.textContent = pointerLockUnavailable
          ? 'Кликни, чтобы играть (обзор — ПКМ и веди, прицел — C, огонь — ЛКМ)'
          : 'Кликни, чтобы играть (ЛКМ — огонь · ПКМ — прицел · Shift — бег · R — перезарядка)';
      }
    }
  }
}
