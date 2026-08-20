// Настройки графики. Полноценные пресеты Low/Medium/Ultra придут в Части 2.
export const GRAPHICS_LEVELS = ['low', 'medium', 'ultra'];

export const graphics = {
  level: 'medium',
  showFps: true,
  shadows: true,
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
};

export function applyGraphicsLevel(level) {
  if (!GRAPHICS_LEVELS.includes(level)) level = 'medium';
  graphics.level = level;

  if (level === 'low') {
    graphics.shadows = false;
    graphics.pixelRatio = 1;
  } else if (level === 'medium') {
    graphics.shadows = true;
    graphics.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  } else {
    graphics.shadows = true;
    graphics.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  }
}
