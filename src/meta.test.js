import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, metaFetch, spentToday } from './meta.js';

// The provider, its key and its model follow the base URL alone (the module reads the environment when it loads),
// so each case runs in a fresh process.
const probe = (env) => {
  const clean = { ...process.env }; for (const k of ['MZ_BASE_URL', 'MZ_MODEL', 'MZ_API_KEY', 'MODEL_API_KEY', 'BASETEN_API_KEY', 'FIREWORKS_API_KEY']) delete clean[k];
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./src/meta.js').then((m) => { let model = null, error = null; try { model = m.createClient({ ledgerPath: 'memory/.probe' }).model; } catch (e) { error = e.message; } console.log(JSON.stringify({ provider: m.provider(), model, error })); })"], { encoding: 'utf8', env: { ...clean, ...env } });
  return JSON.parse(r.stdout.trim().split('\n').pop());
};

test('Meta by default: muse-spark-1.3 with MODEL_API_KEY', () => {
  assert.deepEqual(probe({ MODEL_API_KEY: 'k' }), { provider: 'meta', model: 'muse-spark-1.3', error: null });
  assert.match(probe({}).error, /MODEL_API_KEY is missing/);
});

test('Baseten: open weights with BASETEN_API_KEY', () => {
  assert.deepEqual(probe({ MZ_BASE_URL: 'https://inference.baseten.co/v1', BASETEN_API_KEY: 'k' }), { provider: 'baseten', model: 'meta-models/muse-spark-open', error: null });
  assert.match(probe({ MZ_BASE_URL: 'https://inference.baseten.co/v1', MODEL_API_KEY: 'k' }).error, /BASETEN_API_KEY is missing/);
});

test('Fireworks: the same open weights with FIREWORKS_API_KEY, MZ_MODEL overrides', () => {
  assert.deepEqual(probe({ MZ_BASE_URL: 'https://api.fireworks.ai/inference/v1', FIREWORKS_API_KEY: 'k' }), { provider: 'fireworks', model: 'accounts/fireworks/models/muse-spark-open', error: null });
  assert.equal(probe({ MZ_BASE_URL: 'https://api.fireworks.ai/inference/v1', FIREWORKS_API_KEY: 'k', MZ_MODEL: 'accounts/fireworks/models/other' }).model, 'accounts/fireworks/models/other');
  assert.equal(probe({ MZ_BASE_URL: 'https://example.com/v1', MZ_API_KEY: 'k' }).provider, 'example.com');
});

// Caps and ledger, with a fake fetch: each call reports 1M input tokens, i.e. $1.25 at the default price.
const reply = (usage = { prompt_tokens: 1e6, completion_tokens: 0 }, status = 200, headers = {}) => ({ ok: status < 400, status, headers: { get: (h) => headers[h] ?? null }, text: async () => JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }], usage }) });
const fakeFetch = (replies) => { let i = 0; const calls = []; const f = async (url, init) => { calls.push({ url, init }); return replies[Math.min(i++, replies.length - 1)]; }; f.calls = calls; return f; };
const tmpLedger = () => { const d = mkdtempSync(join(tmpdir(), 'mz-ledger-')); return { d, path: join(d, 'spend.json') }; };
const price = { input: 1.25, output: 4.25, cached: 0.15 };
const today = () => new Date().toISOString().slice(0, 10);

test('the run cap stops the next call once the run has spent it', async () => {
  const c = createClient({ key: 'k', capUsd: 2, dailyCapUsd: 0, fetchFn: fakeFetch([reply()]), price });
  await c.ask([]); await c.ask([]); // 1.25 then 2.50: the second starts under the cap
  await assert.rejects(() => c.ask([]), /^Error: Spending cap of \$2 reached for this run\. Raise MZ_CAP_USD to continue\.$/);
  assert.match('Spending cap of $2 reached for this run.', /cap of .* reached/i); // bench/run-demo.js still sees it
  assert.equal(c.counter.calls, 2);
});

