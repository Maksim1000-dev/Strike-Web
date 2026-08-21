import {
  registerUser,
  verifyUser,
  publicUser,
  createSession,
  destroySession,
  getSessionUser,
  addCoins,
  addToInventory,
} from './store.js';
import { CASES, RARITY, rollCase } from './cases.js';

const COOKIE_NAME = 'strike_session';

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

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function setSessionCookie(res, token) {
  const v = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
  const existing = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', existing ? [].concat(existing, v) : v);
}

export async function handleApi(req, res, url, body) {
  const method = req.method;
  const path = url.pathname;
  const cookies = parseCookies(req.headers.cookie);

  try {
    if (method === 'POST' && path === '/api/register') {
      const u = registerUser(body.username, body.password);
      setSessionCookie(res, createSession(u.username));
      return json(res, 200, { user: publicUser(u) });
    }

    if (method === 'POST' && path === '/api/login') {
      const u = verifyUser(body.username, body.password);
      if (!u) return json(res, 401, { error: 'Неверный логин или пароль' });
      setSessionCookie(res, createSession(u.username));
      return json(res, 200, { user: publicUser(u) });
    }

    if (method === 'POST' && path === '/api/logout') {
      destroySession(cookies[COOKIE_NAME]);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `${COOKIE_NAME}=; Path=/; Max-Age=0`,
      });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (method === 'GET' && path === '/api/me') {
      const u = getSessionUser(cookies[COOKIE_NAME]);
      if (!u) return json(res, 401, { error: 'Не авторизован' });
      return json(res, 200, { user: publicUser(u) });
    }

    if (method === 'GET' && path === '/api/cases') {
      return json(res, 200, { cases: CASES, rarity: RARITY });
    }

    if (method === 'POST' && path === '/api/case/open') {
      const u = getSessionUser(cookies[COOKIE_NAME]);
      if (!u) return json(res, 401, { error: 'Не авторизован' });
      const c = CASES.find((x) => x.id === body.caseId);
      if (!c) return json(res, 404, { error: 'Кейс не найден' });
      if (u.coins < c.cost) return json(res, 400, { error: 'Недостаточно монет' });

      const item = rollCase(c.id);
      const coins = addCoins(u.username, -c.cost);
      const entry = addToInventory(u.username, item);
      return json(res, 200, { item: entry, coins, rarity: RARITY[item.rarity] });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    return json(res, 400, { error: e.message || 'Ошибка сервера' });
  }
}
