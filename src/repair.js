// Repair mode: a scanner's finding comes in, a fix comes out, with proof, never applied to the live site.
// For each finding: 1) Mission Zero researches the recommended fix and cites a primary source (verified);
// 2) the model proposes exact edits to the site's code; 3) the edits are applied to a COPY of the site;
// 4) the vital journeys are replayed on the copy: one broken journey = the fix is rejected;
// 5) the copy is rescanned: the flaw must be gone. Only then is the fix "proposed", for a human to apply.
import { mkdtempSync, cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { run, readJson } from './loop.js';
import { synthesize, seenUrls } from './synthesis.js';
import { refineAnswer } from './contradictAnswer.js';
import { verifyReport } from './verify.js';
import { makeExecutor } from './tools.js';
import { scan } from './scanner.js';
import { maskDeep } from './secrets.js';
import { appendChain } from './chain.js';

export const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
export const copySite = (dir) => { const t = mkdtempSync(join(tmpdir(), 'mz-repair-')); cpSync(dir, t, { recursive: true }); return t; };

export function startSite(dir, port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js'], { cwd: dir, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; const done = () => resolve({ stop: () => child.kill(), log: () => out });
    child.stdout.on('data', (d) => { out += d; if (/on http/.test(out)) done(); });
    child.stderr.on('data', (d) => { out += d; });
    child.on('exit', (code) => { if (!/on http/.test(out)) reject(new Error('site did not start (' + code + '): ' + out.slice(0, 300))); });
    setTimeout(() => (/on http/.test(out) ? done() : reject(new Error('site start timeout: ' + out.slice(0, 300)))), 8000);
  });
}

// The vital journeys, replayed on the copy: node --test journeys.test.js in that folder.
export function runJourneys(dir) {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT; // the journeys run as their own test process, even from inside a test
  const r = spawnSync(process.execPath, ['--test', 'journeys.test.js'], { cwd: dir, encoding: 'utf8', timeout: 60000, env });
  const pass = Number((r.stdout.match(/^ℹ pass (\d+)/m) || [])[1] || 0);
  const fail = Number((r.stdout.match(/^ℹ fail (\d+)/m) || [])[1] || 0);
  // Both reporters of node --test: "not ok 1 - journey: x" (tap) and "✖ journey: x (3ms)" (spec).
  const broken = [...new Set([...r.stdout.matchAll(/^\s*(?:not ok \d+ - |✖ )journey: (.+?)(?: \(\d+(?:\.\d+)?ms\))?\s*$/gm)].map((m) => m[1]))];
  return { ok: r.status === 0 && fail === 0 && pass > 0, pass, fail, broken, output: (r.stdout + r.stderr).slice(-2000) };
}

// Exact-string edits: each `find` must occur exactly once in the file, or the edit is refused (no guessing on code).
export function applyEdits(dir, edits) {
  const applied = []; const refused = [];
  for (const e of edits || []) {
    const file = join(dir, String(e.file || '').replace(/^[\\/]+/, ''));
    if (!e.file || !existsSync(file) || typeof e.find !== 'string' || typeof e.replace !== 'string' || !e.find) { refused.push({ ...e, why: 'missing file or strings' }); continue; }
    const text = readFileSync(file, 'utf8'); const n = text.split(e.find).length - 1;
    if (n !== 1) { refused.push({ file: e.file, find: e.find.slice(0, 80), why: n === 0 ? 'text not found' : 'text found ' + n + ' times' }); continue; }
    writeFileSync(file, text.replace(e.find, e.replace)); applied.push({ file: e.file, find: e.find, replace: e.replace });
  }
  return { applied, refused };
}

// Recommendations are cached by flaw type (memory/fixes.json): a type already researched costs nothing the next time.
const FIXES_PATH = 'memory/fixes.json';
export function loadFixes(path = FIXES_PATH) { try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}; } catch { return {}; } }
export function saveFix(type, rec, path = FIXES_PATH) { const all = loadFixes(path); all[type] = { ...rec, savedAt: new Date().toISOString() }; mkdirSync('memory', { recursive: true }); writeFileSync(path, JSON.stringify(all, null, 2)); }

