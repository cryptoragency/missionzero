// A static site served the way nginx serves it, so Mission Zero repairs the copy, never the live site.
// 1. Copy the files your web server serves into public/ (the built site, nothing else).
// 2. Copy the response headers your server adds into headers.json (curl -sI https://your-site/ shows them).
// 3. Keep FALLBACK if your server answers unknown paths with the home page (try_files ... /index.html), else set it to null.
// The repair mode edits THIS file (headers, limits); a human then carries the fix into the real server's configuration.
import http from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, 'public');
export const HEADERS = JSON.parse(readFileSync(join(HERE, 'headers.json'), 'utf8'));
const FALLBACK = '/index.html';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const BINARY = new Set(['.png', '.jpg', '.webp', '.woff2']);

function file(rel) {
  const p = normalize(join(ROOT, rel));
  if (!p.startsWith(ROOT)) return null;
  try { const s = statSync(p); if (s.isFile()) return p; if (s.isDirectory() && statSync(join(p, 'index.html')).isFile()) return join(p, 'index.html'); } catch {}
  return null;
}

// handle(method, url, body, headers) -> [status, headers, body], without the network. headers['x-real-ip'] is the visitor's address.
export function handle(method, url, body = '', headers = {}) {
  const path = decodeURIComponent(new URL(url, 'http://x').pathname);
  const f = file(path) || (FALLBACK && file(FALLBACK));
  if (!f) return [404, { ...HEADERS, 'content-type': 'text/plain' }, 'Not Found'];
  const out = method === 'HEAD' ? '' : readFileSync(f, BINARY.has(extname(f)) ? undefined : 'utf8');
  return [200, { ...HEADERS, 'content-type': TYPES[extname(f)] || 'application/octet-stream' }, out];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const port = Number(process.env.PORT) || 8099;
  http.createServer((req, res) => {
    const [status, headers, body] = handle(req.method, req.url, '', { 'x-real-ip': req.socket.remoteAddress });
    res.writeHead(status, headers); res.end(body);
  }).listen(port, '127.0.0.1', () => console.log('Static site copy (LOCAL ONLY) on http://127.0.0.1:' + port));
}
