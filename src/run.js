// Run Mission Zero on a goal: node --env-file=.env src/run.js "goal" [maxTurns]
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { createClient } from './meta.js';
import { run } from './loop.js';
import { makeExecutor } from './tools.js';
import { synthesize, seenUrls } from './synthesis.js';
import { refineAnswer } from './contradictAnswer.js';
import { verifyReport } from './verify.js';
import { makeResearch } from './research.js';
import { loadLessons, saveLessons, mergeLessons, distill, approvedTexts } from './memory.js';

const goal = process.argv[2];
if (!goal) { console.error('Usage: node --env-file=.env src/run.js "goal" [maxTurns] [contradictions 0-5]'); process.exit(1); }
const maxTurns = Number(process.argv[3]) || 3;
// Contradiction rounds apply to the FINAL ANSWER (3 by default, up to 5 while the note is bad).
// Rounds on the plan lost the A/B of 2026-10-27; they stay available through MZ_PLAN_CONTRADICTIONS (default 0).
const contradictions = Math.max(0, Math.min(5, Number(process.argv[4] ?? 3) || 0));
const planContradictions = Math.max(0, Math.min(5, Number(process.env.MZ_PLAN_CONTRADICTIONS) || 0));
const folder = 'evidence/' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync(folder, { recursive: true });

const lessonsPath = 'memory/lessons.json';
const past = loadLessons(lessonsPath);
const client = createClient();
const ask = (messages, opts) => client.ask(messages, { max_tokens: 3000, ...opts });
const execute = makeExecutor({ folder, goal });
const result = await run({
  goal,
  constraints: ['public sources only', 'no spending', 'no contact with third parties'],
  lessons: approvedTexts(past),
  budgetUsd: 1,
  maxTurns,
  contradictions: planContradictions,
  ask,
  execute,
  approve: async () => false, // no real or paid action without a human
  memoryPath: folder + '/memory.json',
  journalPath: folder + '/journal.jsonl',
});
const draft = await synthesize({ goal, evidence: result.evidence, ask });
const verifyCache = new Map();
const verify = (sources) => verifyReport({ items: sources.map((s) => ({ claim: s.contribution, url: s.url })), ask, cache: verifyCache });
const research = makeResearch({ ask, execute, evidence: result.evidence, note: (e) => appendFileSync(folder + '/journal.jsonl', JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n') });
const refined = await refineAnswer({ goal, answer: draft, seen: [...seenUrls(result.evidence).values()], ask, verify, research, rounds: contradictions });
const final = { ...refined.answer, rejectedSources: draft.rejectedSources, judge: { score: refined.score, green: refined.green, red: refined.red, rounds: refined.rounds, versions: refined.versions } };
const learned = mergeLessons(past, await distill({ goal, evidence: result.evidence, ask }));
saveLessons(lessonsPath, learned.lessons);
writeFileSync(folder + '/final-answer.json', JSON.stringify(final, null, 2));
const summary = { goal, reached: result.reached, turns: result.turns, best: result.best, confidence: final.confidence, judgeScore: refined.score, verifiedGreen: refined.green, verifiedRed: refined.red, contradictionRounds: refined.rounds, verifiedSources: final.sources.length, rejectedSources: final.rejectedSources, cost: client.counter, verificationsCached: [...verifyCache.keys()].length, lessonsUsed: approvedTexts(past).length, lessonsLearned: learned.added.length };
writeFileSync(folder + '/summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log('Evidence folder:', folder);