// 1) What the fix should be, from primary sources, with the usual loop and verifier (short: 2 turns, 1 round).
export async function knowledge({ finding, ask, folder, turns = 2, rounds = 1, lessons = [], cache = true }) {
  const known = cache ? loadFixes()[finding.type] : null;
  if (known && known.green > 0 && known.score >= 7) return { ...known, cached: true };
  const goal =`What is the recommended fix for this web security flaw: ${finding.type} (${finding.description} Evidence: ${finding.evidence}). State the concrete fix and cite a primary source (OWASP, MDN, NIST, PCI DSS, IETF RFC, or the vendor's own advisory).`;
  const execute = makeExecutor({ folder, goal });
  const result = await run({ goal, constraints: ['public sources only', 'no spending', 'no contact with third parties'], lessons, budgetUsd: 1, maxTurns: turns, ask, execute, approve: async () => false, journalPath: folder ? join(folder, 'journal.jsonl') : null });
  const draft = await synthesize({ goal, evidence: result.evidence, ask });
  const verifyCache = new Map();
  const verify = (sources) => verifyReport({ items: sources.map((s) => ({ claim: s.contribution, url: s.url })), ask, cache: verifyCache });
  const refined = await refineAnswer({ goal, answer: draft, seen: [...seenUrls(result.evidence).values()], ask, verify, rounds, escalate: false });
  const rec = { goal, answer: refined.answer.answer, sources: refined.answer.sources, score: refined.score, green: refined.green, red: refined.red, verification: refined.verification || [] };
  if (cache && rec.green > 0 && rec.score >= 7) saveFix(finding.type, rec);
  return rec;
}

const FIX_PROMPT = 'You repair a small website. You get one scanner finding, the recommended fix with its sources, the site\'s code and the list of vital journeys that MUST keep working. '
  + 'Propose the smallest code change that removes the flaw without changing what the journeys do. Edits are exact-string replacements: "find" must be copied EXACTLY from the code, once; "replace" is the new text. '
  + 'Prefer fixing the cause (escape output, look prices up server-side, require a session, add headers, refuse the path) over hiding it. Never change the journeys file. '
  + 'The journeys are given as code: read what each one sends and expects, and keep exactly that working (a journey that carries no session must keep working without one). '
  + 'If "previous" is present, your earlier fix was refused for the reason given: propose a DIFFERENT fix that keeps the named journey working, never the same edits again. '
  + 'No prose outside the JSON. JSON: {"edits":[{"file":"server.js","find":"","replace":""}],"summary":"one sentence","risk":"what could break"}.';

// 2) The code change itself, proposed by the model from the finding, the recommendation, the code and the journeys' code.
// Secrets in the code or the finding (passwords, keys, tokens) are masked before the call and restored in the edits.
// `previous` is the refused attempt (its edits and why), so the second try is a different fix.
export async function proposeFix({ finding, recommendation, siteDir, files = ['server.js'], journeys = [], previous = null, ask }) {
  const code = Object.fromEntries(files.filter((f) => existsSync(join(siteDir, f))).map((f) => [f, readFileSync(join(siteDir, f), 'utf8').slice(0, 14000)]));
  const journeysCode = existsSync(join(siteDir, 'journeys.test.js')) ? readFileSync(join(siteDir, 'journeys.test.js'), 'utf8').slice(0, 6000) : '';
  const { value, masked, restore } = maskDeep({ finding, recommendation: { fix: recommendation.answer, sources: recommendation.sources }, vitalJourneys: journeys, journeysCode, code, previous });
  const r = await ask([
    { role: 'system', content: FIX_PROMPT },
    { role: 'user', content: JSON.stringify(value) },
  ], { max_tokens: 7000, tag: 'fix' }); // reasoning is billed inside the cap: a header fix with a long CSP was cut at 4000
  const j = readJson(r.text) || {};
  const edits = (Array.isArray(j.edits) ? j.edits : []).map((e) => ({ ...e, find: restore(e.find), replace: restore(e.replace) }));
  // When nothing usable comes back, the start of the raw answer is kept: a truncated JSON and a refusal look different.
  return { edits, summary: restore(j.summary || ''), risk: restore(j.risk || ''), secretsMasked: masked, raw: edits.length ? undefined : String(r.text || '').slice(0, 400), truncated: r.finish_reason === 'length' || undefined };
}

