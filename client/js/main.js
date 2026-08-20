import { Engine } from './core/engine.js';
import { FirstPersonController } from './core/player.js';
import { buildSandbox } from './world/sandbox.js';
import { HUD } from './ui/hud.js';

const canvas = document.getElementById('game');

const engine = new Engine(canvas);
const world = buildSandbox(engine.scene);
const hud = new HUD();
const player = new FirstPersonController(engine.camera, canvas, world, hud);

engine.setPlayer(player);

// Счётчик FPS (обновляется 2 раза в секунду).
let frames = 0;
let fpsTime = 0;
engine.onBeforeRender = (dt) => {
  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    hud.setFps(Math.round(frames / fpsTime));
    frames = 0;
    fpsTime = 0;
  }
};

engine.start();
