import test from 'node:test';
import assert from 'node:assert/strict';
import { run, readJson } from './loop.js';
import { synthesize } from './synthesis.js';

const script = (replies) => { let i = 0; return async () => ({ text: replies[i++] ?? '{}' }); };

test('readJson tolerates text around the JSON', () => {
  assert.deepEqual(readJson('here {"a":1} end'), { a: 1 });
  assert.equal(readJson('nothing'), null);
});

test('fails, learns, pivots, then reaches the goal', async () => {
  const ask = script([
    '{"hypotheses":["A"],"action":{"type":"web_search","query":"x","costUsd":0,"real":false},"expected":"hits"}',
    '{"score":2,"reached":false,"lesson":"nobody clicks","uncertainties":[],"pivot":"B"}',
    '{"hypotheses":["B"],"action":{"type":"web_search","query":"y","costUsd":0,"real":false},"expected":"answers"}',
    '{"score":8,"reached":true,"lesson":"it works","uncertainties":["small sample"],"pivot":""}',
  ]);
  const r = await run({ goal: 'test', ask, execute: async () => ({ ok: true }) });
  assert.equal(r.reached, true);
  assert.equal(r.turns, 2);
  assert.ok(r.evidence.some((p) => p.step === 'evaluation' && p.score === 2));
});

test('a paid action without approval is never executed', async () => {
  let executed = 0;
  const ask = script(['{"hypotheses":[],"action":{"type":"ad","query":"z","costUsd":20,"real":true},"expected":"?"}']);
  const r = await run({ goal: 't', maxTurns: 1, ask, execute: async () => { executed += 1; return {}; }, approve: async () => false });
  assert.equal(executed, 0);
  assert.equal(r.reached, false);
});

test('the synthesis rejects an invented source', async () => {
  const evidence = [{ step: 'observation', obs: { results: [{ url: 'https://real.example/a', title: 'A', snippet: 'x' }] } }];
  const ask = async () => ({ text: '{"answer":"ok","sources":[{"url":"https://real.example/a","contribution":"1"},{"url":"https://invented.example/z","contribution":"2"}],"confidence":7,"uncertainties":[]}' });
  const r = await synthesize({ goal: 'g', evidence, ask });
  assert.equal(r.sources.length, 1);
  assert.equal(r.rejectedSources, 1);
});
