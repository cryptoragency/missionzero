import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.MZ_WEB_DATA = mkdtempSync(join(tmpdir(), 'mzweb-'));
const { handle, counts, QUESTIONS } = await import('./server.js');
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
