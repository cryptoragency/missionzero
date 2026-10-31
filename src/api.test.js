// Les tests de l'API : sans réseau, sans modèle (la vérification est injectée).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, checkBody, verdictOf, LIMITS } from './api.js';

const KEY = 'k'.repeat(40);
const green = (items) => ({ results: items.map((i) => ({ ...i, verdict: 'supported', color: 'green', detail: 'the quote' })), green: items.length, red: 0 });
const mixed = (items) => ({ results: items.map((i, k) => ({ ...i, verdict: k ? 'source-unreachable' : 'supported', color: k ? 'red' : 'green', detail: k ? 'http 404' : 'q' })), green: 1, red: items.length - 1 });

async function withServer(opts, fn) {
  const s = createApi({ key: KEY, verify: green, ...opts }); await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + s.address().port;
  try { await fn(base); } finally { s.close(); }
}
const post = (base, body, { key = KEY, type = 'application/json' } = {}) => fetch(base + '/api/verify', { method: 'POST', headers: { 'content-type': type, ...(key ? { authorization: 'Bearer ' + key } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const ONE = { question: 'q', answer: 'a', sources: [{ claim: 'The Sun moves at 230 km/s', url: 'https://example.org/page' }] };

test('the API does not start without a long key', () => {
  assert.throws(() => createApi({ key: '', verify: green }), /MZ_API_KEY/);
  assert.throws(() => createApi({ key: 'short', verify: green }), /MZ_API_KEY/);
});

test('health answers without a key', () => withServer({}, async (b) => {
  const r = await fetch(b + '/health'); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true });
}));

test('no key or a wrong key: 401, nothing is verified', () => {
  let called = 0;
  return withServer({ verify: (i) => { called += 1; return green(i); } }, async (b) => {
    assert.equal((await post(b, ONE, { key: null })).status, 401);
    assert.equal((await post(b, ONE, { key: 'x'.repeat(40) })).status, 401);
    assert.equal(called, 0);
  });
});

test('JSON only, size, method and route limits', () => withServer({}, async (b) => {
  assert.equal((await post(b, ONE, { type: 'text/plain' })).status, 415);
  assert.equal((await post(b, '{bad json')).status, 400);
  assert.equal((await post(b, { sources: [{ claim: 'x', url: 'https://a.org/' + 'y'.repeat(LIMITS.bodyBytes) }] })).status, 413);
  assert.equal((await fetch(b + '/api/verify', { headers: { authorization: 'Bearer ' + KEY } })).status, 405);
  assert.equal((await fetch(b + '/nothing')).status, 404);
}));

test('the body is checked before any verification', () => {
  assert.match(checkBody({}), /sources/);
  assert.match(checkBody({ sources: [] }), /sources/);
  assert.match(checkBody({ sources: Array(11).fill({ claim: 'c', url: 'https://a.org' }) }), /at most/);
  assert.match(checkBody({ sources: [{ claim: 'c', url: 'file:///etc/passwd' }] }), /http/);
  assert.match(checkBody({ sources: [{ claim: 'c', url: 'ftp://a.org/x' }] }), /http/);
  assert.match(checkBody({ sources: [{ claim: 'c', url: 'https://u:p@a.org/' }] }), /credentials/);
  assert.match(checkBody({ sources: [{ claim: '', url: 'https://a.org/' }] }), /claim/);
  assert.match(checkBody({ ...ONE, answer: 5 }), /answer/);
  assert.equal(checkBody(ONE), null);
});

test('VERIFIED only when every claim is on its page', async () => {
  assert.equal(verdictOf(green(ONE.sources)).verdict, 'VERIFIED');
  const two = [...ONE.sources, { claim: 'other', url: 'https://example.org/b' }];
  const v = verdictOf(mixed(two)); assert.equal(v.verdict, 'NOT VERIFIED'); assert.equal(v.red, 1); assert.equal(v.results[1].why, 'http 404');
  assert.equal(verdictOf({ results: [], green: 0, red: 0 }).verdict, 'NOT VERIFIED');
  await withServer({}, async (b) => { const r = await post(b, ONE); assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.verdict, 'VERIFIED'); assert.equal(j.results[0].quote, 'the quote'); });
});

test('rate limit: 30 a minute per address', () => {
  let t = 0;
  return withServer({ now: () => t }, async (b) => {
    for (let i = 0; i < LIMITS.perMinute; i++) assert.equal((await post(b, ONE)).status, 200);
    assert.equal((await post(b, ONE)).status, 429);
    t = 61000; assert.equal((await post(b, ONE)).status, 200);
  });
});

test('errors never leak details; a cost cap is a 402', () => withServer({ verify: () => { throw new Error('run cap reached: 0.25 $ at /secret/path'); } }, async (b) => {
  const r = await post(b, ONE); assert.equal(r.status, 402); const txt = await r.text(); assert.ok(!/secret|path|\$/.test(txt), txt);
}));

test('no CORS unless an origin is set', async () => {
  await withServer({}, async (b) => { const r = await fetch(b + '/health'); assert.equal(r.headers.get('access-control-allow-origin'), null); });
  await withServer({ origin: 'https://app.example.org' }, async (b) => { const r = await fetch(b + '/health'); assert.equal(r.headers.get('access-control-allow-origin'), 'https://app.example.org'); });
});
