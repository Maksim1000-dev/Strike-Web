import { WebSocketServer } from 'ws';
import { getSessionUser, addCoins, addKill, addDeath } from './store.js';

const COOKIE_NAME = 'strike_session';
const KILL_REWARD = 100;

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function num(v, d) {
  return typeof v === 'number' && isFinite(v) ? v : d;
}

// Мультиплеер: ретрансляция состояний игроков и обработка урона.
export function createMultiplayer(server) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map(); // ws -> { id, username, x, y, z, pitch, yaw, weapon, hp }

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const cookies = parseCookies(req.headers.cookie);
    const user = getSessionUser(cookies[COOKIE_NAME]);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, user));
  });

  wss.on('connection', (ws, req, user) => {
    const id = Math.random().toString(36).slice(2, 10);
    const player = {
      id,
      username: user.username,
      name: user.username,
      x: 0, y: 1.7, z: 0,
      pitch: 0, yaw: 0,
      weapon: 'glock',
      hp: 100,
    };
    clients.set(ws, player);

    send(ws, { t: 'welcome', id, coins: user.coins });
    const others = [...clients.values()].filter((p) => p !== player).map(pub);
    send(ws, { t: 'players', list: others });
    broadcast({ t: 'join', id, name: player.name }, ws);

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      handle(ws, player, msg);
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcast({ t: 'leave', id });
    });

    ws.on('error', () => {});
  });

  function handle(ws, player, msg) {
    switch (msg.t) {
      case 'state': {
        if (Array.isArray(msg.p)) {
          player.x = num(msg.p[0], player.x);
          player.y = num(msg.p[1], player.y);
          player.z = num(msg.p[2], player.z);
        }
        if (Array.isArray(msg.r)) {
          player.pitch = num(msg.r[0], player.pitch);
          player.yaw = num(msg.r[1], player.yaw);
        }
        if (msg.w) player.weapon = msg.w;
        broadcast({ t: 'state', id: player.id, p: [player.x, player.y, player.z], r: [player.pitch, player.yaw], w: player.weapon, hp: player.hp }, ws);
        break;
      }

      case 'hurt': { // экологический урон (падение и т.п.)
        if (player.hp <= 0) break;
        const dmg = Math.max(1, Math.min(100, Math.round(num(msg.dmg, 0))));
        player.hp = Math.max(0, player.hp - dmg);
        broadcast({ t: 'hp', id: player.id, hp: player.hp, dead: player.hp <= 0 });
        if (player.hp <= 0) addDeath(player.username);
        break;
      }

      case 'hit': { // попадание по другому игроку (клиентский рейкаст)
        if (player.hp <= 0) break;
        const target = findById(msg.id);
        if (!target || target.hp <= 0) break;
        const dmg = Math.max(1, Math.min(100, Math.round(num(msg.dmg, 10))));
        target.hp = Math.max(0, target.hp - dmg);
        broadcast({ t: 'hp', id: target.id, hp: target.hp, dead: target.hp <= 0 });
        if (target.hp <= 0) {
          addDeath(target.username);
          addKill(player.username);
          const coins = addCoins(player.username, KILL_REWARD);
          send(ws, { t: 'coins', coins });
        }
        break;
      }

      case 'respawn': {
        player.hp = 100;
        broadcast({ t: 'hp', id: player.id, hp: 100, dead: false });
        break;
      }
    }
  }

  function findById(id) {
    for (const p of clients.values()) if (p.id === id) return p;
    return null;
  }

  function pub(p) {
    return { id: p.id, name: p.name, p: [p.x, p.y, p.z], r: [p.pitch, p.yaw], w: p.weapon, hp: p.hp };
  }

  function send(ws, obj) {
    if (ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  function broadcast(obj, except) {
    for (const ws of clients.keys()) {
      if (ws !== except) send(ws, obj);
    }
  }

  return wss;
}
