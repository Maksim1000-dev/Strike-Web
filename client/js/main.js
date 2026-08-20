import { Engine } from './core/engine.js';
import { FirstPersonController } from './core/player.js';
import { buildSandbox } from './world/sandbox.js';
import { HUD } from './ui/hud.js';
import { SettingsPanel } from './ui/settings.js';
import { PostFX } from './graphics/postfx.js';
import { graphics, detectLevel, applyGraphicsLevel } from './config.js';

const canvas = document.getElementById('game');

// Определяем уровень по железу ещё до создания рендерера (влияет на сглаживание).
graphics.level = detectLevel();
applyGraphicsLevel(graphics.level, null);

const engine = new Engine(canvas, { antialias: graphics.level !== 'low' });
const world = buildSandbox(engine.scene);
const hud = new HUD();
const player = new FirstPersonController(engine.camera, canvas, world, hud);
const postfx = new PostFX(engine.renderer, engine.scene, engine.camera);

engine.setPlayer(player);
engine.setPostfx(postfx);

const ctx = { engine, world, postfx, hud };

// Применяем пресет к уже построенной сцене (текстуры, трава, bloom).
applyGraphicsLevel(graphics.level, ctx);
const settings = new SettingsPanel(ctx); // eslint-disable-line no-unused-vars

// Счётчик FPS (обновляется 2 раза в секунду) + покадровые эффекты.
let frames = 0;
let fpsTime = 0;
engine.onBeforeRender = (dt) => {
  world.updateEffects(dt);
  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    hud.setFps(Math.round(frames / fpsTime));
    frames = 0;
    fpsTime = 0;
  }
};

engine.start();
