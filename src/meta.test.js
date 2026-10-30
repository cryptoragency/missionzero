import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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
