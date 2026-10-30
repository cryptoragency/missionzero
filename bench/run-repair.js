// Repair mode on a findings file: node --env-file=.env bench/run-repair.js demo-site/findings.example.json [--site=demo-site] [--only=F02,F11] [--turns=2] [--rounds=1] [--scan] [--from=URL]
// --scan: ignore the file and scan the site first (it is started on a free port).
// --from=URL: fetch the findings from any scanner that serves the generic format (the URL and the key stay in .env:
//   MZ_SCANNER_URL, MZ_SCANNER_KEY sent as a Bearer token). The code knows no scanner by name.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '../src/meta.js';
import { repairAll, freePort, startSite } from '../src/repair.js';
import { scan } from '../src/scanner.js';
import { appendChain, verifyChain } from '../src/chain.js';
import { loadLessons, approvedTexts } from '../src/memory.js';
import { evidenceFolder } from '../src/evidenceDir.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const file = process.argv.find((x, i) => i >= 2 && !x.startsWith('--'));
const siteDir = arg('site', 'demo-site');
const only = arg('only', '') ? arg('only', '').split(',') : null;
const from = arg('from', process.env.MZ_SCANNER_URL || '');
// --login=user:password enables the session probes (default: the demo shop's admin); --login=none for a site without accounts.
const loginArg = arg('login', 'admin:maisonverde2019');
const login = loginArg === 'none' ? null : { user: loginArg.split(':')[0], password: loginArg.split(':').slice(1).join(':') };
// --files=server.js,index.html: the files the model may edit (default: server.js). --policy: the generic policy probes join --scan.
const files = arg('files', 'server.js').split(',').map((s) => s.trim()).filter(Boolean);
const folder = evidenceFolder('repair-');
mkdirSync(folder, { recursive: true });

// Findings from any scanner's URL: a JSON document in the generic format ({ findings: [...] }).
export async function fetchFindings(url, key = process.env.MZ_SCANNER_KEY) {
  const r = await fetch(url, { headers: key ? { authorization: 'Bearer ' + key, accept: 'application/json' } : { accept: 'application/json' } });
  if (!r.ok) throw new Error(`The scanner at ${url} answered ${r.status}; check MZ_SCANNER_KEY.`);
  const j = await r.json();
  if (!Array.isArray(j?.findings)) throw new Error('The scanner\'s answer has no "findings" array (expected { "findings": [...] }).');
  return j;
}

let findings;
if (process.argv.includes('--scan') || (!file && !from)) {
  const port = await freePort(); const site = await startSite(siteDir, port);
  try { const r = await scan('http://127.0.0.1:' + port, { login, policy: process.argv.includes('--policy') }); findings = r.findings; writeFileSync(join(folder, 'findings.json'), JSON.stringify(r, null, 2)); } finally { site.stop(); }
} else if (from) {
  const r = await fetchFindings(from); findings = r.findings; writeFileSync(join(folder, 'findings.json'), JSON.stringify(r, null, 2));
  console.log(`Fetched ${findings.length} findings from the scanner.`);
} else { const r = JSON.parse(readFileSync(file, 'utf8')); findings = r.findings; writeFileSync(join(folder, 'findings.json'), JSON.stringify(r, null, 2)); }
appendChain(folder, 'findings.json', { step: 'input' }); // the input is the first link of the run's hashed journal

const client = createClient();
const ask = (messages, opts) => client.ask(messages, { max_tokens: 3500, ...opts });
// --vision: Muse Spark looks at the repaired pages as a customer, SAM 3.1 counts the text fields before and after.
const vision = process.argv.includes('--vision') ? { ask, playwrightPath: process.env.MZ_PLAYWRIGHT || 'playwright' } : null;
const results = await repairAll({ findings, siteDir, ask, folder, login, only, vision, files, turns: Number(arg('turns', 2)), rounds: Number(arg('rounds', 1)), retries: Number(arg('retries', 1)), lessons: approvedTexts(loadLessons('memory/lessons.json')) });
const rows = results.map((r) => ({ id: r.finding.id, severity: r.finding.severity, status: r.status, sources: r.recommendation ? r.recommendation.green + ' green' : '', journeys: r.journeysAfter ? r.journeysAfter.pass + '/' + (r.journeysAfter.pass + r.journeysAfter.fail) : '', masked: r.fix ? r.fix.secretsMasked : '', why: String(r.why || '').slice(0, 70) }));
console.table(rows);
writeFileSync(join(folder, 'report.json'), JSON.stringify({ findings: findings.length, results, cost: client.counter }, null, 2));
appendChain(folder, 'report.json', { step: 'report' });
const chain = verifyChain(folder);
console.log(`Cost $${client.counter.usd.toFixed(3)}. Report: ${join(folder, 'report.json')}. Evidence journal: ${chain.ok ? 'intact' : 'BROKEN'}.`);
