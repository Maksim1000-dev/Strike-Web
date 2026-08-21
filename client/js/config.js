// Графика: пресеты качества Low / Medium / Ultra, авто-определение и применение.
export const GRAPHICS_LEVELS = ['low', 'medium', 'ultra'];

export const graphics = {
  level: 'medium',
  showFps: true,
  shadows: true,
  antialias: true,
  pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
  bloom: false,
  grassWind: 0, // 0 — трава статична, 1 — качается ветром
};

// Простая эвристика по железу/устройству.
export function detectLevel() {
  const mem = navigator.deviceMemory || 0;
  const cores = navigator.hardwareConcurrency || 0;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  if (mobile || (mem && mem <= 4) || (cores && cores <= 4)) return 'low';
  if (!mobile && mem >= 8 && cores >= 8) return 'ultra';
  return 'medium';
}

// Применяет пресет к переданным модулям. Каждый модуль сам знает, что менять.
export function applyGraphicsLevel(level, ctx) {
  if (!GRAPHICS_LEVELS.includes(level)) level = 'medium';
  graphics.level = level;

  if (level === 'low') {
    graphics.shadows = false;
    graphics.pixelRatio = 1;
    graphics.bloom = false;
    graphics.grassWind = 0;
  } else if (level === 'medium') {
    graphics.shadows = true;
    graphics.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    graphics.bloom = false;
    graphics.grassWind = 0;
  } else {
    graphics.shadows = true;
    graphics.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    graphics.bloom = true;
    graphics.grassWind = 1;
  }

  if (ctx) {
    ctx.engine?.applyGraphics(graphics);
    ctx.world?.applyGraphics(graphics);
    ctx.postfx?.applyGraphics(graphics);
    ctx.hud?.applyGraphics(graphics);
  }
}
