import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan, proveOwnership, isLocal, targetOf, PROBES } from './scanner.js';

const TOKEN = 'mz-owner-0123456789abcdef';
const PUBLIC = async () => ['93.184.216.34'];
// A remote shop played by a fetch double (a real remote host needs https and a public address, refused locally now).
function shop(token, seen = []) {
  return async (url) => {
    seen.push(url);
    const path = new URL(url).pathname;
    if (path === '/.well-known/mission-zero.txt') return token ? new Response(token) : new Response('nope', { status: 404 });
    return new Response('<html>shop</html>', { headers: { 'content-type': 'text/html' } });
  };
}

test('a local address (localhost) is treated as yours', () => {
  assert.ok(isLocal('http://127.0.0.1:3000')); assert.ok(isLocal('http://localhost:3000'));
  assert.ok(!isLocal('https://shop.example')); assert.ok(!isLocal('not a url'));
});

test('a remote host is refused without an owner token: no probe runs', async () => {
  await assert.rejects(() => scan('https://shop.example.invalid', { ownerToken: '' }), /scan refused: https:\/\/shop.example.invalid is not a host you proved you control \(no owner token/);
  await assert.rejects(() => scan('https://shop.example.invalid', { ownerToken: 'short' }), /no owner token of 16 characters/);
});

test('a remote host is refused when it does not serve the token, accepted when it does', async () => {
  const p = await proveOwnership('https://shop.example', TOKEN, { fetchFn: shop(null), lookup: PUBLIC });
  assert.equal(p.ok, false); assert.match(p.why, /answered 404/);
  await assert.rejects(() => scan('https://shop.example', { ownerToken: TOKEN, fetchFn: shop(null), lookup: PUBLIC }), /scan refused/);
  const wrong = await proveOwnership('https://shop.example', TOKEN, { fetchFn: shop('someone-else-token-xxxxxxxx'), lookup: PUBLIC });
  assert.equal(wrong.ok, false); assert.match(wrong.why, /not yours/);
  const seen = [];
  const r = await scan('https://shop.example/', { ownerToken: TOKEN, only: ['missing-hsts'], fetchFn: shop(TOKEN, seen), lookup: PUBLIC });
  assert.equal(r.owner, '/.well-known/mission-zero.txt'); assert.equal(r.findings.length, 1); assert.equal(r.target, 'https://shop.example');
  assert.ok(seen.every((u) => u.startsWith('https://shop.example/')), seen.join(' '));
});

test('the proof is read at the ORIGIN: a base with a path, a query or a fragment is refused', async () => {
  for (const base of ['https://host.example/~tenant', 'https://host.example/shop/', 'https://host.example/?x=1', 'https://host.example/#a', 'http://127.0.0.1:3000/sub']) {
    const t = targetOf(base); assert.equal(t.ok, false, base); assert.match(t.why, /origin only/);
    await assert.rejects(() => scan(base, { ownerToken: TOKEN, lookup: PUBLIC, fetchFn: shop(TOKEN) }), /origin only/, base);
  }
  assert.equal(targetOf('https://host.example/').origin, 'https://host.example');
  assert.match(targetOf('ftp://host.example').why, /http/);
});

test('a non-local site must be https; a public name that points to a private or loopback address is refused', async () => {
  const http = await proveOwnership('http://shop.example', TOKEN, { fetchFn: shop(TOKEN), lookup: PUBLIC });
  assert.equal(http.ok, false); assert.match(http.why, /https only/);
  const toLoop = await proveOwnership('https://shop.example', TOKEN, { fetchFn: shop(TOKEN), lookup: async () => ['127.0.0.1'] });
  assert.equal(toLoop.ok, false); assert.match(toLoop.why, /points to 127\.0\.0\.1/);
  const toLan = await proveOwnership('https://shop.example', TOKEN, { fetchFn: shop(TOKEN), lookup: async () => ['93.184.216.34', '192.168.1.10'] });
  assert.equal(toLan.ok, false); assert.match(toLan.why, /192\.168\.1\.10/);
  const literal = await proveOwnership('https://127.0.0.2', TOKEN, { fetchFn: shop(TOKEN) });
  assert.equal(literal.ok, false); assert.match(literal.why, /private or local/);
  const nodns = await proveOwnership('https://shop.example', TOKEN, { fetchFn: shop(TOKEN), lookup: async () => { const e = new Error('x'); e.code = 'ENOTFOUND'; throw e; } });
  assert.equal(nodns.ok, false); assert.match(nodns.why, /does not resolve \(ENOTFOUND\)/);
});

test('burst: false skips the 40-request burst; F14 resolves the script address and fetches only the site\'s own copy', async () => {
  let n = 0;
  const count = async (url) => { n += 1; return shop(TOKEN)(url); };
  await scan('https://shop.example', { ownerToken: TOKEN, policy: true, burst: false, fetchFn: count, lookup: PUBLIC });
  assert.ok(n < 30, String(n));
  const f14 = PROBES.find((p) => p.id === 'F14');
  const urls = [];
  const page = (src) => async (url) => { urls.push(url); return new URL(url).pathname === '/' ? new Response(`<script src="${src}"></script>`) : new Response('/*! jQuery v1.12.4 */'); };
  const own = await f14.run('https://shop.example', { fetchFn: page('js/jquery.min.js') });
  assert.equal(urls[1], 'https://shop.example/js/jquery.min.js'); assert.match(own.evidence, /jQuery 1\.12/);
  urls.length = 0;
  const cdn = await f14.run('https://shop.example', { fetchFn: page('https://code.jquery.com/jquery-1.12.4.min.js') });
  assert.equal(urls.length, 1, 'the third-party script is not fetched'); assert.match(cdn.evidence, /jQuery 1\.12/);
});

test('the token file is read up to 200 bytes: an endless body does not hold the scanner', async () => {
  let pulls = 0;
  const endless = async () => new Response(new ReadableStream({ pull(c) { pulls += 1; c.enqueue(new TextEncoder().encode('x'.repeat(64))); } }));
  const p = await proveOwnership('https://shop.example', TOKEN, { fetchFn: endless, lookup: PUBLIC });
  assert.equal(p.ok, false); assert.match(p.why, /not yours/);
  assert.ok(pulls < 10, String(pulls));
  const ok = await proveOwnership('https://shop.example', TOKEN, { fetchFn: async () => new Response(TOKEN + '\n'), lookup: PUBLIC });
  assert.equal(ok.ok, true);
});

test('a site that answers every address with its home page (try_files fallback) raises no false F06, F11, F12 or F13', async () => {
  const page = '<html><title>Vitrine</title><a href="mailto:contact@vitrine.example">contact@vitrine.example</a> PASSWORD SECRET Index of</html>';
  const spa = async (url) => new URL(url).pathname === '/.well-known/mission-zero.txt' ? new Response(TOKEN) : new Response(page, { headers: { 'content-type': 'text/html' } });
  const r = await scan('https://vitrine.example', { ownerToken: TOKEN, only: ['F06', 'F11', 'F12', 'F13'], fetchFn: spa, lookup: PUBLIC });
  assert.deepEqual(r.findings.map((f) => f.id), []);
  // The same paths answering real data (not the fallback page) are still reported.
  const leak = async (url) => { const p = new URL(url).pathname; if (p === '/.well-known/mission-zero.txt') return new Response(TOKEN); if (p === '/export/customers.csv') return new Response('name,email\nA,a@example.org\n'); return new Response('not found', { status: 404 }); };
  const r2 = await scan('https://vitrine.example', { ownerToken: TOKEN, only: ['F13'], fetchFn: leak, lookup: PUBLIC });
  assert.deepEqual(r2.findings.map((f) => f.id), ['F13']);
});
