import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyClaim, verifyReport, quoteProblem } from './verify.js';

const PAGE = { ok: true, text: 'Introduction to the guidance, long enough to be a sentence. Verifiers SHALL require passwords to be a minimum of 15 characters in length when used alone. Other rules follow in the next section of this document.' };
const CLAIM = 'Passwords used alone must be at least 15 characters long';
const answer = (o) => async () => ({ text: JSON.stringify(o) });

test('"supported" without a quote is not trusted: unsupported, red', async () => {
  const r = await verifyClaim({ claim: CLAIM, url: 'https://n.example', ask: answer({ verdict: 'supported', quote: '' }), fetchPage: async () => PAGE });
  assert.equal(r.verdict, 'unsupported'); assert.equal(r.color, 'red'); assert.match(r.detail, /no quote/);
});

test('a quote too short, or one that drops the figure, is not proof; the whole quote must be in a passage', async () => {
  const short = await verifyClaim({ claim: CLAIM, url: 'https://n.example', ask: answer({ verdict: 'supported', quote: 'Verifiers SHALL' }), fetchPage: async () => PAGE });
  assert.equal(short.verdict, 'unsupported'); assert.match(short.detail, /too short/);
  const noFigure = await verifyClaim({ claim: CLAIM, url: 'https://n.example', ask: answer({ verdict: 'supported', quote: 'Verifiers SHALL require passwords to be a minimum of' }), fetchPage: async () => PAGE });
  assert.equal(noFigure.verdict, 'unsupported'); assert.match(noFigure.detail, /figure 15/);
  // The first 60 characters match, the end is invented: refused (the old check only compared the start).
  const invented = await verifyClaim({ claim: CLAIM, url: 'https://n.example', ask: answer({ verdict: 'supported', quote: 'Verifiers SHALL require passwords to be a minimum of 15 characters in length, always, for every account' }), fetchPage: async () => PAGE });
  assert.equal(invented.verdict, 'unsupported'); assert.match(invented.detail, /not in the passages/);
  // Case and runs of spaces do not count.
  const ok = await verifyClaim({ claim: CLAIM, url: 'https://n.example', ask: answer({ verdict: 'supported', quote: 'verifiers shall require  passwords to be a MINIMUM of 15 characters' }), fetchPage: async () => PAGE });
  assert.equal(ok.verdict, 'supported'); assert.equal(ok.color, 'green');
  assert.equal(quoteProblem('15 characters', 'at least 15 characters', [PAGE.text]), null); // short, but it carries the figure
});

test('an unreachable page is red', async () => {
  const r = await verifyClaim({ claim: CLAIM, url: 'https://down.example', ask: answer({ verdict: 'supported', quote: 'x' }), fetchPage: async () => ({ ok: false, error: 'http 503' }) });
  assert.equal(r.verdict, 'source-unreachable'); assert.equal(r.color, 'red'); assert.equal(r.detail, 'http 503');
});

test('a page cited by two claims is read once in the run, and the verdict cache keys stay verdicts only', async () => {
  let reads = 0;
  const fetchPage = async () => { reads += 1; return PAGE; };
  const ask = answer({ verdict: 'supported', quote: 'Verifiers SHALL require passwords to be a minimum of 15 characters in length when used alone.' });
  const cache = new Map();
  const items = [{ claim: CLAIM, url: 'https://n.example' }, { claim: 'Verifiers require passwords of 15 characters at minimum', url: 'https://n.example' }];
  const a = await verifyReport({ items, ask, fetchPage, cache });
  assert.equal(a.green, 2); assert.equal(reads, 1);
  await verifyReport({ items: [{ claim: 'A third claim about the 15 characters minimum for passwords', url: 'https://n.example' }], ask, fetchPage, cache });
  assert.equal(reads, 1, 'the page is kept for the whole run');
  assert.equal([...cache.keys()].length, 3);
});
