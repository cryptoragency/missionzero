import test from 'node:test';
import assert from 'node:assert/strict';
import { run, readJson } from './loop.js';
import { synthesize } from './synthesis.js';

const script = (replies) => { let i = 0; return async () => ({ text: replies[i++] ?? '{}' }); };

test('readJson tolerates text around the JSON', () => {
  assert.deepEqual(readJson('here {"a":1} end'), { a: 1 });
  assert.equal(readJson('nothing'), null);
});

test('readJson takes the first balanced object, even when a sentence with a brace follows', () => {
  assert.deepEqual(readJson('{"score":7,"reason":"ok"} Note: the set {a, b} was skipped.'), { score: 7, reason: 'ok' });
  assert.deepEqual(readJson('{"a":"a } inside a string","b":{"c":1}} trailing }'), { a: 'a } inside a string', b: { c: 1 } });
  assert.deepEqual(readJson('{"q":"say \\"{\\""} x'), { q: 'say "{"' });
  assert.deepEqual(readJson('{not json} then {"ok":true}'), { ok: true }); // a broken first object does not hide a good one
  assert.equal(readJson('{"open":1'), null);
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

test('an objection about a missing figure triggers one research action and the rewrite may cite what it fetched', async () => {
  const { refineAnswer } = await import('./contradictAnswer.js');
  const { makeResearch, needsResearch } = await import('./research.js');
  assert.equal(needsResearch(['answer lists zero figures']), true);
  assert.equal(needsResearch(['tone is too long']), false);
  const ask = script([
    '{"score":2}',                                                                   // judge v0
    '{"objections":["missing figure; primary report seen but not read"]}',           // contradict 1
    '{"action":{"type":"read_page","url":"https://primary.example/report","costUsd":0,"real":false}}', // research
    '{"answer":"53% (Hiscox 2023)","sources":[{"url":"https://primary.example/report","contribution":"53%"}],"confidence":8}', // rewrite
    '{"score":9}',                                                                   // judge v1
  ]);
  let executed = null;
  const execute = async (a) => { executed = a; return { ok: true, url: a.url, text: 'x'.repeat(300) }; };
  const research = makeResearch({ ask, execute });
  const seen = [{ url: 'https://primary.example/report', title: 'search hit', snippet: 'Hiscox report' }]; // read_page only reads a seen URL
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'no figure', sources: [] }, seen, ask, verify: async () => ({ results: [], green: 1, red: 0 }), research, rounds: 1, escalate: false });
  assert.equal(executed.type, 'read_page');
  assert.equal(r.answer.sources[0].url, 'https://primary.example/report'); // newly seen: kept, not rejected
  assert.equal(r.versions[1].fetched, 1);
  assert.equal(r.score, 9);
});

test('a page read in full replaces the search snippet of the same URL, and is never fetched twice', async () => {
  const { refineAnswer } = await import('./contradictAnswer.js');
  const { makeResearch } = await import('./research.js');
  const url = 'https://primary.example/report.pdf';
  const A = '{"answer":"53%","sources":[{"url":"' + url + '","contribution":"53%"}],"confidence":8}';
  const ask = script([
    '{"score":2}', '{"objections":["primary report seen but not read"]}',
    '{"action":{"type":"read_page","url":"' + url + '","costUsd":0,"real":false}}', A, '{"score":4}',
    '{"objections":["figure still missing"]}',
    '{"action":{"type":"read_page","url":"' + url + '","costUsd":0,"real":false}}', A, '{"score":4}',
  ]);
  let fetches = 0;
  const execute = async (a) => { fetches += 1; return { ok: true, url: a.url, text: 'full text '.repeat(40) }; };
  const seen = [{ url, title: 'DBIR 2025', snippet: 'snippet' }];
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [] }, seen, ask, verify: async () => ({ results: [], green: 1, red: 0 }), research: makeResearch({ ask, execute }), rounds: 2, escalate: false });
  assert.equal(fetches, 1);
  assert.equal(r.versions[1].fetched, 1); // the snippet was upgraded to the full text
  assert.equal(r.versions[2].fetched, 0);
});

