// Watch mode: Mission Zero reads a series of readings (a public health series, a trial registry, a lab probe's export),
// compares today's readings with the previous ones, and reports only what moved. With --explain, the biggest variation
// becomes a Mission Zero research goal: the explanation comes with exact quotes from primary sources, and what is not
// proven is said. Mission Zero never acts on the source: it reads, compares, cites; a human decides.
// Usage: node --env-file=.env src/watch.js <source> [--replay=N] [--until=PERIOD] [--explain] [--threshold=20]
//   <source>      a name from watch/sources.json
//   --until=P     cut the series at period P (with --replay: replay the N periods up to P)
//   --replay=N    play the last N periods of the series one after another, as if the watch had run each period
//                 (the history is public, nothing is staged: each report says it is replayed)
//   --explain     after the comparison, research the biggest variation with the Mission Zero loop (cited answer)
//   --threshold   percent change that counts as a variation (default 20)
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// ---- Generic readings format (watch/readings.example.json): one snapshot = one period of one source.
// { source, page, period, readings: [{ key, label, value, unit?, low?, high?, page? }] }
// `value` is a number (a rate, a count, a temperature) or a string (a status). `page` is the address to cite.

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Compares two snapshots and returns the variations, biggest first. A string value that changed is a variation too.
export function diffReadings(previous, current, { threshold = 20 } = {}) {
  const prev = new Map((previous?.readings || []).map((r) => [r.key, r]));
  const out = [];
  for (const r of current.readings || []) {
    const p = prev.get(r.key);
    if (!p) { out.push({ key: r.key, label: r.label, kind: 'new', before: null, after: r.value, unit: r.unit || '', page: r.page || current.page }); continue; }
    const a = num(r.value); const b = num(p.value);
    if (a !== null && b !== null) {
      const delta = a - b;
      const pct = b === 0 ? (a === 0 ? 0 : Infinity) : Math.round((delta / Math.abs(b)) * 1000) / 10;
      const crossed = r.thresholdValue != null && ((b < r.thresholdValue && a >= r.thresholdValue) || (b >= r.thresholdValue && a < r.thresholdValue));
      if (Math.abs(pct) >= threshold || crossed) out.push({ key: r.key, label: r.label, kind: crossed ? 'threshold' : 'change', before: b, after: a, delta, pct, unit: r.unit || '', thresholdValue: r.thresholdValue ?? null, page: r.page || current.page });
    } else if (String(r.value) !== String(p.value)) {
      out.push({ key: r.key, label: r.label, kind: 'status', before: p.value, after: r.value, unit: '', page: r.page || current.page });
    }
  }
  for (const [key, p] of prev) if (!(current.readings || []).some((r) => r.key === key)) out.push({ key, label: p.label, kind: 'gone', before: p.value, after: null, unit: p.unit || '', page: p.page || previous.page });
  const rank = (v) => (v.kind === 'threshold' ? 1e9 : v.kind === 'status' || v.kind === 'new' || v.kind === 'gone' ? 1e6 : Math.abs(v.pct === Infinity ? 1e5 : v.pct));
  return out.sort((x, y) => rank(y) - rank(x));
}

// One readable line per variation, in the language of the source's labels.
export function describeVariation(v) {
  const u = v.unit ? ' ' + v.unit : '';
  if (v.kind === 'new') return `${v.label}: new, ${v.after}${u}`;
  if (v.kind === 'gone') return `${v.label}: no longer reported (was ${v.before}${u})`;
  if (v.kind === 'status') return `${v.label}: ${v.before} -> ${v.after}`;
  const sign = v.delta > 0 ? '+' : '';
  const base = `${v.label}: ${v.before} -> ${v.after}${u} (${sign}${v.pct === Infinity ? '∞' : v.pct} %)`;
  return v.kind === 'threshold' ? `${base}, threshold ${v.thresholdValue}${u} ${v.after >= v.thresholdValue ? 'crossed upward' : 'crossed downward'}` : base;
}

// ---- Adapters: each turns a public source into a list of snapshots (oldest first). Any probe can be a `file` source.

