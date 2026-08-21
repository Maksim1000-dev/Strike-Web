import { Engine } from './core/engine.js';
import { FirstPersonController } from './core/player.js';
import { PlayerStats } from './core/stats.js';
import { HUD } from './ui/hud.js';
import { SettingsPanel } from './ui/settings.js';
import { PostFX } from './graphics/postfx.js';
import { graphics, detectLevel, applyGraphicsLevel } from './config.js';
import { MAPS } from './world/maps/index.js';
import { disposeWorld } from './world/common.js';
import { WeaponController } from './weapons/controller.js';
import { WEAPONS } from './weapons/data.js';

const RESPAWN_TIME = 3;

const canvas = document.getElementById('game');

// Определяем уровень по железу ещё до создания рендерера.
graphics.level = detectLevel();
applyGraphicsLevel(graphics.level, null);

const engine = new Engine(canvas, { antialias: graphics.level !== 'low' });
engine.scene.add(engine.camera); // вьюмодель оружия — ребёнок камеры

const hud = new HUD();
const postfx = new PostFX(engine.renderer, engine.scene, engine.camera);
engine.setPostfx(postfx);

const stats = new PlayerStats();
stats.setHud(hud);

let world = null;
let player = null;
let weapon = null;

const ctx = { engine, postfx, hud, stats };

function loadMap(name) {
  const entry = MAPS[name];
  if (!entry) return;

  if (world) disposeWorld(engine.scene, world);
  world = entry.build(engine.scene);

  if (!player) {
    player = new FirstPersonController(engine.camera, canvas, world, hud, stats);
    engine.setPlayer(player);
  } else {
    player.world = world;
    player.camera.position.copy(world.spawn);
    player.velocity.set(0, 0, 0);
    player.release();
  }

  if (!weapon) {
    weapon = new WeaponController(engine.scene, engine.camera, world, hud);
  }
  weapon.setWorld(world);
  weapon.clearEffects();
  weapon.player = player;
  weapon.onSwitch = () => { stats.weightMult = WEAPONS[weapon.current].speedMult; };
  weapon.onSwitch(); // применить вес стартового оружия

  // Сброс состояния при смене карты.
  stats.respawn();
  player.camera.fov = player.baseFov;
  player.camera.updateProjectionMatrix();

  ctx.world = world;
  ctx.player = player;
  ctx.currentMap = name;
  ctx.weapon = weapon;
  applyGraphicsLevel(graphics.level, ctx);
  hud.setMap(entry.name);
}
ctx.loadMap = loadMap;

stats.onDeath = () => {
  if (player) player.release();
  if (weapon) weapon.setTriggerHeld(false);
};

loadMap('desert2');

const settings = new SettingsPanel(ctx); // eslint-disable-line no-unused-vars

// --- Управление оружием ---
const WEAPON_KEYS = { Digit1: 'knife', Digit2: 'glock', Digit3: 'deagle', Digit4: 'ak47' };

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (e.target instanceof Element && e.target.closest('#btn-settings, #settings-panel')) return;
  if (!player || !player.playing || !weapon || !stats.alive) return;
  weapon.setTriggerHeld(true);
  weapon.tryFire(); // полуавтомат / нож / первый выстрел
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0 && weapon) weapon.setTriggerHeld(false);
});

window.addEventListener('wheel', (e) => {
  if (!weapon || !player || !player.playing || !stats.alive) return;
  weapon.cycle(e.deltaY > 0 ? 1 : -1);
});

window.addEventListener('keydown', (e) => {
  if (!weapon) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

  if (e.code === 'F1') { loadMap('desert2'); return; }
  if (e.code === 'F2') { loadMap('wasteland'); return; }

  if (!player || !player.playing || !stats.alive) return;

  const w = WEAPON_KEYS[e.code];
  if (w) weapon.switchTo(w);
  if (e.code === 'KeyR') weapon.reload();
  if (e.code === 'KeyH') stats.damage(20); // тест урона (уберём с врагами)
});

// FPS + покадровые эффекты + контроллер оружия + смерть/респавн.
let frames = 0;
let fpsTime = 0;
engine.onBeforeRender = (dt) => {
  if (world && world.updateEffects) world.updateEffects(dt);
  if (weapon) weapon.update(dt, player ? player.isMoving : false);

  if (stats && !stats.alive) {
    stats.deadTimer += dt;
    const remain = Math.max(0, Math.ceil(RESPAWN_TIME - stats.deadTimer));
    hud.setDeathTimer(remain);
    if (stats.deadTimer >= RESPAWN_TIME) {
      stats.respawn();
      if (player) {
        player.camera.position.copy(world.spawn);
        player.velocity.set(0, 0, 0);
        player.camera.fov = player.baseFov;
        player.camera.updateProjectionMatrix();
      }
    }
  }

  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    hud.setFps(Math.round(frames / fpsTime));
    frames = 0;
    fpsTime = 0;
  }
};

engine.start();
