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

test('the contradictor attacks, the judge keeps the best-scored plan', async () => {
  const P = (q) => `{"hypotheses":[],"action":{"type":"web_search","query":"${q}","costUsd":0,"real":false},"expected":"e"}`;
  const ask = script([
    P('first'),                                   // plan
    '{"score":7}',                                // judge v0
    '{"objections":["weak"],"flawless":false}',   // contradict 1
    P('second'), '{"score":4}',                   // revise + judge v1 (worse)
    '{"objections":["still weak"],"flawless":false}', // contradict 2
    P('third'), '{"score":9}',                    // revise + judge v2 (best)
    '{"objections":[],"flawless":true}',          // contradict 3: stop
    '{"score":8,"reached":true,"lesson":"ok","uncertainties":[],"pivot":""}',
  ]);
  let executed;
  const r = await run({ goal: 'g', contradictions: 5, maxTurns: 1, ask, execute: async (a) => { executed = a.query; return { ok: true }; } });
  assert.equal(executed, 'third');
  const c = r.evidence.find((p) => p.step === 'contradiction');
  assert.equal(c.rounds, 2);
  assert.equal(c.bestScore, 9);
});

test('a bad note escalates beyond the base rounds, a good one does not', async () => {
  const P = (q) => `{"hypotheses":[],"action":{"type":"web_search","query":"${q}","costUsd":0,"real":false},"expected":"e"}`;
  const bad = (n) => ['{"objections":["x"],"flawless":false}', P('v' + n), '{"score":3}'];
  const askBad = script(['{"score":3}', ...bad(1), ...bad(2), ...bad(3), ...bad(4), ...bad(5)]);
  const { refinePlan } = await import('./contradict.js');
  const a = await refinePlan({ goal: 'g', plan: JSON.parse(P('v0')), ask: askBad, rounds: 3 });
  assert.equal(a.rounds, 5);
  const askGood = script(['{"score":8}', ...bad(1), ...bad(2), ...bad(3), ...bad(4)]);
  const b = await refinePlan({ goal: 'g', plan: JSON.parse(P('v0')), ask: askGood, rounds: 3 });
  assert.equal(b.rounds, 3);
});

test('a revision can never add a cost or a real-world action', async () => {
  const { refinePlan } = await import('./contradict.js');
  const ask = script(['{"score":5}', '{"objections":["x"]}', '{"hypotheses":[],"action":{"type":"ad","query":"q","costUsd":20,"real":true},"expected":"e"}', '{"score":9}']);
  const r = await refinePlan({ goal: 'g', plan: { action: { type: 'web_search', query: 'q', costUsd: 0, real: false } }, ask, rounds: 1, escalate: false });
  assert.equal(r.plan.action.costUsd, 0);
  assert.equal(r.plan.action.real, false);
});

test('only the objections that raised the note feed the lessons', async () => {
  const { winningObjections } = await import('./memory.js');
  const evidence = [{ step: 'contradiction', versions: [
    { round: 0, score: 5, objections: [] },
    { round: 1, score: 8, objections: ['DBIR is not a prevalence survey'] },
    { round: 2, score: 4, objections: ['noise'] },
  ] }];
  assert.deepEqual(winningObjections(evidence), ['DBIR is not a prevalence survey']);
});

test('on the final answer, a red claim caps the note and the best verified version wins', async () => {
  const { refineAnswer, RED_CAP } = await import('./contradictAnswer.js');
  const seen = [{ url: 'https://a.example/1' }, { url: 'https://b.example/2' }];
  const A = (u, c) => `{"answer":"x","sources":[{"url":"${u}","contribution":"${c}"}],"confidence":5,"uncertainties":[]}`;
  const ask = script([
    '{"score":9}',                                     // judge v0 (capped: red)
    '{"objections":["claim not on the page"]}',        // contradict 1
    A('https://b.example/2', 'ok'), '{"score":8}',     // revise + judge v1 (green)
    '{"objections":[],"flawless":true}',               // contradict 2: stop
  ]);
  const verify = async (sources) => ({ results: [], green: sources.some((s) => s.url.includes('b.example')) ? 1 : 0, red: sources.some((s) => s.url.includes('a.example')) ? 1 : 0 });
  const r = await refineAnswer({ goal: 'g', answer: JSON.parse(A('https://a.example/1', 'bad')), seen, ask, verify, rounds: 3 });
  assert.equal(r.versions[0].score, RED_CAP);
  assert.equal(r.score, 8);
  assert.equal(r.answer.sources[0].url, 'https://b.example/2');
  assert.equal(r.rounds, 1);
});

test('a revised answer citing an unseen URL loses that source', async () => {
  const { refineAnswer, NO_SOURCE_CAP } = await import('./contradictAnswer.js');
  const ask = script(['{"score":4}', '{"objections":["x"]}', '{"answer":"y","sources":[{"url":"https://invented.example/z","contribution":"c"}],"confidence":9}', '{"score":9}']);
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [] }, seen: [], ask, verify: async () => ({ results: [], green: 0, red: 0 }), rounds: 1, escalate: false });
  assert.equal(r.versions[1].score, NO_SOURCE_CAP);
  assert.deepEqual(r.answer.sources, []);
});
