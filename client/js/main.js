import { Engine } from './core/engine.js';
import { FirstPersonController } from './core/player.js';
import { HUD } from './ui/hud.js';
import { SettingsPanel } from './ui/settings.js';
import { PostFX } from './graphics/postfx.js';
import { graphics, detectLevel, applyGraphicsLevel } from './config.js';
import { MAPS } from './world/maps/index.js';
import { disposeWorld } from './world/common.js';
import { WeaponController } from './weapons/controller.js';

const canvas = document.getElementById('game');

// Определяем уровень по железу ещё до создания рендерера.
graphics.level = detectLevel();
applyGraphicsLevel(graphics.level, null);

const engine = new Engine(canvas, { antialias: graphics.level !== 'low' });
engine.scene.add(engine.camera); // вьюмодель оружия — ребёнок камеры

const hud = new HUD();
const postfx = new PostFX(engine.renderer, engine.scene, engine.camera);
engine.setPostfx(postfx);

let world = null;
let player = null;
let weapon = null;

const ctx = { engine, postfx, hud };

function loadMap(name) {
  const entry = MAPS[name];
  if (!entry) return;

  if (world) disposeWorld(engine.scene, world);
  world = entry.build(engine.scene);

  if (!player) {
    player = new FirstPersonController(engine.camera, canvas, world, hud);
    engine.setPlayer(player);
  } else {
    player.world = world;
    player.camera.position.copy(world.spawn);
    player.velocity.set(0, 0, 0);
    player.release();
  }

  if (weapon) {
    weapon.setWorld(world);
    weapon.clearEffects();
  } else {
    weapon = new WeaponController(engine.scene, engine.camera, world, hud);
  }

  ctx.world = world;
  ctx.player = player;
  ctx.currentMap = name;
  ctx.weapon = weapon;
  applyGraphicsLevel(graphics.level, ctx);
  hud.setMap(entry.name);
}
ctx.loadMap = loadMap;

loadMap('desert2');

const settings = new SettingsPanel(ctx); // eslint-disable-line no-unused-vars

// --- Управление оружием ---
const WEAPON_KEYS = { Digit1: 'knife', Digit2: 'glock', Digit3: 'deagle', Digit4: 'ak47' };

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (e.target instanceof Element && e.target.closest('#btn-settings, #settings-panel')) return;
  if (!player || !player.playing || !weapon) return;
  weapon.setTriggerHeld(true);
  weapon.tryFire(); // полуавтомат / нож / первый выстрел
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0 && weapon) weapon.setTriggerHeld(false);
});

window.addEventListener('wheel', (e) => {
  if (!weapon || !player || !player.playing) return;
  weapon.cycle(e.deltaY > 0 ? 1 : -1);
});

window.addEventListener('keydown', (e) => {
  if (!weapon) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const w = WEAPON_KEYS[e.code];
  if (w) weapon.switchTo(w);
  if (e.code === 'KeyR') weapon.reload();
  if (e.code === 'F1') loadMap('desert2');
  if (e.code === 'F2') loadMap('wasteland');
});

// FPS + покадровые эффекты + контроллер оружия.
let frames = 0;
let fpsTime = 0;
engine.onBeforeRender = (dt) => {
  if (world && world.updateEffects) world.updateEffects(dt);
  if (weapon) weapon.update(dt, player ? player.isMoving : false);
  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    hud.setFps(Math.round(frames / fpsTime));
    frames = 0;
    fpsTime = 0;
  }
};

engine.start();
