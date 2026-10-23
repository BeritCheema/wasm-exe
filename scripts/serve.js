import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.zip': 'application/zip', '.md': 'text/plain' };
export function createDevServer() {
return createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let path = pathname === '/' ? '/web/index.html' : pathname;
    if (path === '/backend/') path += 'index.html';
    if (path.startsWith('/api/fs/')) path = '/backend/fs/' + path.slice(8);
    if (!/^\/(web|src|backend)\/[a-zA-Z0-9._/-]+$/.test(path) || path.includes('..')) { res.writeHead(404).end(); return; }
    path = path.replace(/^\/backend\//, '/vendor/windowsappplayer/');
    const file = resolve(root, '.' + path), info = await stat(file);
    if (!info.isFile()) { res.writeHead(404).end(); return; }
    const headers = { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Accept-Ranges': 'bytes' };
    if (path === '/vendor/windowsappplayer/index.html') {
      const html = (await readFile(file, 'utf8')).replace('</body>', '<script src="/web/backend-bridge.js"></script></body>');
      res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : html); return;
    }
    let start = 0, end = info.size - 1, status = 200;
    if (req.headers.range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!m || (!m[1] && !m[2])) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      start = m[1] ? Number(m[1]) : Math.max(0, info.size - Number(m[2]));
      end = m[1] && m[2] ? Math.min(Number(m[2]), end) : end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || info.size === 0) { res.end(); return; }
    createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
  } catch { res.writeHead(404).end('Not found. Run npm run setup:backend if the backend is missing.'); }
});
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createDevServer().listen(5173, '127.0.0.1', () => console.log('wasm-exe: http://127.0.0.1:5173'));
}
