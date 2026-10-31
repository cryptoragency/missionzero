// Shared memory across runs: short, generic lessons about HOW to research (never about a company or a person).
// A lesson is only given to the planner when it is proven (see mergeLessons) or approved by a human.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { readJson } from './loop.js';

export function loadLessons(path) {
  if (!path || !existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return []; }
}

export function saveLessons(path, lessons) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(lessons, null, 2));
}

// A lesson the agent wrote about itself is a claim, not a fact. It reaches the planner only when the mission it came from
// is PROVEN: judge score at least PROVEN_SCORE, at least one source verified with an exact quote, none contradicted.
// Otherwise it waits in quarantine (approved: false, with the reason) until a proven mission teaches it again, or a human
// approves it (node src/lessons.js approve <n>). A community lesson always waits for a human.
export const PROVEN_SCORE = 7;
export function provenWhy(proof) {
  if (!proof) return 'no proof attached to the mission';
  if (!(Number(proof.judgeScore) >= PROVEN_SCORE)) return `judge score ${proof.judgeScore ?? '?'}/10, under ${PROVEN_SCORE}`;
  if (!(Number(proof.green) >= 1)) return 'no source verified with an exact quote';
  if (Number(proof.red) > 0) return `${proof.red} source${Number(proof.red) > 1 ? 's' : ''} contradicted or unsupported`;
  return null;
}
const proofOf = (proof) => (proof ? { judgeScore: proof.judgeScore, green: proof.green, red: proof.red, folder: proof.folder } : null);

// Merge new lessons, drop near-duplicates. A quarantined lesson taught again by a proven mission is promoted.
// Kept: the 30 most recent approved lessons and the 20 most recent quarantined ones (a quarantine never pushes out an approved lesson).
export function mergeLessons(existing, incoming, source = 'self', proof = null) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const why = source === 'self' ? provenWhy(proof) : 'community proposal: a human approves it';
  const all = existing.map((l) => ({ ...l }));
  const byText = new Map(all.map((l) => [norm(l.text), l]));
  const added = []; const promoted = [];
  for (const text of incoming) {
    const t = String(text || '').trim().slice(0, 200);
    if (t.length < 12) continue;
    const known = byText.get(norm(t));
    if (known) {
      if (!known.approved && source === 'self' && !why) { known.approved = true; known.promotedAt = new Date().toISOString(); known.proof = proofOf(proof); delete known.quarantine; promoted.push(known); }
      continue;
    }
    const l = { text: t, source, approved: !why, at: new Date().toISOString(), proof: proofOf(proof) };
    if (why) l.quarantine = why;
    byText.set(norm(t), l); all.push(l); added.push(l);
  }
  const ok = all.filter((l) => l.approved).slice(-30); const wait = all.filter((l) => !l.approved).slice(-20);
  const keep = new Set([...ok, ...wait]);
  return { lessons: all.filter((l) => keep.has(l)), added, promoted, quarantined: added.filter((l) => !l.approved) };
}

// Objections of the contradictor that made the judge's note go up: the useful ones.
export function winningObjections(evidence) {
  const out = [];
  for (const p of evidence.filter((e) => e.step === 'contradiction')) {
    let best = -1;
    for (const v of p.versions || []) {
      if (v.score > best && best >= 0) out.push(...(v.objections || []).map((o) => String(o).slice(0, 200)));
      best = Math.max(best, v.score);
    }
  }
  return out.slice(0, 8);
}

// Ask the model to distill what this run taught, as generic research lessons.
export async function distill({ goal, evidence, ask }) {
  const steps = evidence.filter((p) => p.step === 'plan' || p.step === 'evaluation')
    .map((p) => (p.step === 'plan' ? { query: p.action?.query } : { score: p.score, lesson: p.lesson }));
  const winning = winningObjections(evidence);
  const r = await ask([
    { role: 'system', content: 'Distill at most 3 GENERIC lessons about how to research better on the web (query style, source types, what wasted turns). Include what the winning objections teach about how to plan better. No company names, no personal data. JSON: {"lessons":["..."]}.' },
    { role: 'user', content: JSON.stringify({ goal, steps, objectionsThatRaisedTheNote: winning }) },
  ], { max_tokens: 1200, tag: 'distill' });
  return (readJson(r.text)?.lessons || []).filter((x) => typeof x === 'string');
}

// Only approved lessons are given to the planner.
export const approvedTexts = (lessons) => lessons.filter((l) => l.approved).map((l) => l.text);
