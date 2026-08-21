import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { FirstPersonController } from './core/player.js';
import { HUD } from './ui/hud.js';
import { SettingsPanel } from './ui/settings.js';
import { PostFX } from './graphics/postfx.js';
import { graphics, detectLevel, applyGraphicsLevel } from './config.js';
import { MAPS } from './world/maps/index.js';
import { disposeWorld } from './world/common.js';

const canvas = document.getElementById('game');

// Определяем уровень по железу ещё до создания рендерера.
graphics.level = detectLevel();
applyGraphicsLevel(graphics.level, null);

const engine = new Engine(canvas, { antialias: graphics.level !== 'low' });
const hud = new HUD();
const postfx = new PostFX(engine.renderer, engine.scene, engine.camera);
engine.setPostfx(postfx);

let world = null;
let player = null;

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

  ctx.world = world;
  ctx.player = player;
  ctx.currentMap = name;
  applyGraphicsLevel(graphics.level, ctx);
  hud.setMap(entry.name);
}

ctx.loadMap = loadMap;

// Стартовая карта.
loadMap('desert2');

const settings = new SettingsPanel(ctx); // eslint-disable-line no-unused-vars

// Выстрел (пока только разбивает стёкла; оружие придёт в Части 4).
const raycaster = new THREE.Raycaster();
document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (!player || !player.playing || !world) return;
  if (e.target instanceof Element && e.target.closest('#btn-settings, #settings-panel')) return;

  const panes = (world.breakables || []).filter((b) => b && !b.broken);
  if (!panes.length) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
  raycaster.far = 80;
  const hits = raycaster.intersectObjects(panes.map((b) => b.mesh), false);
  if (hits.length) {
    const obj = hits[0].object;
    const pane = panes.find((p) => p.mesh === obj);
    if (pane) pane.break();
  }
});

// Горячие клавиши переключения карт: 1 / 2.
window.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const mapByKey = { Digit1: 'desert2', Digit2: 'wasteland' };
  const name = mapByKey[e.code];
  if (name && MAPS[name]) loadMap(name);
});

// FPS + покадровые эффекты.
let frames = 0;
let fpsTime = 0;
engine.onBeforeRender = (dt) => {
  if (world && world.updateEffects) world.updateEffects(dt);
  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    hud.setFps(Math.round(frames / fpsTime));
    frames = 0;
    fpsTime = 0;
  }
};

engine.start();