// Réseau Sentinelles (France, weekly since 1984): incidence per 100 000 of a syndrome, by region or for the country.
export function sentinellesSnapshots(api, { name, page, indicatorLabel, thresholdValue = null } = {}) {
  const byWeek = new Map();
  for (const row of api.data || []) {
    if (row.inc100 == null) continue;
    if (!byWeek.has(row.week)) byWeek.set(row.week, []);
    byWeek.get(row.week).push({ key: `${indicatorLabel}.${row.geo_insee}`, label: `${indicatorLabel}, ${row.geo_name}`, value: row.inc100, unit: 'per 100 000', low: row.inc100_low, high: row.inc100_up, thresholdValue, page });
  }
  return [...byWeek.keys()].sort((a, b) => a - b).map((w) => ({ source: name, page, period: `${String(w).slice(0, 4)}-W${String(w).slice(4)}`, readings: byWeek.get(w).sort((a, b) => a.key.localeCompare(b.key)) }));
}

// ClinicalTrials.gov (daily): the status of every study matching a condition and an intervention. One snapshot (today);
// replay is not possible here (the registry serves the present), so the previous snapshot is the one the watch stored.
export function clinicalTrialsSnapshot(api, { name, page } = {}) {
  const readings = (api.studies || []).map((s) => {
    const id = s.protocolSection?.identificationModule?.nctId; const st = s.protocolSection?.statusModule || {};
    return { key: id, label: `${id} ${s.protocolSection?.identificationModule?.briefTitle || ''}`.trim(), value: st.overallStatus || '?', phases: s.protocolSection?.designModule?.phases || [], lastUpdate: st.lastUpdatePostDateStruct?.date || null, page: `https://clinicaltrials.gov/study/${id}` };
  }).sort((a, b) => a.key.localeCompare(b.key));
  return [{ source: name, page, period: new Date().toISOString().slice(0, 10), readings }];
}

// A file in the generic format: one snapshot, or an array of snapshots (a probe's export, oldest first).
export function fileSnapshots(json) {
  return Array.isArray(json) ? json : [json];
}