// The proposed fix as a unified diff between the site and its repaired copy (what a reviewer applies with `git apply`).
export function makePatch(original, copy, files) {
  const chunks = [];
  for (const f of files) {
    const o = join(original, f).replace(/\\/g, '/'); const c = join(copy, f).replace(/\\/g, '/');
    const r = spawnSync('git', ['-c', 'core.quotepath=false', 'diff', '--no-index', '--no-color', '--', o, c], { encoding: 'utf8' });
    if (r.error) return null; // no git: no patch, the edits in repair.json remain
    const text = (r.stdout || '').split('a/' + o).join('a/' + f).split('b/' + c).join('b/' + f); // headers name the file as in the site
    if (text.trim()) chunks.push(text);
  }
  return chunks.join('');
}

export const journeyNames = (dir) => [...(readFileSync(join(dir, 'journeys.test.js'), 'utf8').matchAll(/name: '([^']+)'/g)).map((m) => m[1])];

// One attempt: propose, apply to a fresh copy, replay the journeys, rescan. Returns the record with its status.
async function attemptFix({ finding, rec, siteDir, journeys, before, previous, propose, ask, login, vision = null }) {
  const copy = copySite(siteDir);
  const fix = await propose({ finding, recommendation: rec, siteDir: copy, journeys, previous, ask });
  const { applied, refused } = applyEdits(copy, fix.edits);
  const record = { finding, recommendation: rec, fix: { summary: fix.summary, risk: fix.risk, secretsMasked: fix.secretsMasked || 0, applied, refused }, journeysBefore: before, copy };
  if (applied.length) record.patch = makePatch(siteDir, copy, [...new Set(applied.map((e) => e.file))]);
  if (!applied.length) return { ...record, status: 'no-edit', why: refused.length ? 'every edit was refused: ' + refused.map((x) => x.why).join('; ') : 'the model proposed no edit' };
  const after = runJourneys(copy);
  record.journeysAfter = after;
  if (!after.ok) return { ...record, status: 'rejected', why: 'the fix breaks: ' + (after.broken.join(', ') || 'the journeys') };
  // Rescan the copy: is the flaw gone?
  let gone = false; let rescan = null;
  try {
    const port = await freePort(); const site = await startSite(copy, port);
    try { rescan = await scan('http://127.0.0.1:' + port, { login, only: [finding.id] }); gone = rescan.findings.length === 0; } finally { site.stop(); }
  } catch (e) { return { ...record, status: 'rejected', why: 'the fixed site does not start: ' + e.message.slice(0, 200) }; }
  record.rescan = rescan;
  if (!gone) return { ...record, status: 'ineffective', why: 'journeys pass but the scanner still sees the flaw' };
  // Optional visual check: the repaired copy is screenshotted and shown to Muse Spark as a customer would see it;
  // SAM 3.1 counts the text fields on the finding's page before and after (visual evidence, not a gate).
  if (vision) {
    try {
      record.vision = await visualCheck({ siteDir, copy, finding, vision });
      if (!record.vision.look.ok) return { ...record, status: 'rejected', why: 'the page no longer looks right to a customer: ' + record.vision.look.problems.join('; ') };
    } catch (e) { record.vision = { error: String(e.message || e).slice(0, 200) }; }
  }
  return { ...record, status: 'proposed', why: 'journeys pass and the flaw is gone on the copy; a human applies it' };
}

const pathOf = (url) => { try { return new URL(url).pathname + (new URL(url).search || ''); } catch { return '/'; } };

// Screenshots of the original and of the copy (home + the finding's page), Muse Spark's verdict on the copy, SAM's count
// of text fields on the finding's page before and after. `vision` = { ask, folder, playwrightPath, concept }.
export async function visualCheck({ siteDir, copy, finding, vision }) {
  const { screenshotPages, lookAtPages, toDataUrl } = await import('./vision.js');
  const { segment } = await import('./sam.js');
  const pages = [{ name: 'home', path: '/' }, { name: 'finding', path: pathOf(finding.url) }];
  const shoot = async (dir, sub) => {
    const port = await freePort(); const site = await startSite(dir, port);
    try { return await screenshotPages('http://127.0.0.1:' + port, pages, join(vision.folder || copy, sub), { playwrightPath: vision.playwrightPath }); } finally { site.stop(); }
  };
  const before = await shoot(siteDir, 'shots-before');
  const after = await shoot(copy, 'shots-after');
  const look = await lookAtPages({ shots: after, ask: vision.ask, question: 'After a security fix, are these pages still working shop pages for a customer?' });
  const concept = vision.concept || 'text input field';
  const count = async (shot) => { try { const s = await segment({ dataUrl: toDataUrl(shot.path), concept, fetchFn: vision.fetchFn }); return s.boxes.length; } catch { return null; } };
  const sam = { concept, before: await count(before[1]), after: await count(after[1]) };
  return { shots: { before, after }, look, sam };
}

// What the next attempt is told about the refused one: its edits, the verdict, the journey it broke and the failing assertion.
const feedback = (r) => ({ status: r.status, why: r.why, edits: (r.fix?.applied || []).map((e) => ({ file: e.file, find: e.find.slice(0, 300), replace: e.replace.slice(0, 300) })), refused: r.fix?.refused || [], brokenJourneys: r.journeysAfter?.broken || [], testOutput: (r.journeysAfter?.output || '').slice(-700), scannerStillSees: r.rescan?.findings?.[0]?.evidence || null });

// The whole thing for one finding. `know` and `propose` can be replaced (tests, other models).
// A refused attempt (no edit, rejected, ineffective) is retried `retries` times with the reason fed back: the agent says no to
// its own fix, reads why, and proposes another one. Earlier attempts stay in `attempts` for the report.
export async function repairOne({ finding, siteDir, ask, folder = null, login = null, know = knowledge, propose = proposeFix, turns = 2, rounds = 1, retries = 1, lessons = [], vision = null }) {
  if (vision && !vision.folder && folder) vision = { ...vision, folder };
  const t0 = Date.now();
  const rec = await know({ finding, ask, folder, turns, rounds, lessons });
  const journeys = journeyNames(siteDir);
  const before = runJourneys(copySite(siteDir));
  const attempts = [];
  let previous = null; let r;
  for (let n = 0; n <= retries; n += 1) {
    r = await attemptFix({ finding, rec, siteDir, journeys, before, previous, propose, ask, login, vision });
    if (r.status === 'proposed') break;
    previous = feedback(r);
    attempts.push({ ...previous, copy: r.copy });
    if (n === retries) attempts.pop(); // the last attempt is the record itself, not a previous one
  }
  return { ...r, attempts, ms: Date.now() - t0 };
}

const ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
export async function repairAll({ findings, siteDir, ask, folder, login = null, only = null, ...rest }) {
  const list = findings.filter((f) => !only || only.includes(f.id)).sort((a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9));
  const results = [];
  for (const finding of list) {
    const sub = folder ? join(folder, finding.id) : null; if (sub) mkdirSync(sub, { recursive: true });
    let r;
    try { r = await repairOne({ finding, siteDir, ask, folder: sub, login, ...rest }); } catch (e) { r = { finding, status: 'error', why: String(e.message || e).slice(0, 300) }; }
    if (sub) {
      // Every record goes into the hashed journal of the run: altered or missing afterwards = the chain breaks.
      writeFileSync(join(sub, 'repair.json'), JSON.stringify(r, null, 2));
      appendChain(folder, finding.id + '/repair.json', { finding: finding.id, status: r.status });
      if (r.patch) { writeFileSync(join(sub, 'fix.patch'), r.patch); appendChain(folder, finding.id + '/fix.patch', { finding: finding.id }); }
    }
    results.push(r);
  }
  return results;
}
