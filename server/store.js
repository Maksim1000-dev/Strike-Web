import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'players.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Хранилище игроков: JSON-файлы на диске. Сессии тоже на диске — чтобы вход
// переживал перезапуск сервера (в памяти они бы «сгорали»).
let users = {};
const sessions = new Map(); // token -> { username, expires }

export function initStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch {
    users = {};
  }

  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      const now = Date.now();
      for (const [token, s] of Object.entries(raw)) {
        if (s && s.expires > now) sessions.set(token, s);
      }
    }
  } catch {
    /* пустой файл сессий — ок */
  }
}

function saveSessions() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj = {};
    for (const [token, s] of sessions.entries()) obj[token] = s;
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj));
  } catch {
    /* не критично — сессии просто останутся в памяти */
  }
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function publicUser(u) {
  return {
    username: u.username,
    coins: u.coins,
    kills: u.kills,
    deaths: u.deaths,
    weapons: u.weapons || ['knife'],
    inventory: u.inventory || [],
  };
}

export function registerUser(username, password) {
  const name = String(username || '').trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(name)) {
    throw new Error('Логин: 3–20 символов (латиница, цифры, _)');
  }
  if (!password || String(password).length < 4) {
    throw new Error('Пароль: минимум 4 символа');
  }
  if (users[name]) throw new Error('Такой игрок уже существует');

  const salt = crypto.randomBytes(16).toString('hex');
  users[name] = {
    username: name,
    salt,
    hash: hashPassword(password, salt),
    coins: 1000, // стартовый капитал
    kills: 0,
    deaths: 0,
    weapons: ['knife'], // оружие покупается; нож — бесплатно
    inventory: [],
    createdAt: Date.now(),
  };
  save();
  return users[name];
}

export function verifyUser(username, password) {
  const u = users[String(username || '').trim()];
  if (!u) return null;
  if (hashPassword(password, u.salt) !== u.hash) return null;
  return u;
}

export function getUser(username) {
  return users[String(username || '').trim()] || null;
}

export function createSession(username) {
  const token = makeToken();
  sessions.set(token, { username, expires: Date.now() + 7 * 24 * 3600 * 1000 });
  saveSessions();
  return token;
}

export function getSessionUser(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) {
    sessions.delete(token);
    saveSessions();
    return null;
  }
  return users[s.username] || null;
}

export function destroySession(token) {
  if (token && sessions.delete(token)) saveSessions();
}

export function addCoins(username, n) {
  const u = users[username];
  if (!u) return null;
  u.coins = Math.max(0, u.coins + n);
  save();
  return u.coins;
}

export function addKill(username) {
  const u = users[username];
  if (u) { u.kills++; save(); }
}

export function addDeath(username) {
  const u = users[username];
  if (u) { u.deaths++; save(); }
}

export function addWeapon(username, id) {
  const u = users[username];
  if (!u) return null;
  if (!Array.isArray(u.weapons)) u.weapons = ['knife'];
  if (!u.weapons.includes(id)) {
    u.weapons.push(id);
    save();
  }
  return u.weapons;
}

export function addToInventory(username, item) {
  const u = users[username];
  if (!u) return null;
  const entry = { id: crypto.randomBytes(6).toString('hex'), ...item, obtainedAt: Date.now() };
  u.inventory.push(entry);
  save();
  return entry;
}