// A source that hangs must not hang the watch: 60 s, then the run fails with the URL.
export async function fetchJson(url, { timeoutMs = 60000, fetchFn = fetch } = {}) {
  // A held timer (not AbortSignal.timeout, whose timer does not keep Node 22 alive), cleared once the body is read.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error(`${url}: timeout after ${timeoutMs} ms`)), timeoutMs);
  try {
    const r = await fetchFn(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Mission Zero watch)', Accept: 'application/json' }, signal: ctl.signal });
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadSnapshots(src) {
  if (src.kind === 'sentinelles') return sentinellesSnapshots(await fetchJson(src.api), src);
  if (src.kind === 'clinicaltrials') return clinicalTrialsSnapshot(await fetchJson(src.api), src);
  if (src.kind === 'file') return fileSnapshots(JSON.parse(readFileSync(src.path, 'utf8')));
  throw new Error(`unknown source kind: ${src.kind}`);
}

// ---- Storage: watch/<name>/<period>.json per snapshot, report-<period>.json + .md per comparison, chained.
export function lastStored(dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => /^\d{4}-(W\d{2}|\d{2}-\d{2})\.json$/.test(f)).sort();
  return files.length ? JSON.parse(readFileSync(join(dir, files[files.length - 1]), 'utf8')) : null;
}

// The sources of an explanation, kept only when the verifier found their claim on the page ("supported"), each with
// the exact quote it found (verification.detail). The answer itself never carries quote nor verified.
export function provenSources(sources, verification) {
  const proven = [];
  for (const s of sources || []) {
    const v = (verification || []).find((x) => x.url === s.url && x.verdict === 'supported' && (x.claim === undefined || x.claim === s.contribution));
    if (v) proven.push({ ...s, quote: String(v.detail || '').slice(0, 400) });
  }
  return proven;
}

export function buildReport({ source, previous, current, variations, replayed = false, explanation = null }) {
  const lines = [`# ${source.name}, ${current.period}${replayed ? ' (replayed from the public history)' : ''}`, '',
    ...(source.attribution ? [`Data: ${source.attribution}.`, ''] : []),
    previous ? `Compared with ${previous.period}: ${variations.length} variation${variations.length === 1 ? '' : 's'} (threshold ${source.threshold ?? 20} %).` : 'First reading: nothing to compare yet.', ''];
  for (const v of variations) lines.push(`- ${describeVariation(v)} · [page](${v.page})`);
  if (variations.length) lines.push('', `Figures read in the source's dataset${source.api ? ' (' + source.api + ')' : ''}; the rows are kept in ${current.period}.json and chained.`);
  if (explanation) {
    lines.push('', `## Why (Mission Zero, ${explanation.judge}/10, ${explanation.green} verified source${explanation.green === 1 ? '' : 's'}, $${explanation.usd.toFixed(3)})`, '', explanation.summary || '');
    for (const s of explanation.sources || []) lines.push(`- ${s.contribution} · [${s.url}](${s.url})${s.quote ? ` · "${s.quote}"` : ''}`);
    if (explanation.unproven?.length) { lines.push('', 'Not proven:'); for (const u of explanation.unproven) lines.push(`- ${u}`); }
  }
  lines.push('', 'Mission Zero read and compared. It did not act on the source. A human decides.');
  return lines.join('\n');
}

// Research the biggest variation with the Mission Zero loop: hypotheses, pages read, exact quotes, judge. Capped.
async function explain({ source, previous, current, variation, dir, capUsd }) {
  const [{ createClient }, { run }, { makeExecutor }, { synthesize, seenUrls }, { refineAnswer }, { verifyReport }, { makeResearch }, { loadLessons, approvedTexts }] = await Promise.all([
    import('./meta.js'), import('./loop.js'), import('./tools.js'), import('./synthesis.js'), import('./contradictAnswer.js'), import('./verify.js'), import('./research.js'), import('./memory.js'),
  ]);
  const client = createClient({ capUsd });
  const ask = (messages, opts) => client.ask(messages, { max_tokens: 3000, ...opts });
  // The figures themselves are already proven by the watch: it read them in the source's dataset and keeps the rows, chained.
  // The mission's job is the context: what primary sources document around that period.
  const goal = `Context for a variation already measured by a watch on ${source.name}: "${variation.label}" went from ${variation.before} to ${variation.after}${variation.unit ? ' ' + variation.unit : ''} between ${previous.period} and ${current.period} (${describeVariation(variation)}). These figures are taken from the source's own dataset${source.api ? ' (' + source.api + ')' : ''} and are NOT to be re-verified: take them as given. Find what primary sources (the source's bulletin at ${variation.page}, public health agencies, peer-reviewed reports) document about this indicator and this period or season: the seasonal pattern, the surveillance method, any published comment on that rise. Every figure you add must carry its exact quote. Say what is not documented.`;
  const mdir = join(dir, 'explain-' + current.period); mkdirSync(mdir, { recursive: true });
  const execute = makeExecutor({ folder: mdir, goal });
  const note = (e) => appendFileSync(join(mdir, 'journal.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
  const result = await run({ goal, constraints: ['public sources only', 'no spending', 'no contact with third parties'], lessons: approvedTexts(loadLessons('memory/lessons.json')), budgetUsd: capUsd, maxTurns: 2, contradictions: 0, ask, execute, approve: async () => false, memoryPath: join(mdir, 'memory.json'), journalPath: join(mdir, 'journal.jsonl') });
  const draft = await synthesize({ goal, evidence: result.evidence, ask });
  const cache = new Map();
  const verify = (sources) => verifyReport({ items: sources.map((s) => ({ claim: s.contribution, url: s.url })), ask, cache });
  const research = makeResearch({ ask, execute, evidence: result.evidence, note });
  const refined = await refineAnswer({ goal, answer: draft, seen: [...seenUrls(result.evidence).values()], ask, verify, research, rounds: 1 });
  const final = { goal, ...refined.answer, judge: refined.score, green: refined.green, red: refined.red, usd: client.counter.usd, calls: client.counter.calls };
  writeFileSync(join(mdir, 'final-answer.json'), JSON.stringify(final, null, 2));
  return { summary: refined.answer.summary || refined.answer.answer || '', sources: provenSources(refined.answer.sources, refined.verification), unproven: refined.answer.uncertainties || [], judge: refined.score, green: refined.green, usd: client.counter.usd, folder: mdir };
}

// The files a folder's chain already vouches for: rewriting one of them would break the chain (each report carries `at`).
function chained(dir) {
  try { return new Set((JSON.parse(readFileSync(join(dir, 'chain.json'), 'utf8')).entries || []).map((e) => e.file)); } catch { return new Set(); }
}

export async function watch({ source, replay = 0, until = null, explainTop = false, root = 'watch', capUsd = Number(process.env.MZ_WATCH_CAP_USD) || 0.25 }) {
  const dir = join(root, source.name.replace(/[^\w-]+/g, '-').toLowerCase());
  mkdirSync(dir, { recursive: true });
  let snapshots = await loadSnapshots(source);
  if (until) snapshots = snapshots.filter((x) => x.period <= until);
  if (!snapshots.length) throw new Error('no readings');
  const { appendChain } = await import('./chain.js');
  const threshold = source.threshold ?? 20;
  const reports = [];
  // --until alone is the watch as it would have run at that period: a replay of one period, compared with the one before.
  const n = replay > 0 ? replay : until ? 1 : 0;
  const replayed = n > 0;
  // A replay is written to a fresh folder with its own chain: replaying the same history twice is two records, never an
  // overwrite of the first (the live watch's folder and chain are not touched).
  let out = dir;
  if (replayed) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    out = join(dir, 'replay-' + stamp);
    for (let k = 2; existsSync(out); k += 1) out = join(dir, `replay-${stamp}-${k}`);
    mkdirSync(out, { recursive: true });
  }
  const done = chained(out);
  const write = (file, text) => {
    if (done.has(file)) throw new Error(`${join(out, file)} is already in the evidence chain of ${out}: it is not overwritten (move the folder aside, or replay with --replay)`);
    writeFileSync(join(out, file), text);
  };
  // Replay: the last N periods one after another, each compared with the one before (oldest first).
  const play = replayed ? snapshots.slice(-(n + 1)) : [snapshots[snapshots.length - 1]];
  let previous = replayed ? play.shift() : lastStored(dir);
  if (replayed && previous) { write(previous.period + '.json', JSON.stringify(previous, null, 2)); appendChain(out, previous.period + '.json', { step: 'snapshot' }); }
  for (let i = 0; i < play.length; i++) {
    const current = play[i];
    if (previous && previous.period === current.period && !replayed) { console.log(`${source.name}: ${current.period} already read, nothing new.`); return reports; }
    const variations = previous ? diffReadings(previous, current, { threshold }) : [];
    let explanation = null;
    if (explainTop && variations.length && i === play.length - 1 && previous) explanation = await explain({ source, previous, current, variation: variations[0], dir: out, capUsd });
    const report = { source: source.name, period: current.period, comparedWith: previous?.period || null, replayed, threshold, variations, explanation, at: new Date().toISOString() };
    write(current.period + '.json', JSON.stringify(current, null, 2));
    write('report-' + current.period + '.json', JSON.stringify(report, null, 2));
    write('report-' + current.period + '.md', buildReport({ source, previous, current, variations, replayed, explanation }));
    appendChain(out, current.period + '.json', { step: 'snapshot' }); appendChain(out, 'report-' + current.period + '.json', { step: 'report', variations: variations.length });
    console.log(`${source.name} ${current.period}${previous ? ' vs ' + previous.period : ''}: ${variations.length} variation(s)` + (variations[0] ? ` · ${describeVariation(variations[0])}` : ''));
    reports.push({ ...report, folder: out });
    previous = current;
  }
  if (replayed) console.log(`Replay written to ${out} (its own evidence chain).`);
  return reports;
}

if (process.argv[1] && /watch\.js$/.test(process.argv[1])) {
  const args = process.argv.slice(2);
  const name = args.find((a) => !a.startsWith('--'));
  const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const sources = JSON.parse(readFileSync('watch/sources.json', 'utf8'));
  const source = sources.find((s) => s.name === name);
  if (!source) { console.error(`Usage: node --env-file=.env src/watch.js <source> [--replay=N] [--explain] [--threshold=20]\nSources: ${sources.map((s) => s.name).join(', ')}`); process.exit(1); }
  if (opt('threshold')) source.threshold = Number(opt('threshold'));
  watch({ source, replay: Number(opt('replay', 0)) || 0, until: opt('until', null), explainTop: args.includes('--explain') }).then((r) => {
    const last = r[r.length - 1];
    if (last?.explanation) console.log(`Explained: ${last.explanation.judge}/10, ${last.explanation.green} verified source(s), $${last.explanation.usd.toFixed(3)} (${last.explanation.folder})`);
  }).catch((e) => { console.error('watch failed:', e.message); process.exit(1); });
}