test('the contradictor stops after two rounds without a better note', async () => {
  const { refineAnswer, STAGNATION } = await import('./contradictAnswer.js');
  const A = '{"answer":"x","sources":[],"confidence":1}';
  const ask = script(['{"score":2}', ...Array(5).fill(['{"objections":["o"]}', A, '{"score":2}']).flat()]);
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [] }, seen: [], ask, verify: async () => ({ results: [], green: 0, red: 0 }), rounds: 3 });
  assert.equal(r.rounds, STAGNATION);
});

test('a verified claim is not checked twice in the same run', async () => {
  const { verifyReport } = await import('./verify.js');
  let calls = 0;
  const ask = async () => { calls += 1; return { text: '{"verdict":"supported","quote":"the study surveyed 4000 firms"}' }; };
  const fetchPage = async () => ({ ok: true, text: 'Intro sentence here that is long enough. The study surveyed 4000 firms across eleven countries in 2019.' });
  const cache = new Map();
  const items = [{ claim: 'surveyed 4000 firms', url: 'https://a.example' }];
  const a = await verifyReport({ items, ask, fetchPage, cache });
  const b = await verifyReport({ items, ask, fetchPage, cache });
  assert.equal(calls, 1);
  assert.equal(a.green, 1);
  assert.equal(b.results[0].cached, true);
});

test('a red claim sends the agent back to the cited page with the claim as target, even when the contradictor finds no flaw', async () => {
  const { refineAnswer } = await import('./contradictAnswer.js');
  const { makeReread } = await import('./research.js');
  const url = 'https://who.example/report';
  const seen = [{ url, title: 'snippet', snippet: 'short' }];
  let verdict = 'unsupported';
  const verify = async (sources) => ({ results: sources.map((s) => ({ url: s.url, claim: s.contribution, verdict, color: verdict === 'supported' ? 'green' : 'red', detail: 'nearest passages: "10.8 million"' })), green: verdict === 'supported' ? sources.length : 0, red: verdict === 'supported' ? 0 : sources.length });
  const ask = script([
    '{"score":8}',                                   // judge v0: 8 but capped at 5 by the red claim
    '{"objections":[],"flawless":true}',             // contradictor: no flaw, yet the red claim is an objection
    '{"answer":"10.8 million fell ill in 2023","sources":[{"url":"https://who.example/report","contribution":"an estimated 10.8 million people fell ill with TB in 2023"}],"confidence":9}', // rewrite in the page's words
    '{"score":10}',                                  // judge v1
  ]);
  const executed = [];
  const execute = async (a) => { executed.push(a); verdict = 'supported'; return { ok: true, url: a.url, text: 'an estimated 10.8 million people fell ill with TB in 2023 '.repeat(10) }; };
  const reread = makeReread({ execute });
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'about 11 million', sources: [{ url, contribution: 'about 11 million sick' }] }, seen, ask, verify, reread, rounds: 1, escalate: false });
  assert.equal(executed.length, 1);
  assert.equal(executed[0].type, 'read_page');
  assert.equal(executed[0].url, url);
  assert.equal(executed[0].find, 'about 11 million sick'); // the claim itself is the target
  assert.equal(r.versions[0].score, 5); // capped
  assert.equal(r.versions[1].reread, 1);
  assert.ok(r.versions[1].objections.some((o) => o.startsWith('RED:')));
  assert.equal(r.score, 10);
  // the same (url, claim) is never re-read twice in a run
  assert.deepEqual(await reread({ reds: [{ url, claim: 'about 11 million sick', verdict: 'unsupported' }], seen }), []);
});

test('an unreadable judge, twice, is never a silent 0: the reason says it', async () => {
  const { refineAnswer } = await import('./contradictAnswer.js');
  const ask = script(['the judge rambled and was cut', 'still no JSON']);
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [{ url: 'https://a.example/1', contribution: 'c' }] }, seen: [{ url: 'https://a.example/1' }], ask, verify: async () => ({ results: [], green: 1, red: 0 }), rounds: 0 });
  assert.equal(r.score, 0);
  assert.match(r.versions[0].reason, /unreadable/);
});

