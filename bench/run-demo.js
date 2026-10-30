// Demo bench: plays the goals of demo-goals.json one after the other, each as a full Mission Zero run
// (4 research turns, 3 contradiction rounds on the final answer), and prints one table.
// Usage: node --env-file=.env bench/run-demo.js [--only=1,3] [--turns=4] [--rounds=3] [--dry]
// Cost: about $0.04 to $0.09 per goal (the five demo goals); the daily cap in .env stops everything when reached.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { evidenceFolder } from '../src/evidenceDir.js';

// Both caps of src/meta.js ("Spending cap of $x reached for this run", "Daily cap of $x reached"): src/meta.test.js reads
// this line and checks the real error messages against it.
const CAP_REACHED = /cap of .* reached/i;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const goals = JSON.parse(readFileSync(new URL('./demo-goals.json', import.meta.url), 'utf8'));
const only = args.only ? String(args.only).split(',').map(Number) : null;
const turns = Number(args.turns) || 4;
const rounds = Number(args.rounds) || 3;
const chosen = goals.filter((g) => !only || only.includes(g.id));

if (args.dry) {
  for (const g of chosen) console.log(`${g.id}. ${g.goal}\n   expected: ${g.expected}\n   why: ${g.why}\n`);
  console.log(`${chosen.length} goals, ${turns} turns, ${rounds} rounds. Nothing was run.`);
  process.exit(0);
}

const folder = evidenceFolder('demo-');
mkdirSync(folder, { recursive: true });
const rows = [];
for (const g of chosen) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--env-file-if-exists=.env', 'src/run.js', g.goal, String(turns), String(rounds)], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 30 * 60000 }); // a stuck goal is killed after 30 min
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/\{[\s\S]*\n\}/);
  let s = null;
  try { s = m ? JSON.parse(m[0]) : null; } catch { s = null; }
  const evidence = (out.match(/Evidence folder: (\S+)/) || [])[1] || '';
  rows.push({
    id: g.id, reached: s?.reached ?? null, judge: s?.judgeScore ?? null, green: s?.verifiedGreen ?? null, red: s?.verifiedRed ?? null,
    rounds: s?.contradictionRounds ?? null, usd: s ? Number(s.cost.usd.toFixed(3)) : null, min: Number(((Date.now() - t0) / 60000).toFixed(1)),
    evidence, error: s ? '' : out.split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 160),
  });
  console.table(rows);
  if (!s && CAP_REACHED.test(out)) { console.log('Spending cap reached: stopping.'); break; }
}
writeFileSync(`${folder}/demo.json`, JSON.stringify({ turns, rounds, goals: chosen, rows }, null, 2));
console.log('Saved:', `${folder}/demo.json`);
