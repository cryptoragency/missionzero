import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.MZ_WEB_DATA = mkdtempSync(join(tmpdir(), 'mzweb-'));
const { handle, counts, QUESTIONS, parseBody, callerOf, purgeHits, hitsSize } = await import('./server.js');
const T = (n) => 'token-number-' + n + '-xxxxxxxx';

test('one question with six answers', () => {
  assert.equal(QUESTIONS.length, 1);
  assert.equal(QUESTIONS[0].options.length, 6);
});

test('one browser, one answer per question: answering again replaces it', () => {
  assert.equal(handle('POST', '/api/answer', { token: T(1), q: 'blocker', option: 'data-leak' }, 'a')[0], 200);
  handle('POST', '/api/answer', { token: T(1), q: 'blocker', option: 'no-results' }, 'a');
  assert.equal(counts().blocker['data-leak'], 0);
  assert.equal(counts().blocker['no-results'], 1);
});

test('two browsers add up', () => {
  handle('POST', '/api/answer', { token: T(2), q: 'blocker', option: 'cost' === 'x' ? '' : 'governance' }, 'b');
  handle('POST', '/api/answer', { token: T(5), q: 'blocker', option: 'governance' }, 'e');
  assert.equal(counts().blocker.governance, 2);
});

test('unknown question, unknown option and short token are refused', () => {
  assert.equal(handle('POST', '/api/answer', { token: T(3), q: 'nope', option: 'governance' }, 'c')[0], 400);
  assert.equal(handle('POST', '/api/answer', { token: T(3), q: 'blocker', option: 'nope' }, 'c')[0], 400);
  assert.equal(handle('POST', '/api/answer', { token: 'short', q: 'blocker', option: 'governance' }, 'c')[0], 400);
});

test('a caller going too fast is slowed down', () => {
  let last;
  for (let i = 0; i < 35; i += 1) last = handle('GET', '/api/poll', {}, 'flood');
  assert.equal(last[0], 429);
});

test('a JSON body that is null, a number or an array is an empty body, never a crash', () => {
  for (const raw of ['null', '3', '[]', '"x"', '{bad', '']) assert.deepEqual(parseBody(raw), {});
  assert.deepEqual(parseBody('{"q":"blocker"}'), { q: 'blocker' });
  assert.equal(handle('POST', '/api/answer', null, 'n1')[0], 400);
  assert.equal(handle('POST', '/api/answer', 7, 'n1')[0], 400);
});

test('x-forwarded-for is believed only with MZ_TRUST_PROXY=1', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(callerOf(req, false), '127.0.0.1');
  assert.equal(callerOf(req, true), '203.0.113.9');
  assert.equal(callerOf({ headers: {}, socket: { remoteAddress: '::1' } }, true), '::1');
});

test('callers silent for 10 minutes are forgotten', () => {
  const t0 = Date.now() + 3600000;
  handle('GET', '/api/poll', {}, 'old-caller', t0);
  const before = hitsSize();
  assert.ok(before >= 1);
  handle('GET', '/api/poll', {}, 'new-caller', t0 + 11 * 60000); // more than a minute later: the purge runs first
  assert.equal(purgeHits(t0 + 11 * 60000), 1); // only the new caller is left
});
