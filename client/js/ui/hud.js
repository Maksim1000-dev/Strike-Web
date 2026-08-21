// HUD: счётчик FPS и стартовый оверлей (захват курсора / вход в игру).
export class HUD {
  constructor() {
    this.fpsEl = document.getElementById('fps');
    this.overlayEl = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayHint = document.getElementById('overlay-hint');
    this.hintEl = document.getElementById('hint');
    this.mapEl = document.getElementById('map');
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

  // playing=true — курсор захвачен (или включён fallback), оверлей скрыт.
  setPlaying(playing, pointerLockUnavailable) {
    if (!this.overlayEl) return;
    if (playing) {
      this.overlayEl.classList.add('hidden');
      if (this.hintEl) {
        this.hintEl.textContent = pointerLockUnavailable
          ? 'WASD — движение · Space — прыжок · Shift — бег · осмотр — зажатая мышь · M — настройки'
          : 'WASD — движение · Space — прыжок · Shift — бег · M — настройки';
      }
    } else {
      this.overlayEl.classList.remove('hidden');
      if (this.overlayTitle) this.overlayTitle.textContent = 'STRIKE-WEB';
      if (this.overlayHint) {
        this.overlayHint.textContent = pointerLockUnavailable
          ? 'Кликни, чтобы играть (обзор — зажми мышь и веди)'
          : 'Кликни, чтобы играть (WASD — движение · Space — прыжок · Shift — бег · M — настройки)';
      }
    }
  }
}
