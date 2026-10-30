// Turns a repair run (evidence/repair-*/report.json) into one self-contained page a human can read before applying a fix:
// every finding, its status, the recommended fix with its sources and verdicts, the exact edits, the journeys before and after.
// node bench/make-repair-report.js evidence/repair-2026-10-27-21-46 [out.html]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyChain } from '../src/chain.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const money = (n) => '$' + (Number(n) || 0).toFixed(3);
const ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS = {
  proposed: ['ok', 'Proposed', 'journeys pass, flaw gone on the copy: a human applies it'],
  reserved: ['warn', 'Proposed with reservation', 'all checks pass, but the agent wrote a reservation below'],
  rejected: ['red', 'Rejected', 'the fix broke a vital journey or the site'],
  ineffective: ['warn', 'Ineffective', 'journeys pass but the scanner still sees the flaw'],
  unverified: ['warn', 'Unverified', 'journeys pass, but no rescan could confirm the fix (no probe for this type, or the scanners disagree): a human verifies before applying'],
  'no-edit': ['mut', 'No edit', 'the model proposed nothing usable'],
  error: ['red', 'Error', 'the run itself failed'],
};

export function loadReport(folder) {
  const report = JSON.parse(readFileSync(join(folder, 'report.json'), 'utf8'));
  const results = (report.results || []).slice().sort((a, b) => (ORDER[a.finding?.severity] ?? 9) - (ORDER[b.finding?.severity] ?? 9));
  return { folder, findings: report.findings, results, cost: report.cost || {}, chain: verifyChain(folder) };
}

const verdictDot = (v) => `<i class="dot ${v === 'green' ? 'g' : v === 'red' ? 'r' : 'a'}" title="${esc(v || 'unverified')}"></i>`;

function sourcesHtml(rec) {
  const list = rec?.sources || [];
  if (!list.length) return '<p class="mut">No source kept.</p>';
  const byUrl = new Map((rec.verification || []).map((v) => [v.url, v.verdict]));
  return '<ul class="src">' + list.map((s) => `<li>${verdictDot(byUrl.get(s.url) === 'supported' ? 'green' : byUrl.has(s.url) ? 'red' : null)}<a href="${esc(s.url)}" rel="noopener">${esc(host(s.url))}</a> <span class="mut">${esc(s.contribution || s.claim || '')}</span></li>`).join('') + '</ul>';
}

function editsHtml(fix) {
  const a = fix?.applied || []; const r = fix?.refused || [];
  if (!a.length && !r.length) return '<p class="mut">No edit.</p>';
  return a.map((e) => `<div class="edit"><div class="file">${esc(e.file)}</div><pre class="del">${esc(e.find)}</pre><pre class="add">${esc(e.replace)}</pre></div>`).join('')
    + r.map((e) => `<div class="edit refused"><div class="file">${esc(e.file || '?')} <span class="mut">refused: ${esc(e.why)}</span></div><pre class="del">${esc(e.find || '')}</pre></div>`).join('');
}

const journeysHtml = (j, label) => j ? `<span class="jr ${j.ok ? 'ok' : 'red'}">${esc(label)} ${j.pass}/${j.pass + j.fail}${j.broken?.length ? ' · broken: ' + esc(j.broken.join(', ')) : ''}</span>` : '';

