// Repair mode on a findings file: node --env-file=.env bench/run-repair.js demo-site/findings.example.json [--site=demo-site] [--only=F02,F11] [--turns=2] [--rounds=1] [--scan]
// --scan: ignore the file and scan the site first (it is started on a free port).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '../src/meta.js';
import { repairAll, freePort, startSite } from '../src/repair.js';
import { scan } from '../src/scanner.js';
import { loadLessons, approvedTexts } from '../src/memory.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const file = process.argv.find((x, i) => i >= 2 && !x.startsWith('--'));
const siteDir = arg('site', 'demo-site');
const only = arg('only', '') ? arg('only', '').split(',') : null;
const login = { user: 'admin', password: 'maisonverde2019' }; // the demo shop's admin, for the session probes
const folder = 'evidence/repair-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync(folder, { recursive: true });

let findings;
if (process.argv.includes('--scan') || !file) {
  const port = await freePort(); const site = await startSite(siteDir, port);
  try { const r = await scan('http://127.0.0.1:' + port, { login }); findings = r.findings; writeFileSync(join(folder, 'findings.json'), JSON.stringify(r, null, 2)); } finally { site.stop(); }
} else findings = JSON.parse(readFileSync(file, 'utf8')).findings;

const client = createClient();
const ask = (messages, opts) => client.ask(messages, { max_tokens: 3500, ...opts });
const results = await repairAll({ findings, siteDir, ask, folder, login, only, turns: Number(arg('turns', 2)), rounds: Number(arg('rounds', 1)), lessons: approvedTexts(loadLessons('memory/lessons.json')) });
const rows = results.map((r) => ({ id: r.finding.id, severity: r.finding.severity, status: r.status, sources: r.recommendation ? r.recommendation.green + ' green' : '', journeys: r.journeysAfter ? r.journeysAfter.pass + '/' + (r.journeysAfter.pass + r.journeysAfter.fail) : '', why: String(r.why || '').slice(0, 70) }));
console.table(rows);
writeFileSync(join(folder, 'report.json'), JSON.stringify({ findings: findings.length, results, cost: client.counter }, null, 2));
console.log('cost', client.counter.usd.toFixed(3), '$ · report:', join(folder, 'report.json'));
