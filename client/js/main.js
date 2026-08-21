import { Engine } from './core/engine.js';
import { FirstPersonController } from './core/player.js';
import { PlayerStats } from './core/stats.js';
import { HUD } from './ui/hud.js';
import { SettingsPanel } from './ui/settings.js';
import { AuthScreen } from './ui/auth.js';
import { MenuScreen } from './ui/menu.js';
import { CasesModal } from './ui/cases.js';
import { PostFX } from './graphics/postfx.js';
import { graphics, detectLevel, applyGraphicsLevel } from './config.js';
import { MAPS } from './world/maps/index.js';
import { disposeWorld } from './world/common.js';
import { WeaponController } from './weapons/controller.js';
import { WEAPONS } from './weapons/data.js';
import { Auth } from './api.js';
import { NetworkClient } from './net/client.js';
import { RemotePlayers } from './net/remote.js';

const RESPAWN_TIME = 3;
const STATE_RATE = 1 / 15; // 15 Гц

const canvas = document.getElementById('game');

graphics.level = detectLevel();
applyGraphicsLevel(graphics.level, null);

const engine = new Engine(canvas, { antialias: graphics.level !== 'low' });
engine.scene.add(engine.camera);

const hud = new HUD();
const postfx = new PostFX(engine.renderer, engine.scene, engine.camera);
engine.setPostfx(postfx);

const stats = new PlayerStats();
stats.setHud(hud);

const net = new NetworkClient();
const remote = new RemotePlayers(engine.scene);

let world = null;
let player = null;
let weapon = null;
let currentUser = null;
let myId = null;
let online = false;
let phase = 'auth'; // auth | menu | game

const ctx = { engine, postfx, hud, stats, remote, net };

// ---------- Карты ----------
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
  weapon.remoteTargetsProvider = () => remote.hitMeshes;
  weapon.onPlayerHit = (rid, dmg, w) => net.sendHit(rid, dmg, w);
  weapon.onSwitch = () => { stats.weightMult = WEAPONS[weapon.current].speedMult; };
  weapon.onSwitch();

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

// ---------- Сеть ----------
net.on('welcome', (m) => {
  myId = m.id;
  online = true;
  if (m.coins != null && currentUser) currentUser.coins = m.coins;
});
net.on('players', (m) => {
  for (const p of m.list) {
    if (p.id !== myId) remote.add(p.id, p.name, p);
  }
});
net.on('join', (m) => {
  if (m.id !== myId) remote.add(m.id, m.name);
});
net.on('leave', (m) => remote.remove(m.id));
net.on('state', (m) => {
  if (m.id !== myId) remote.updateState(m.id, m.p, m.r);
});
net.on('hp', (m) => {
  if (m.id === myId) {
    stats.syncHp(m.hp);
  } else {
    remote.setHp(m.id, m.hp, m.dead);
  }
});
net.on('coins', (m) => {
  if (m.coins != null && currentUser) currentUser.coins = m.coins;
});
net.on('close', () => { online = false; });

stats.onDamaged = (dmg) => { if (net.connected) net.sendHurt(dmg); };
stats.onDeath = () => {
  if (player) player.release();
  if (weapon) weapon.setTriggerHeld(false);
};

// ---------- Экраны ----------
const auth = new AuthScreen({
  onAuth: (user) => {
    currentUser = user;
    showMenu();
  },
});

const menu = new MenuScreen({
  onPlay: () => enterGame(),
  onCases: () => cases.open(),
  onLogout: async () => {
    try { await Auth.logout(); } catch { /* ignore */ }
    currentUser = null;
    net.close();
    showAuth();
  },
});

const cases = new CasesModal({
  onCoins: (coins) => {
    if (currentUser) currentUser.coins = coins;
    menu.updateCoins(coins);
  },
});

function showAuth() {
  phase = 'auth';
  hud.setInGame(false);
  menu.hide();
  cases.hide();
  auth.show();
}