test('an answer without any source never scores above NO_SOURCE_CAP, and a red claim says it was capped', async () => {
  const { refineAnswer, NO_SOURCE_CAP, RED_CAP } = await import('./contradictAnswer.js');
  const none = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [] }, seen: [], ask: script(['{"score":10,"reason":"great"}']), verify: async () => ({ results: [], green: 0, red: 0 }), rounds: 0 });
  assert.equal(none.score, NO_SOURCE_CAP);
  const red = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [{ url: 'https://a.example/1', contribution: 'c' }] }, seen: [{ url: 'https://a.example/1' }], ask: script(['{"score":9,"reason":"precise"}']), verify: async () => ({ results: [], green: 0, red: 1 }), rounds: 0 });
  assert.equal(red.score, RED_CAP);
  assert.equal(red.versions[0].reason, 'precise (capped at 5: red claim)');
});

test('a verifier that throws keeps the best version already graded', async () => {
  const { refineAnswer, RED_CAP } = await import('./contradictAnswer.js');
  const A = '{"answer":"y","sources":[{"url":"https://a.example/1","contribution":"c2"}],"confidence":5}';
  const ask = script(['{"score":6}', '{"objections":["x"]}', A, '{"score":9}', '{"objections":["x"]}', A, '{"score":9}', '{"objections":["x"]}']);
  let n = 0;
  const verify = async () => { n += 1; if (n > 1) throw new Error('Daily cap of $5 reached.'); return { results: [], green: 1, red: 0 }; };
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [{ url: 'https://a.example/1', contribution: 'c' }] }, seen: [{ url: 'https://a.example/1' }], ask, verify, rounds: 3, escalate: false });
  assert.equal(r.score, 6); // the failed versions were capped at RED_CAP and the first one stays
  assert.equal(r.answer.answer, 'x');
  assert.ok(r.versions[1].score <= RED_CAP);
  assert.match(r.versions[1].reason, /^verification failed: Daily cap/);
});

test('an unreadable rewrite counts as a round without progress', async () => {
  const { refineAnswer, STAGNATION } = await import('./contradictAnswer.js');
  let rewrites = 0;
  const base = script(['{"score":3}']);
  const ask = async (m, o) => { if (o.tag === 'rewrite') { rewrites += 1; return { text: 'no json' }; } if (o.tag === 'contradict') return { text: '{"objections":["o"]}' }; return base(); };
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'x', sources: [] }, seen: [], ask, verify: async () => ({ results: [], green: 0, red: 0 }), rounds: 5 });
  assert.equal(rewrites, STAGNATION);
  assert.equal(r.rounds, 0);
});

test('research never reads an unseen URL nor runs another action type', async () => {
  const { makeResearch } = await import('./research.js');
  let executed = 0;
  const execute = async () => { executed += 1; return { ok: true }; };
  const objections = ['missing figure'];
  const seen = [{ url: 'https://seen.example/a' }];
  for (const action of ['{"type":"read_page","url":"https://invented.example/z"}', '{"type":"create_page","name":"x","content":"<p>"}']) {
    const research = makeResearch({ ask: async () => ({ text: '{"action":' + action + '}' }), execute });
    assert.deepEqual(await research({ goal: 'g', objections, seen }), []);
  }
  assert.equal(executed, 0);
  await makeResearch({ ask: async () => ({ text: '{"action":{"type":"read_page","url":"https://seen.example/a"}}' }), execute })({ goal: 'g', objections, seen });
  assert.equal(executed, 1);
});

test('a page read again counts as a re-read even when it was already in seen as read in full', async () => {
  const { refineAnswer } = await import('./contradictAnswer.js');
  const url = 'https://who.example/report';
  const page = { url, title: 'page read in full', snippet: 'an estimated 10.8 million people fell ill' };
  let verdict = 'unsupported';
  const verify = async (sources) => ({ results: sources.map((s) => ({ url: s.url, claim: s.contribution, verdict, detail: 'x' })), green: verdict === 'supported' ? sources.length : 0, red: verdict === 'supported' ? 0 : sources.length });
  const ask = script(['{"score":8}', '{"objections":[],"flawless":true}', '{"answer":"10.8 million","sources":[{"url":"https://who.example/report","contribution":"an estimated 10.8 million people fell ill"}],"confidence":9}', '{"score":9}']);
  const reread = async () => { verdict = 'supported'; return [page]; }; // the same page, already read in full: merge adds nothing
  const r = await refineAnswer({ goal: 'g', answer: { answer: 'about 11 million', sources: [{ url, contribution: 'about 11 million sick' }] }, seen: [page], ask, verify, reread, rounds: 1, escalate: false });
  assert.equal(r.versions[1].reread, 1);
});
