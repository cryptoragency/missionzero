// A/B test, same goal and ONE shared research loop: the final answer with 0 contradiction rounds vs 3 (escalating to 5).
// Every version of the answer is re-read against the pages it cites before the judge scores it.
// Usage: node --env-file=.env bench/ab-contradiction.js ["goal"]   (about 0.3 USD; stops at the daily cap)
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '../src/meta.js';
import { run } from '../src/loop.js';
import { makeExecutor } from '../src/tools.js';
import { synthesize, seenUrls } from '../src/synthesis.js';
import { refineAnswer } from '../src/contradictAnswer.js';
import { verifyReport } from '../src/verify.js';

const goal = process.argv[2] || 'Find the three most-cited public studies on how often small businesses suffer a cyberattack, with the figure each one reports';
const folder = 'evidence/ab-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync(folder, { recursive: true });
const client = createClient();
const ask = (messages, opts) => client.ask(messages, { max_tokens: 3000, ...opts });
const verifyCache = new Map();
const verify = (sources) => verifyReport({ items: sources.map((s) => ({ claim: s.contribution, url: s.url })), ask, cache: verifyCache });

// One research loop, shared by both variants: only the treatment of the final answer differs.
const result = await run({
  goal, constraints: ['public sources only', 'no spending', 'no contact with third parties'],
  budgetUsd: 1, maxTurns: 2, ask, execute: makeExecutor({ folder, goal }), approve: async () => false,
  journalPath: `${folder}/journal.jsonl`,
});
const draft = await synthesize({ goal, evidence: result.evidence, ask });
const seen = [...seenUrls(result.evidence).values()];
const loopUsd = client.counter.usd;

const rows = [];
for (const contradictions of [0, 3]) {
  const before = client.counter.usd;
  const r = await refineAnswer({ goal, answer: draft, seen, ask, verify, rounds: contradictions });
  writeFileSync(`${folder}/answer-c${contradictions}.json`, JSON.stringify({ ...r.answer, versions: r.versions }, null, 2));
  rows.push({ contradictions, rounds: r.rounds, judgeScore: r.score, confidence: r.answer.confidence, sources: (r.answer.sources || []).length, verifiedGreen: r.green, verifiedRed: r.red, usd: Number((client.counter.usd - before).toFixed(3)) });
}
rows.push({ contradictions: 'research loop (shared)', usd: Number(loopUsd.toFixed(3)) });
writeFileSync(folder + '/ab.json', JSON.stringify({ goal, rows, totalUsd: client.counter.usd }, null, 2));
console.table(rows);
