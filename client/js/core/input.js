// Простое состояние клавиатуры. Клавиши — по event.code (раскладка не влияет).
export const keys = {};

const PREVENT_DEFAULT = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
]);

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Если окно теряет фокус — сбрасываем всё, чтобы персонаж не "залипал".
window.addEventListener('blur', () => {
  for (const k of Object.keys(keys)) keys[k] = false;
});