test('the daily cap holds across clients that share the ledger', async () => {
  const { d, path } = tmpLedger();
  try {
    const a = createClient({ key: 'k', dailyCapUsd: 3, ledgerPath: path, fetchFn: fakeFetch([reply()]), price });
    const b = createClient({ key: 'k', dailyCapUsd: 3, ledgerPath: path, fetchFn: fakeFetch([reply()]), price });
    await a.ask([]); await b.ask([]); await a.ask([]); // 1.25 + 1.25 + 1.25: no write lost between the two clients
    assert.equal(spentToday(path), 3.75);
    await assert.rejects(() => b.ask([]), /Daily cap of \$3 reached\. Stopped until tomorrow \(UTC\), or raise MZ_DAILY_CAP_USD\./);
    assert.match('Daily cap of $3 reached.', /cap of .* reached/i);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('two clients, one call each: the ledger holds the sum', async () => {
  const { d, path } = tmpLedger();
  try {
    writeFileSync(path, JSON.stringify({ date: today(), usd: 0.5 }));
    const a = createClient({ key: 'k', dailyCapUsd: 10, ledgerPath: path, fetchFn: fakeFetch([reply()]), price });
    const b = createClient({ key: 'k', dailyCapUsd: 10, ledgerPath: path, fetchFn: fakeFetch([reply()]), price });
    await a.ask([]); await b.ask([]);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { date: today(), usd: 3 });
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('the ledger of yesterday is ignored', async () => {
  const { d, path } = tmpLedger();
  try {
    writeFileSync(path, JSON.stringify({ date: '2000-01-01', usd: 99 }));
    const c = createClient({ key: 'k', dailyCapUsd: 5, ledgerPath: path, fetchFn: fakeFetch([reply()]), price });
    await c.ask([]);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { date: today(), usd: 1.25 });
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('cached input is billed at the cached price, a zero price stays zero, finish_reason comes back', async () => {
  const c = createClient({ key: 'k', fetchFn: fakeFetch([reply({ prompt_tokens: 1e6, completion_tokens: 0, prompt_tokens_details: { cached_tokens: 1e6 } })]), price });
  const r = await c.ask([]);
  assert.equal(Math.round(r.counter.usd * 1e6) / 1e6, 0.15);
  assert.equal(r.finish_reason, 'stop');
  const free = createClient({ key: 'k', fetchFn: fakeFetch([reply()]), price: { input: 0, output: 0, cached: 0 } });
  assert.equal((await free.ask([])).counter.usd, 0);
  // MZ_PRICE_IN=0 in the environment means 0, not the default 1.25
  const code = "import('./src/meta.js').then(async (m) => { const c = m.createClient({ key: 'k', fetchFn: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: '' } }], usage: { prompt_tokens: 1e6, completion_tokens: 0 } }) }) }); console.log((await c.ask([])).counter.usd); })";
  const env = { ...process.env, MZ_PRICE_IN: '0' }; delete env.MZ_BASE_URL;
  assert.equal(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout.trim(), '0');
});

test('429 and 5xx are retried twice, retry-after first then 8 s; 4xx is not; the error names the provider', async () => {
  const waits = [];
  const f = fakeFetch([reply(undefined, 429, { 'retry-after': '3' }), reply(undefined, 503), reply()]);
  await createClient({ key: 'k', fetchFn: f, sleep: async (ms) => { waits.push(ms); }, price }).ask([]);
  assert.deepEqual(waits, [3000, 8000]);
  assert.ok(f.calls[0].init.signal instanceof AbortSignal); // every call has its timeout
  const waits2 = [];
  await assert.rejects(() => createClient({ key: 'k', fetchFn: fakeFetch([reply(undefined, 500)]), sleep: async (ms) => { waits2.push(ms); }, price }).ask([]), /^Error: meta 500: /);
  assert.deepEqual(waits2, [2000, 8000]);
  const f401 = fakeFetch([reply(undefined, 401)]);
  await assert.rejects(() => createClient({ key: 'k', fetchFn: f401, sleep: async () => { throw new Error('no wait on 401'); }, price }).ask([]), /meta 401/);
  assert.equal(f401.calls.length, 1);
});

test('metaFetch sets the key, counts the cost it is told, and checks the daily ledger first', async () => {
  const { d, path } = tmpLedger();
  try {
    const f = fakeFetch([{ ok: true, status: 200, text: async () => '{"audioDurationMs":3600000}' }]);
    const r = await metaFetch('/asr/transcribe', { method: 'POST', headers: { accept: 'application/json' } }, { key: 'k', fetchFn: f, dailyCapUsd: 1, ledgerPath: path, cost: (j) => j.audioDurationMs / 3.6e6 * 0.18 });
    assert.equal(r.json.audioDurationMs, 3600000);
    assert.equal(f.calls[0].init.headers.authorization, 'Bearer k');
    assert.equal(f.calls[0].init.headers.accept, 'application/json');
    assert.ok(f.calls[0].url.endsWith('/asr/transcribe'));
    assert.equal(spentToday(path), 0.18);
    writeFileSync(path, JSON.stringify({ date: today(), usd: 1 }));
    await assert.rejects(() => metaFetch('/responses', {}, { key: 'k', fetchFn: f, dailyCapUsd: 1, ledgerPath: path }), /Daily cap of \$1 reached/);
    assert.equal(f.calls.length, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('an unknown MZ_BASE_URL host is announced before the key goes there', () => {
  const env = { ...process.env, MZ_BASE_URL: 'https://evil.example/v1' }; delete env.MZ_API_KEY;
  assert.match(spawnSync(process.execPath, ['--input-type=module', '-e', "import('./src/meta.js')"], { encoding: 'utf8', env }).stderr, /MODEL_API_KEY will be sent to evil\.example/);
  const known = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./src/meta.js')"], { encoding: 'utf8', env: { ...process.env, MZ_BASE_URL: 'https://inference.baseten.co/v1' } });
  assert.doesNotMatch(known.stderr, /will be sent to/);
});
