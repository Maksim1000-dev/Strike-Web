import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initStore } from './store.js';
import { handleApi } from './api.js';
import { createMultiplayer } from './ws.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'client');
const NODE_MODULES = path.join(__dirname, '..', 'node_modules');
const ADDONS_ROOT = path.join(NODE_MODULES, 'three', 'examples', 'jsm');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

initStore();

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function resolvePath(urlPath) {
  if (urlPath === '/vendor/three.module.js') {
    return path.join(NODE_MODULES, 'three', 'build', 'three.module.js');
  }
  if (urlPath.startsWith('/vendor/addons/')) {
    const rel = urlPath.slice('/vendor/addons/'.length);
    const filePath = path.normalize(path.join(ADDONS_ROOT, rel));
    return filePath.startsWith(ADDONS_ROOT) ? filePath : null;
  }
  const filePath = path.normalize(path.join(ROOT, urlPath));
  return filePath.startsWith(ROOT) ? filePath : null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    return send(res, 400, 'Bad request');
  }

  const url = new URL(req.url || '/', 'http://localhost');

  // API
  if (url.pathname.startsWith('/api/')) {
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = JSON.parse((await readBody(req)) || '{}');
      } catch {
        body = {};
      }
    }
    return handleApi(req, res, url, body);
  }

  // Статика
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = resolvePath(urlPath);
  if (!filePath) return send(res, 403, 'Forbidden');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return send(res, 404, 'Not found');
      return send(res, 500, 'Server error');
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
});

createMultiplayer(server);

server.listen(PORT, HOST, () => {
  console.log(`Strike-Web server: http://${HOST}:${PORT}  (static + API + WebSocket /ws)`);
});