async function showMenu() {
  phase = 'menu';
  hud.setInGame(false);
  auth.hide();
  cases.hide();
  menu.show(currentUser, online);
  // Обновляем профиль (монеты могли измениться за игру).
  try {
    const d = await Auth.me();
    currentUser = d.user;
    menu.show(currentUser, online);
  } catch { /* офлайн — показываем кэш */ }
}

async function enterGame() {
  phase = 'game';
  auth.hide();
  menu.hide();
  cases.hide();
  hud.setInGame(true);

  if (!world) loadMap('desert2');

  // Подключаемся к мультиплееру (один раз).
  if (!net.connected) {
    const ok = await net.connect();
    online = ok;
    if (!ok) console.warn('Мультиплеер недоступен — играем соло');
  }
  hud.setPlaying(player ? player.playing : false, player ? player.pointerLockUnavailable : false);
}

function backToMenu() {
  phase = 'menu';
  hud.setInGame(false);
  if (player) player.release();
  if (weapon) weapon.setTriggerHeld(false);
  showMenu();
}
ctx.exitGame = backToMenu;

// ---------- Управление оружием ----------
const WEAPON_KEYS = { Digit1: 'knife', Digit2: 'glock', Digit3: 'deagle', Digit4: 'ak47' };

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (e.target instanceof Element && e.target.closest('#btn-settings, #settings-panel, #auth-screen, #menu-screen, #cases-modal')) return;
  if (phase !== 'game' || !player || !player.playing || !weapon || !stats.alive) return;
  weapon.setTriggerHeld(true);
  weapon.tryFire();
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0 && weapon) weapon.setTriggerHeld(false);
});

window.addEventListener('wheel', (e) => {
  if (phase !== 'game' || !weapon || !player || !player.playing || !stats.alive) return;
  weapon.cycle(e.deltaY > 0 ? 1 : -1);
});

window.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

  if (e.code === 'F1') { if (phase === 'game') loadMap('desert2'); return; }
  if (e.code === 'F2') { if (phase === 'game') loadMap('wasteland'); return; }
  if (!weapon || phase !== 'game' || !player || !player.playing || !stats.alive) return;

  const w = WEAPON_KEYS[e.code];
  if (w) weapon.switchTo(w);
  if (e.code === 'KeyR') weapon.reload();
  if (e.code === 'KeyH') stats.damage(20); // тестовый урон
});

// ---------- Цикл ----------
let frames = 0;
let fpsTime = 0;
let stateAcc = 0;

engine.onBeforeRender = (dt) => {
  if (world && world.updateEffects) world.updateEffects(dt);
  if (weapon) weapon.update(dt, player ? player.isMoving : false);
  remote.update(dt);

  if (stats && !stats.alive) {
    stats.deadTimer += dt;
    hud.setDeathTimer(Math.max(0, Math.ceil(RESPAWN_TIME - stats.deadTimer)));
    if (stats.deadTimer >= RESPAWN_TIME) {
      stats.respawn();
      net.sendRespawn();
      if (player) {
        player.camera.position.copy(world.spawn);
        player.velocity.set(0, 0, 0);
        player.camera.fov = player.baseFov;
        player.camera.updateProjectionMatrix();
      }
    }
  }

  // Отправка состояния в сеть (15 Гц).
  if (phase === 'game' && net.connected && player && world) {
    stateAcc += dt;
    if (stateAcc >= STATE_RATE) {
      stateAcc = 0;
      net.sendState(
        [player.camera.position.x, player.camera.position.y, player.camera.position.z],
        [player.camera.rotation.x, player.camera.rotation.y],
        weapon ? weapon.current : 'glock'
      );
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

// ---------- Старт ----------
engine.start();

(async () => {
  // Проверяем сессию по cookie.
  try {
    const d = await Auth.me();
    currentUser = d.user;
    showMenu();
  } catch {
    showAuth();
  }
})();
