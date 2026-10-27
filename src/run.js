// Run Mission Zero on a goal: node --env-file=.env src/run.js "goal" [maxTurns]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from './meta.js';
import { run } from './loop.js';
import { makeExecutor } from './tools.js';
import { synthesize } from './synthesis.js';
import { loadLessons, saveLessons, mergeLessons, distill, approvedTexts } from './memory.js';

const goal = process.argv[2];
if (!goal) { console.error('Usage: node --env-file=.env src/run.js "goal" [maxTurns] [contradictions 0-5]'); process.exit(1); }
const maxTurns = Number(process.argv[3]) || 3;
const contradictions = Math.max(0, Math.min(5, Number(process.argv[4] ?? 3) || 0));
const folder = 'evidence/' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync(folder, { recursive: true });

const lessonsPath = 'memory/lessons.json';
const past = loadLessons(lessonsPath);
const client = createClient();
const ask = (messages, opts) => client.ask(messages, { ...opts, max_tokens: 6000 });
const result = await run({
  goal,
  constraints: ['public sources only', 'no spending', 'no contact with third parties'],
  lessons: approvedTexts(past),
  budgetUsd: 1,
  maxTurns,
  contradictions,
  ask,
  execute: makeExecutor({ folder }),
  approve: async () => false, // no real or paid action without a human
  memoryPath: folder + '/memory.json',
  journalPath: folder + '/journal.jsonl',
});
const final = await synthesize({ goal, evidence: result.evidence, ask });
const learned = mergeLessons(past, await distill({ goal, evidence: result.evidence, ask }));
saveLessons(lessonsPath, learned.lessons);
writeFileSync(folder + '/final-answer.json', JSON.stringify(final, null, 2));
const summary = { goal, reached: result.reached, turns: result.turns, best: result.best, confidence: final.confidence, verifiedSources: final.sources.length, rejectedSources: final.rejectedSources, cost: client.counter, lessonsUsed: approvedTexts(past).length, lessonsLearned: learned.added.length };
writeFileSync(folder + '/summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log('Evidence folder:', folder);