export function renderReport(run, { title = 'Mission Zero · repair report' } = {}) {
  const counts = {}; for (const r of run.results) counts[r.status] = (counts[r.status] || 0) + 1;
  const target = run.results[0]?.finding?.url ? new URL(run.results[0].finding.url).origin : '';
  const cards = run.results.map((r) => {
    const f = r.finding || {}; const st = STATUS[r.status] || ['mut', r.status, ''];
    const rec = r.recommendation;
    return `<section class="card ${st[0]}" id="${esc(f.id)}">
<header><span class="sev ${esc(f.severity)}">${esc(f.severity)}</span><b>${esc(f.id)}</b> <span class="type">${esc(f.type)}</span><span class="status ${st[0]}">${esc(st[1])}</span></header>
<p class="desc">${esc(f.description)} <span class="mut">Evidence: ${esc(f.evidence)}</span><br><a href="${esc(f.url)}" rel="noopener" class="mut">${esc(f.url)}</a></p>
<p class="why"><b>Verdict.</b> ${esc(r.why || st[2])}${r.ms ? ` <span class="mut">(${(r.ms / 1000).toFixed(0)} s)</span>` : ''}</p>
${(r.reservations || []).map((x) => `<p class="attempt"><b>Reservation, written by the agent.</b> ${esc(x)}</p>`).join('')}
${r.review && r.review.verdict && r.review.verdict !== 'unknown' ? `<p class="mut">The agent reviewed its own patch: <b>${esc(r.review.verdict)}</b>. ${esc(r.review.reason)}${r.review.missing ? ' Missing for a complete fix: ' + esc(r.review.missing) : ''}</p>` : ''}
${(r.attempts || []).map((a, i) => `<p class="attempt"><b>Attempt ${i + 1}, refused by Mission Zero itself.</b> ${esc(a.why)}${a.brokenJourneys?.length ? ` <span class="mut">Broken: ${esc(a.brokenJourneys.join(', '))}.</span>` : ''} ${a.edits?.length ? `<span class="mut">It had proposed: ${esc(a.edits.map((e) => e.replace.slice(0, 120)).join(' | '))}</span>` : ''}</p>`).join('')}
${rec ? `<details open><summary>Recommended fix <span class="mut">${rec.cached ? 'from cache · ' : ''}judge ${esc(rec.score ?? '?')}/10 · ${rec.green ?? 0} green, ${rec.red ?? 0} red</span>${Number(rec.score) < 7 ? ' <span class="status warn">weak justification: read the sources before applying</span>' : ''}</summary><p class="answer">${esc(rec.answer)}</p>${sourcesHtml(rec)}</details>` : ''}
${r.fix ? `<details open><summary>Edits <span class="mut">${esc(r.fix.summary)}${r.fix.secretsMasked ? ` · ${r.fix.secretsMasked} secret${r.fix.secretsMasked > 1 ? 's' : ''} masked before the model call` : ''}</span></summary>${editsHtml(r.fix)}${r.fix.risk ? `<p class="mut">Risk: ${esc(r.fix.risk)}</p>` : ''}${r.patch ? `<p class="mut">Patch for review: <a href="${esc(f.id)}/fix.patch">${esc(f.id)}/fix.patch</a> (apply with <code>git apply</code>)</p>` : ''}</details>` : ''}
<p class="journeys">${journeysHtml(r.journeysBefore, 'journeys before')} ${journeysHtml(r.journeysAfter, 'journeys after')} ${r.rescan ? `<span class="jr ${r.rescan.findings?.length ? 'red' : 'ok'}">rescan: ${r.rescan.findings?.length ? 'flaw still there' : 'flaw gone'}</span>` : ''}${r.vision?.look ? ` <span class="jr ${r.vision.look.ok ? 'ok' : 'red'}">Muse Spark looked: ${r.vision.look.ok ? 'still a shop page' : esc(r.vision.look.problems.join('; '))}</span>` : ''}${r.vision?.sam && r.vision.sam.before !== null ? ` <span class="jr">SAM 3.1 « ${esc(r.vision.sam.concept)} »: ${r.vision.sam.before} before → ${r.vision.sam.after} after</span>` : ''}${r.vision?.error ? ` <span class="jr red">vision: ${esc(r.vision.error)}</span>` : ''}</p>
${r.vision?.look?.seen?.length ? `<p class="mut">Seen on the repaired pages: ${esc(r.vision.look.seen.join(' · '))}</p>` : ''}
</section>`;
  }).join('\n');
  const summaryRow = Object.entries(STATUS).filter(([k]) => counts[k]).map(([k, v]) => `<span class="status ${v[0]}">${counts[k]} ${v[1].toLowerCase()}</span>`).join(' ');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#0a0e18;--panel:#111a2c;--line:#263552;--tx:#f3f6fc;--mut:#9fb0d3;--gold:#e5bd52;--ok:#5fe09a;--red:#ff6b7a;--warn:#ffb454;--blue:#6fb3ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.5 "Segoe UI",Inter,Arial,sans-serif;padding:28px 16px 60px}
main{max-width:980px;margin:0 auto}h1{font-size:30px;margin:0 0 6px}h1 span{color:var(--gold)}.lead{color:var(--mut);margin:0 0 18px}
.meters{display:flex;flex-wrap:wrap;gap:10px 22px;color:var(--mut);margin-bottom:22px}.meters b{color:var(--tx)}
.card{background:var(--panel);border:1px solid var(--line);border-left:5px solid var(--line);border-radius:12px;padding:16px 18px;margin:0 0 16px}
.card.ok{border-left-color:var(--ok)}.card.red{border-left-color:var(--red)}.card.warn{border-left-color:var(--warn)}
.card header{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:8px}.type{color:var(--blue);font-family:Consolas,monospace}
.sev{font-size:12px;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:99px;border:1px solid var(--line)}
.sev.critical{background:#3a1420;color:#ff9aa6}.sev.high{background:#3a2412;color:#ffc48a}.sev.medium{background:#2d2a12;color:#f0dc8a}.sev.low{background:#14263a;color:#9fd0ff}
.status{margin-left:auto;font-weight:600;padding:2px 10px;border-radius:99px;background:#1a2440}.status.ok{color:var(--ok)}.status.red{color:var(--red)}.status.warn{color:var(--warn)}.status.mut{color:var(--mut)}
.mut{color:var(--mut)}.desc{margin:0 0 8px}.why{margin:0 0 10px}
.attempt{margin:0 0 10px;padding:8px 12px;border-left:3px solid var(--warn);background:#1a1a2a;border-radius:0 8px 8px 0}
details{border-top:1px solid var(--line);padding:10px 0 4px}summary{cursor:pointer;font-weight:600}.answer{white-space:pre-wrap;margin:8px 0}
.src{list-style:none;padding:0;margin:4px 0}.src li{margin:4px 0;display:flex;gap:8px;align-items:baseline}.src a{color:var(--blue)}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none;background:var(--mut);position:relative;top:0}.dot.g{background:var(--ok)}.dot.r{background:var(--red)}.dot.a{background:var(--warn)}
.edit{margin:8px 0}.file{font-family:Consolas,monospace;color:var(--mut);font-size:13px;margin-bottom:4px}
pre{margin:0;padding:8px 10px;border-radius:6px;font:13px/1.4 Consolas,monospace;white-space:pre-wrap;word-break:break-word}
pre.del{background:#2a1419;color:#ffb3bb;border-left:3px solid var(--red)}pre.add{background:#102a1c;color:#b8f0cf;border-left:3px solid var(--ok);margin-top:3px}
.edit.refused pre.del{opacity:.6}
.journeys{margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px}.jr{font-size:13px;padding:2px 10px;border-radius:99px;background:#1a2440}.jr.ok{color:var(--ok)}.jr.red{color:var(--red)}
footer{color:var(--mut);font-size:13px;margin-top:30px;border-top:1px solid var(--line);padding-top:12px}
.okc{color:var(--ok)}.redc{color:var(--red)}code{font-family:Consolas,monospace;font-size:13px}
</style></head><body><main>
<h1>Mission <span>Zero</span> · repair report</h1>
<p class="lead">A scanner reported ${run.findings} finding${run.findings === 1 ? '' : 's'} on <b>${esc(target)}</b>. For each one, Mission Zero researched the fix from primary sources, proposed exact edits, applied them to a copy, replayed the vital journeys and rescanned the copy. Nothing was changed on the site itself: a human applies each proposed fix.</p>
<div class="meters"><span>${summaryRow}</span><span>cost <b>${money(run.cost.usd)}</b></span><span>model calls <b>${run.cost.calls ?? '?'}</b></span><span>run <b>${esc(run.folder)}</b></span>${run.chain && run.chain.why !== 'no chain file' ? `<span>evidence journal <b class="${run.chain.ok ? 'okc' : 'redc'}">${run.chain.ok ? 'intact · ' + run.chain.entries + ' records · ' + esc(String(run.chain.head).slice(0, 12)) : 'BROKEN: ' + esc(run.chain.why)}</b></span>` : ''}</div>
${cards}
<footer>Severity order: critical, high, medium, low. A green dot is a source whose cited passage was found on the page by the verifier; red = quote not found or source contradicts; amber is unverified. Self-review of a patch: cause = removes the cause · hides = hides the symptom · partial = incomplete. Edits are exact-string replacements: each "find" occurs once in the file, or the edit is refused.</footer>
</main></body></html>`;
}

// Several runs can be merged into one page (a later run overrides an earlier one for the same finding id): the chain
// is shown only for a single run, since each run has its own journal.
export function mergeReports(runs) {
  if (runs.length === 1) return runs[0];
  const byId = new Map();
  for (const run of runs) for (const r of run.results) byId.set(r.finding?.id, r);
  const results = [...byId.values()].sort((a, b) => (ORDER[a.finding?.severity] ?? 9) - (ORDER[b.finding?.severity] ?? 9));
  const cost = { usd: runs.reduce((a, r) => a + (Number(r.cost.usd) || 0), 0), calls: runs.reduce((a, r) => a + (Number(r.cost.calls) || 0), 0) };
  return { folder: runs.map((r) => r.folder).join(' + '), findings: results.length, results, cost, chain: null };
}

if (process.argv[1] && process.argv[1].endsWith('make-repair-report.js')) {
  const folders = process.argv.slice(2).filter((a) => !a.startsWith('--') && !a.endsWith('.html'));
  const out = process.argv.slice(2).find((a) => a.endsWith('.html')) || join(folders[0] || '.', 'report.html');
  if (!folders.length) { console.error('usage: node bench/make-repair-report.js evidence/repair-<date> [evidence/repair-<date2> ...] [out.html]'); process.exit(1); }
  writeFileSync(out, renderReport(mergeReports(folders.map(loadReport))));
  console.log('report:', out);
}
