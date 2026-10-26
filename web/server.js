// Community page backend: no dependencies, no accounts, no personal data.
// One vote per browser token (stored hashed), light rate limit kept in memory only (never on disk).
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.MZ_WEB_DATA || join(here, 'data');
mkdirSync(dataDir, { recursive: true });

// What the public studies point to, from Mission Zero's research (update after each run).
export const RESEARCH = ['data-ready', 'governance'];

export const OPTIONS = [
  { id: 'data-leak', label: 'Fear of data leaks' },
  { id: 'no-results', label: 'Fear of no measurable result' },
  { id: 'data-ready', label: 'Data not ready (siloed, low quality)' },
  { id: 'governance', label: 'Governance, compliance, regulation' },
  { id: 'skills', label: 'Lack of skills in the team' },
  { id: 'cost', label: 'Cost and unclear return on investment' },
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
  return list.length > 20;
}

export function counts() {
  const votes = read('votes', {});
  const c = Object.fromEntries(OPTIONS.map((o) => [o.id, 0]));
  for (const v of Object.values(votes)) if (c[v] !== undefined) c[v] += 1;
  return c;
}

export function handle(method, path, body, caller) {
  if (limited(hash(caller))) return [429, { error: 'slow down' }];
  if (method === 'GET' && path === '/api/poll') return [200, { question: 'What blocks AI the most in your company?', options: OPTIONS, research: RESEARCH, counts: counts() }];
  if (method !== 'POST') return [404, { error: 'not found' }];
  const token = clean(body.token, 80);
  if (token.length < 16) return [400, { error: 'token' }];
  const who = hash(token);
  if (path === '/api/vote') {
    if (!OPTIONS.some((o) => o.id === body.option)) return [400, { error: 'option' }];
    const votes = read('votes', {});
    const first = votes[who] === undefined;
    votes[who] = body.option; write('votes', votes);
    return [200, { ok: true, changed: !first, counts: counts() }];
  }
  if (path === '/api/feedback') {
    const list = read('feedback', []);
    if (list.some((f) => f.who === who && f.target === clean(body.target, 60))) return [200, { ok: true, duplicate: true }];
    list.push({ who, target: clean(body.target, 60), helpful: !!body.helpful, note: clean(body.note, 300), at: new Date().toISOString() });
    write('feedback', list.slice(-2000));
    return [200, { ok: true }];
  }
  if (path === '/api/goal') {
    const text = clean(body.text, 240);
    if (text.length < 15) return [400, { error: 'too short' }];
    const list = read('goals', []);
    list.push({ who, text, status: 'proposed', at: new Date().toISOString() });
    write('goals', list.slice(-500));
    return [200, { ok: true }];
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
