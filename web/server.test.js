import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.MZ_WEB_DATA = mkdtempSync(join(tmpdir(), 'mzweb-'));
const { handle, counts } = await import('./server.js');
const T = (n) => 'token-number-' + n + '-xxxxxxxx';

test('one browser, one vote: voting again changes it, never adds', () => {
  assert.equal(handle('POST', '/api/vote', { token: T(1), option: 'data-leak' }, 'a')[0], 200);
  handle('POST', '/api/vote', { token: T(1), option: 'cost' }, 'a');
  assert.equal(counts()['data-leak'], 0);
  assert.equal(counts().cost, 1);
});

test('two different browsers add up', () => {
  handle('POST', '/api/vote', { token: T(2), option: 'cost' }, 'b');
  assert.equal(counts().cost, 2);
});

test('unknown option, short token and empty goal are refused', () => {
  assert.equal(handle('POST', '/api/vote', { token: T(3), option: 'nope' }, 'c')[0], 400);
  assert.equal(handle('POST', '/api/vote', { token: 'short', option: 'cost' }, 'c')[0], 400);
  assert.equal(handle('POST', '/api/goal', { token: T(3), text: 'hi' }, 'c')[0], 400);
});

test('html is stripped from text and nothing personal is stored', () => {
  const [code] = handle('POST', '/api/feedback', { token: T(4), target: 'latest-answer', helpful: false, note: '<script>x</script> bad source' }, 'd');
  assert.equal(code, 200);
});

test('a caller going too fast is slowed down', () => {
  let last;
  for (let i = 0; i < 25; i += 1) last = handle('GET', '/api/poll', {}, 'flood');
  assert.equal(last[0], 429);
});
