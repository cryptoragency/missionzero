// Prints the README results table from one or more repair runs (a later run overrides an earlier one per finding):
// node bench/make-results-table.js evidence/repair-<date> [evidence/repair-<date2> ...]
import { loadReport, mergeReports } from './make-repair-report.js';

const folders = process.argv.slice(2);
if (!folders.length) { console.error('usage: node bench/make-results-table.js <repair folder> [...]'); process.exit(1); }
const run = mergeReports(folders.map(loadReport));
const FLAW = { F01: 'no security headers', F02: 'versions disclosed', F03: 'reflected XSS', F04: 'price trusted from the client', F05: 'card data over HTTP', F06: 'IDOR on /order', F07: 'weak authentication', F08: 'insecure session cookie', F09: 'admin trusts a guessable cookie', F10: 'robots.txt lists sensitive paths', F11: '.env served with secrets', F12: 'backups listed', F13: 'customer export without auth', F14: 'jQuery 1.8.3', F15: 'no privacy policy' };
const STATUS = { proposed: 'proposed', reserved: '**proposed with reservation**', rejected: '**rejected**', ineffective: 'ineffective', 'no-edit': 'no edit', error: 'error' };
const cell = (s) => String(s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
console.log('| # | Flaw | Status | What the agent did (its own words) | Judge | Checks |');
console.log('|---|------|--------|------------------------------------|-------|--------|');
let counts = {};
for (const r of run.results) {
  const f = r.finding; counts[r.status] = (counts[r.status] || 0) + 1;
  const rec = r.recommendation || {};
  const what = [r.attempts?.length ? `${r.attempts.length} attempt${r.attempts.length > 1 ? 's' : ''} refused by itself (${cell(r.attempts.map((a) => a.status).join(', '))}), then: ` : '', cell(r.fix?.summary || r.why).slice(0, 140), r.reservations?.length ? ' Reservation: ' + cell(r.reservations.join(' / ')).slice(0, 160) : ''].join('');
  const checks = [r.journeysAfter ? `journeys ${r.journeysAfter.pass}/${r.journeysAfter.pass + r.journeysAfter.fail}` : '', r.rescan ? (r.rescan.findings?.length ? 'scanner still sees it' : 'rescan clean') : '', r.vision?.look ? (r.vision.look.unreadable ? 'look unreadable' : r.vision.look.ok ? 'look ok' : 'look NOT ok') : '', r.vision?.sam && r.vision.sam.before !== null ? `fields ${r.vision.sam.before}→${r.vision.sam.after}` : '', r.review?.verdict && r.review.verdict !== 'unknown' ? `self-review: ${r.review.verdict}` : ''].filter(Boolean).join(', ');
  console.log(`| ${f.id} | ${FLAW[f.id] || cell(f.type)} | ${STATUS[r.status] || r.status} | ${what} | ${rec.score ?? '?'}/10, ${rec.green ?? 0} green${rec.red ? `, ${rec.red} red` : ''} | ${checks} |`);
}
console.log('');
console.log(Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') + ` · ${run.results.length} findings · ${run.cost.calls} model calls · $${Number(run.cost.usd).toFixed(2)}`);
