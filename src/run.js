// Run Mission Zero on a goal: node --env-file=.env src/run.js "goal" [maxTurns]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from './meta.js';
import { run } from './loop.js';
import { makeExecutor } from './tools.js';
import { synthesize } from './synthesis.js';

const goal = process.argv[2];
if (!goal) { console.error('Usage: node --env-file=.env src/run.js "goal" [maxTurns]'); process.exit(1); }
const maxTurns = Number(process.argv[3]) || 3;
const folder = 'evidence/' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync(folder, { recursive: true });

const client = createClient();
const ask = (messages, opts) => client.ask(messages, { ...opts, max_tokens: 6000 });
const result = await run({
  goal,
  constraints: ['public sources only', 'no spending', 'no contact with third parties'],
  budgetUsd: 1,
  maxTurns,
  ask,
  execute: makeExecutor({ folder }),
  approve: async () => false, // no real or paid action without a human
  memoryPath: folder + '/memory.json',
  journalPath: folder + '/journal.jsonl',
});
const final = await synthesize({ goal, evidence: result.evidence, ask });
writeFileSync(folder + '/final-answer.json', JSON.stringify(final, null, 2));
const summary = { goal, reached: result.reached, turns: result.turns, best: result.best, confidence: final.confidence, verifiedSources: final.sources.length, rejectedSources: final.rejectedSources, cost: client.counter };
writeFileSync(folder + '/summary.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log('Evidence folder:', folder);
