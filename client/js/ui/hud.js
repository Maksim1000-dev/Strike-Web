// HUD: счётчик FPS и стартовый оверлей (захват курсора).
export class HUD {
  constructor() {
    this.fpsEl = document.getElementById('fps');
    this.overlayEl = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayHint = document.getElementById('overlay-hint');
  }

  setFps(v) {
    if (this.fpsEl) this.fpsEl.textContent = `${v} FPS`;
  }

  applyGraphics(g) {
    if (this.fpsEl) this.fpsEl.style.display = g.showFps ? '' : 'none';
  }

  setLocked(locked, pointerLockUnavailable) {
    if (!this.overlayEl) return;
    if (locked) {
      this.overlayEl.classList.add('hidden');
    } else {
      this.overlayEl.classList.remove('hidden');
      this.overlayTitle.textContent = 'STRIKE-WEB';
      this.overlayHint.textContent = pointerLockUnavailable
        ? 'Pointer Lock недоступен — зажми мышь и веди, чтобы осмотреться'
        : 'Кликни, чтобы играть (WASD — движение · Space — прыжок · Shift — бег · M — настройки)';
    }
  }
}
