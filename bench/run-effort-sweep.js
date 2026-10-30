// Effort sweep: the same mission played at every reasoning effort (one level forced for all roles through MZ_EFFORT),
// then with Mission Zero's own setting (one effort per role). Measured, not asserted: judge score, verified sources,
// cost, reasoning tokens, truncated answers, seconds. The agent's memory is the same for every run (lessons.json and
// outcomes.json are saved before and restored after each run, resets are off), so only the effort changes.
// Usage: node --env-file=.env bench/run-effort-sweep.js [--goal=1] [--efforts=minimal,low,medium,high,xhigh,max,per-role] [--turns=3] [--rounds=1] [--cap=0.5] [--dry]
// Cost: about 0.05 USD per run at low effort, more at high and above (the reasoning is billed as output); --cap bounds each run.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const goals = JSON.parse(readFileSync(new URL('./demo-goals.json', import.meta.url), 'utf8'));
const goal = goals.find((g) => g.id === (Number(args.goal) || 1));
const efforts = String(args.efforts || 'minimal,low,medium,high,xhigh,max,per-role').split(',').map((s) => s.trim()).filter(Boolean);
const turns = Number(args.turns) || 3;
const rounds = args.rounds === undefined ? 1 : Number(args.rounds) || 0;
const cap = Number(args.cap) || 0.5;

if (args.dry) {
  console.log(`${goal.id}. ${goal.goal}\n   expected: ${goal.expected}\n${efforts.length} runs (${efforts.join(', ')}), ${turns} turns, ${rounds} rounds, cap ${cap} $ per run. Nothing was run.`);
  process.exit(0);
}

const folder = 'evidence/effort-sweep-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync(folder, { recursive: true });
// Same memory for every run: what the agent knows before the sweep is put back after each mission.
const keep = ['memory/lessons.json', 'memory/outcomes.json'].filter(existsSync);
const saved = keep.map((f) => { const b = `${folder}/${f.split('/').pop()}.before`; copyFileSync(f, b); return [f, b]; });
const restore = () => saved.forEach(([f, b]) => copyFileSync(b, f));
const sum = (byTag, k) => Object.values(byTag || {}).reduce((n, b) => n + (b[k] || 0), 0);

const rows = [];
for (const effort of [...new Set(efforts)]) {
  const env = { ...process.env, MZ_ZERO: 'off', MZ_CAP_USD: String(cap) };
  if (effort === 'per-role') delete env.MZ_EFFORT; else env.MZ_EFFORT = effort;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--env-file=.env', 'src/run.js', goal.goal, String(turns), String(rounds)], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, env });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/\{[\s\S]*\n\}/);
  let s = null; try { s = m ? JSON.parse(m[0]) : null; } catch { s = null; }
  const evidence = (out.match(/Evidence folder: (\S+)/) || [])[1] || '';
  rows.push({
    effort, judge: s?.judgeScore ?? null, green: s?.verifiedGreen ?? null, red: s?.verifiedRed ?? null, turns: s?.turns ?? null,
    calls: s?.cost?.calls ?? null, output: s?.cost?.output ?? null, reasoning: s ? sum(s.cost.byTag, 'reasoning') : null, truncated: s ? sum(s.cost.byTag, 'truncated') : null,
    usd: s ? Number(s.cost.usd.toFixed(3)) : null, sec: Math.round((Date.now() - t0) / 1000), evidence, error: s ? '' : out.split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 160),
  });
  restore();
  console.table(rows);
  if (!s && /cap of .* reached/i.test(out) && /Daily/.test(out)) { console.log('Daily cap reached: stopping.'); break; }
}
const md = ['| effort | judge | green | red | turns | calls | output tokens | reasoning tokens | truncated | cost | seconds |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...rows.map((r) => `| ${r.effort} | ${r.judge ?? '–'} | ${r.green ?? '–'} | ${r.red ?? '–'} | ${r.turns ?? '–'} | ${r.calls ?? '–'} | ${r.output ?? '–'} | ${r.reasoning ?? '–'} | ${r.truncated ?? '–'} | ${r.usd === null ? r.error : '$' + r.usd} | ${r.sec} |`)].join('\n');
writeFileSync(`${folder}/sweep.json`, JSON.stringify({ goal, turns, rounds, cap, efforts, rows, memory: 'same lessons and outcomes restored after every run, resets off' }, null, 2));
writeFileSync(`${folder}/sweep.md`, `# Effort sweep · goal ${goal.id}\n\n${goal.goal}\n\n${turns} turns, ${rounds} contradiction rounds, cap $${cap} per run, same memory for every run.\n\n${md}\n`);
saved.forEach(([, b]) => rmSync(b, { force: true }));
console.log(md); console.log('Saved:', `${folder}/sweep.json`, `${folder}/sweep.md`);
