// Shared memory across runs: short, generic lessons about HOW to research (never about a company or a person).
// A lesson that comes from the community is only a proposal until a human approves it.
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

// Merge new lessons, drop near-duplicates, keep the most recent 30.
export function mergeLessons(existing, incoming, source = 'self') {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const known = new Set(existing.map((l) => norm(l.text)));
  const added = [];
  for (const text of incoming) {
    const t = String(text || '').trim().slice(0, 200);
    if (t.length < 12 || known.has(norm(t))) continue;
    known.add(norm(t));
    added.push({ text: t, source, approved: source === 'self', at: new Date().toISOString() });
  }
  return { lessons: [...existing, ...added].slice(-30), added };
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
  ], { max_tokens: 3000 });
  return (readJson(r.text)?.lessons || []).filter((x) => typeof x === 'string');
}

// Only approved lessons are given to the planner.
export const approvedTexts = (lessons) => lessons.filter((l) => l.approved).map((l) => l.text);
