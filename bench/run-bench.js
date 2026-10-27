// Scores two checkers on the test set: the page-checking verifier versus the same model checking from memory.
// Usage: node --env-file=.env bench/run-bench.js
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '../src/meta.js';
import { verifyClaim, selfCheck } from '../src/verify.js';
import { readPage } from '../src/tools.js';

const items = JSON.parse(readFileSync('bench/dataset.json', 'utf8'));
const cV = createClient(); const cS = createClient();
const askV = (m, o) => cV.ask(m, { ...o, max_tokens: 3000 });
const askS = (m, o) => cS.ask(m, { ...o, max_tokens: 2000 });

// Polite page fetch for the benchmark: small pause, and one retry when the site answers "too many requests".
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();
async function fetchPage(url) {
  if (cache.has(url)) return cache.get(url);
  let page;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await sleep(1200 * attempt);
    page = await readPage(url, { maxChars: 60000 });
    if (page.ok || !/429|503/.test(String(page.error))) break;
  }
  cache.set(url, page);
  return page;
}

const rows = [];
for (const it of items) {
  const v = await verifyClaim({ claim: it.claim, url: it.url, ask: askV, fetchPage });
  const s = await selfCheck({ claim: it.claim, ask: askS });
  rows.push({ ...it, verifierFlagged: v.color === 'red', verifierVerdict: v.verdict, selfFlagged: s.verdict === 'false' });
  process.stdout.write('.');
}
console.log('');
const stat = (flagKey) => {
  const bad = rows.filter((r) => r.kind === 'bad'), good = rows.filter((r) => r.kind === 'good');
  const caught = bad.filter((r) => r[flagKey]).length, falseAlarms = good.filter((r) => r[flagKey]).length;
  return { badCaught: caught + '/' + bad.length, recallPct: Math.round(100 * caught / bad.length), falseAlarms: falseAlarms + '/' + good.length, accuracyPct: Math.round(100 * (caught + (good.length - falseAlarms)) / rows.length) };
};
const byKind = {};
for (const r of rows.filter((x) => x.kind === 'bad')) { const k = r.why; byKind[k] = byKind[k] || { n: 0, verifier: 0, self: 0 }; byKind[k].n += 1; byKind[k].verifier += r.verifierFlagged ? 1 : 0; byKind[k].self += r.selfFlagged ? 1 : 0; }
const out = { items: rows.length, verifier: stat('verifierFlagged'), selfCheck: stat('selfFlagged'), byKind, costUsd: Number((cV.counter.usd + cS.counter.usd).toFixed(3)) };
writeFileSync('bench/result.json', JSON.stringify({ ...out, rows }, null, 2));
console.log(JSON.stringify(out, null, 2));
