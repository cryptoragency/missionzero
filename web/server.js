// Community page backend: no dependencies, no accounts, no personal data.
// One answer per question and per browser token (stored hashed). Light rate limit kept in memory only.
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.MZ_WEB_DATA || join(here, 'data');
mkdirSync(dataDir, { recursive: true });

// What the public studies point to for question 1, from Mission Zero's research (update after each run).
export const RESEARCH = ['data-ready', 'governance'];

// One question, six answers. The labels live in the page (EN/FR); the server only knows ids.
export const QUESTIONS = [
  { id: 'blocker', options: ['data-leak', 'no-results', 'data-ready', 'governance', 'skills', 'cost'] },
];

const file = (name) => join(dataDir, name + '.json');
const read = (name, fallback) => { try { return existsSync(file(name)) ? JSON.parse(readFileSync(file(name), 'utf8')) : fallback; } catch { return fallback; } };
const write = (name, value) => writeFileSync(file(name), JSON.stringify(value, null, 2));
const hash = (s) => createHash('sha256').update('mz|' + s).digest('hex').slice(0, 24);
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

const hits = new Map(); // memory only: hashed caller -> timestamps
function limited(caller) {
  const now = Date.now();
  const list = (hits.get(caller) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(caller, list);
  return list.length > 30;
}

export function counts() {
  const answers = read('answers', {});
  const c = {};
  for (const q of QUESTIONS) c[q.id] = Object.fromEntries(q.options.map((o) => [o, 0]));
  for (const mine of Object.values(answers)) for (const [q, o] of Object.entries(mine)) if (c[q] && c[q][o] !== undefined) c[q][o] += 1;
  return c;
}

export function handle(method, path, body, caller) {
  if (limited(hash(caller))) return [429, { error: 'slow down' }];
  if (method === 'GET' && path === '/api/poll') return [200, { questions: QUESTIONS, research: RESEARCH, counts: counts() }];
  if (method === 'POST' && path === '/api/answer') {
    const token = clean(body.token, 80);
    if (token.length < 16) return [400, { error: 'token' }];
    const q = QUESTIONS.find((x) => x.id === body.q);
    if (!q || !q.options.includes(body.option)) return [400, { error: 'option' }];
    const answers = read('answers', {});
    const who = hash(token);
    answers[who] = { ...(answers[who] || {}), [q.id]: body.option };
    write('answers', answers);
    return [200, { ok: true, counts: counts() }];
  }
  return [404, { error: 'not found' }];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8099;
  const page = readFileSync(join(here, 'index.html'));
  http.createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    if (req.method === 'GET' && (path === '/' || path === '/index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); return res.end(page); }
    if (req.method === 'GET' && path === '/logo.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(readFileSync(join(here, '..', 'assets', 'logo.png'))); }
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 5000) req.destroy(); });
    req.on('end', () => {
      let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
      const [code, out] = handle(req.method, path, body, req.socket.remoteAddress || '');
      res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
    });
  }).listen(port, '127.0.0.1', () => console.log('Mission Zero community page on http://127.0.0.1:' + port));
}
