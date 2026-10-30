// Head-to-head: a fixed plan (decided once, never adapted) versus the Mission Zero loop.
// Same goal, same model, same tools, same judge. Usage: node --env-file=.env src/compare.js "goal" [maxTurns]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from './meta.js';
import { run, readJson } from './loop.js';
import { makeExecutor, readPage } from './tools.js';
import { synthesize } from './synthesis.js';
import { loadLessons, saveLessons, mergeLessons, distill, approvedTexts } from './memory.js';
import { evidenceFolder } from './evidenceDir.js';

const goal = process.argv[2];
if (!goal) { console.error('Usage: node --env-file=.env src/compare.js "goal" [maxTurns]'); process.exit(1); }
const maxTurns = Number(process.argv[3]) || 5;
const folder = evidenceFolder('compare-');
mkdirSync(folder, { recursive: true });

// Each contender gets its own client so cost, calls and time are measured separately.
async function fixedPlan(client) {
  const ask = (m, o) => client.ask(m, { ...o, max_tokens: 6000 });
  const execute = makeExecutor({ folder });
  const r = await ask([
    { role: 'system', content: 'Make a FIXED plan of exactly N web searches to reach the goal, decided once. JSON: {"queries":["3 to 8 keywords"]}.' },
    { role: 'user', content: JSON.stringify({ goal, N: maxTurns }) },
  ]);
  const queries = (readJson(r.text)?.queries || []).slice(0, maxTurns);
  const evidence = [];
  for (const query of queries) {
    const obs = await execute({ type: 'web_search', query });
    evidence.push({ step: 'observation', obs });
    if (obs.results?.[0]?.url) evidence.push({ step: 'observation', obs: await readPage(obs.results[0].url) });
  }
  const final = await synthesize({ goal, evidence, ask });
  return { final, searches: queries.length };
}

const lessonsPath = 'memory/lessons.json';
async function missionZero(client) {
  const ask = (m, o) => client.ask(m, { ...o, max_tokens: 6000 });
  const past = loadLessons(lessonsPath);
  const result = await run({ goal, constraints: ['public sources only', 'no spending'], lessons: approvedTexts(past), maxTurns, ask, execute: makeExecutor({ folder }), approve: async () => false });
  const final = await synthesize({ goal, evidence: result.evidence, ask });
  const learned = mergeLessons(past, await distill({ goal, evidence: result.evidence, ask }));
  saveLessons(lessonsPath, learned.lessons);
  return { final, searches: result.turns, lessonsUsed: approvedTexts(past).length };
}

// One neutral judge scores both answers blindly (A/B in random order) on the same rubric.
async function judgeOnce(client, answers, order) {
  const r = await client.ask([
    { role: 'system', content: 'You are a strict, neutral judge. Score each answer from 0 to 10 on: directly answers the goal, concrete and quantified, sources really support the claims, honesty about limits. JSON: {"A":0-10,"B":0-10,"why":""}.' },
    { role: 'user', content: JSON.stringify({ goal, A: answers[order[0]], B: answers[order[1]] }) },
  ], { max_tokens: 6000 });
  const j = readJson(r.text) || { A: 0, B: 0, why: 'unreadable' };
  const scores = []; scores[order[0]] = Number(j.A) || 0; scores[order[1]] = Number(j.B) || 0;
  return { scores, why: j.why };
}
// The judge scores twice with the order swapped and averages, to cancel position bias and noise.
async function judge(client, answers) {
  const a = await judgeOnce(client, answers, [0, 1]);
  const b = await judgeOnce(client, answers, [1, 0]);
  return { scores: [(a.scores[0] + b.scores[0]) / 2, (a.scores[1] + b.scores[1]) / 2], why: a.why };
}

const cFixed = createClient(); const cMz = createClient(); const cJudge = createClient();
const t0 = Date.now();
const fixed = await fixedPlan(cFixed); const tFixed = Date.now() - t0;
const t1 = Date.now();
const mz = await missionZero(cMz); const tMz = Date.now() - t1;
const verdict = await judge(cJudge, [
  { answer: fixed.final.answer, sources: fixed.final.sources, uncertainties: fixed.final.uncertainties },
  { answer: mz.final.answer, sources: mz.final.sources, uncertainties: mz.final.uncertainties },
]);
const row = (name, x, c, ms, score) => ({ approach: name, searches: x.searches, verifiedSources: x.final.sources.length, rejectedSources: x.final.rejectedSources, selfConfidence: x.final.confidence, judgeScore: score, modelCalls: c.counter.calls, costUsd: Number(c.counter.usd.toFixed(3)), seconds: Math.round(ms / 1000) });
const table = [row('Fixed plan', fixed, cFixed, tFixed, verdict.scores[0]), row('Mission Zero', mz, cMz, tMz, verdict.scores[1])];
const out = { goal, lessonsUsedByMissionZero: mz.lessonsUsed, table, judgeWhy: verdict.why, fixedAnswer: fixed.final.answer, missionZeroAnswer: mz.final.answer };
writeFileSync(folder + '/comparison.json', JSON.stringify(out, null, 2));
console.table(table);
console.log('Judge:', verdict.why);
console.log('Folder:', folder);
