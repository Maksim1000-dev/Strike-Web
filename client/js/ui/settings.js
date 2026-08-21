import { GRAPHICS_LEVELS, graphics, applyGraphicsLevel } from '../config.js';

// Меню настроек: качество графики (Low/Medium/Ultra), FPS, тени. Открывается кнопкой ⚙ или клавишей M.
export class SettingsPanel {
  constructor(ctx) {
    this.ctx = ctx;
    this.panel = document.getElementById('settings-panel');
    this.btnOpen = document.getElementById('btn-settings');
    this.btnClose = document.getElementById('btn-close-settings');
    this.btnExitMenu = document.getElementById('btn-exit-menu');
    this.qualityBtns = Array.from(document.querySelectorAll('[data-level]'));
    this.mapBtns = Array.from(document.querySelectorAll('[data-map]'));
    this.fpsToggle = document.getElementById('opt-fps');
    this.shadowsToggle = document.getElementById('opt-shadows');
    this.note = document.getElementById('settings-note');

    this.open = false;
    this._bind();
    this.refresh();
  }

  _bind() {
    this.btnOpen.addEventListener('click', () => this.setOpen(true));
    this.btnClose.addEventListener('click', () => this.setOpen(false));
    if (this.btnExitMenu) {
      this.btnExitMenu.addEventListener('click', () => {
        this.setOpen(false);
        if (this.ctx.exitGame) this.ctx.exitGame();
      });
    }

    this.qualityBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        applyGraphicsLevel(btn.dataset.level, this.ctx);
        this.refresh();
      });
    });

    this.mapBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.ctx.loadMap) this.ctx.loadMap(btn.dataset.map);
        this.refresh();
      });
    });

    this.fpsToggle.addEventListener('change', () => {
      graphics.showFps = this.fpsToggle.checked;
      this.ctx.hud.applyGraphics(graphics);
    });

    this.shadowsToggle.addEventListener('change', () => {
      graphics.shadows = this.shadowsToggle.checked;
      this.ctx.engine.applyGraphics(graphics);
      this.refresh();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') this.setOpen(!this.open);
    });
  }

  setOpen(open) {
    this.open = open;
    this.panel.classList.toggle('hidden', !open);
    if (open) {
      // Отпускаем курсор и выходим в меню, чтобы панелью можно было пользоваться.
      if (this.ctx.player) this.ctx.player.release();
      if (this.ctx.weapon) this.ctx.weapon.setTriggerHeld(false);
      this.refresh();
    }
  }

  refresh() {
    this.qualityBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.level === graphics.level);
    });
    this.mapBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.map === (this.ctx.currentMap || ''));
    });
    this.fpsToggle.checked = graphics.showFps;
    this.shadowsToggle.checked = graphics.shadows;
    const labels = { low: 'НИЗКОЕ', medium: 'СРЕДНЕЕ', ultra: 'УЛЬТРА' };
    this.note.textContent = `Текущий режим: ${labels[graphics.level]} · ${GRAPHICS_LEVELS.length} пресета`;
  }
}
