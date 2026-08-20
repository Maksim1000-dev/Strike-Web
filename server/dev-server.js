import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function resolvePath(urlPath) {
  // Три.js и аддоны раздаём из node_modules через стабильные "vendor" URL.
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

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    return send(res, 400, 'Bad request');
  }

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

server.listen(PORT, HOST, () => {
  console.log(`Strike-Web dev server: http://${HOST}:${PORT}`);
});
