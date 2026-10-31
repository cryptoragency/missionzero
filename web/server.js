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
const FORGET_MS = 10 * 60000;
let lastPurge = 0;
// A caller seen once must not stay in memory forever: every minute, callers silent for 10 minutes are forgotten.
export function purgeHits(now = Date.now()) {
  lastPurge = now;
  for (const [caller, list] of hits) if (!list.length || now - list[list.length - 1] >= FORGET_MS) hits.delete(caller);
  return hits.size;
}
function limited(caller, now = Date.now()) {
  if (now - lastPurge >= 60000) purgeHits(now);
  const list = (hits.get(caller) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(caller, list);
  return list.length > 30;
}
export const hitsSize = () => hits.size;

// A body that is valid JSON but not an object ("null", "3", "[]") is treated as empty, never as a crash.
export function parseBody(raw) {
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}
// x-forwarded-for is written by whoever calls: it is only believed behind our own proxy (MZ_TRUST_PROXY=1), and then
// only its LAST value, the one our proxy appended (the first ones are whatever the caller sent).
export function callerOf(req, trustProxy = process.env.MZ_TRUST_PROXY === '1') {
  const fwd = trustProxy ? String(req.headers?.['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean).pop() || '' : '';
  return fwd || req.socket?.remoteAddress || '';
}

// The page runs one inline script and one inline style: they are allowed by their hash, nothing else inline, no other origin.
const sha = (s) => "'sha256-" + createHash('sha256').update(s).digest('base64') + "'";
export function securityHeaders(html = '') {
  const inline = (tag) => [...String(html).matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => sha(m[1])).join(' ');
  const scripts = inline('script'); const styles = inline('style');
  return {
    'content-security-policy': `default-src 'self'; script-src 'self'${scripts ? ' ' + scripts : ''}; style-src 'self'${styles ? ' ' + styles : ''}; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  };
}

// The HTTP server, separate from listen() so the tests run it on a free port. The page and the logo are read once, at
// start; a missing logo is a 404, not a server that does not start.
export function makeServer({ pagePath = join(here, 'index.html'), logoPath = join(here, '..', 'assets', 'logo.png') } = {}) {
  const page = readFileSync(pagePath);
  let logo = null;
  try { logo = readFileSync(logoPath); } catch { logo = null; }
  const headers = securityHeaders(page.toString('utf8'));
  return http.createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    const send = (code, type, body, extra = {}) => { res.writeHead(code, { ...headers, 'content-type': type, ...extra }); res.end(body); };
    if (req.method === 'GET' && (path === '/' || path === '/index.html')) return send(200, 'text/html; charset=utf-8', page, { 'cache-control': 'no-store' });
    if (req.method === 'GET' && path === '/logo.png') return logo ? send(200, 'image/png', logo) : send(404, 'application/json', JSON.stringify({ error: 'not found' }));
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 5000) req.destroy(); });
    req.on('end', () => {
      const [code, out] = handle(req.method, path, parseBody(raw), callerOf(req));
      send(code, 'application/json', JSON.stringify(out));
    });
  });
}

export function counts() {
  const answers = read('answers', {});
  const c = {};
  for (const q of QUESTIONS) c[q.id] = Object.fromEntries(q.options.map((o) => [o, 0]));
  for (const mine of Object.values(answers)) for (const [q, o] of Object.entries(mine)) if (c[q] && c[q][o] !== undefined) c[q][o] += 1;
  return c;
}

export function handle(method, path, body, caller, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  if (limited(hash(caller), now)) return [429, { error: 'slow down' }];
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
  const host = process.env.HOST || '127.0.0.1'; // 0.0.0.0 only inside the container (Dockerfile)
  makeServer().listen(port, host, () => console.log('Mission Zero community page on http://' + host + ':' + port));
}
