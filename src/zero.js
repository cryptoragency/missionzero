// Mission Zero returns to zero by itself. Every mission leaves an outcome (judge score, lessons used). When the lessons
// it accumulated start to hurt, the agent archives its own memory, writes why, and runs the mission again knowing nothing;
// then it compares both answers, keeps the better one, and relearns from that one only. No human presses the button.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';

export const GOOD = 7; // a judge score under this is a bad mission
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function loadOutcomes(path) { try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : []; } catch { return []; } }
export function recordOutcome(path, outcome) {
  const all = loadOutcomes(path);
  all.push({ at: new Date().toISOString(), ...outcome });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(all.slice(-200), null, 2));
  return all;
}

// The decision, from the outcomes so far (the current mission included, last in the list). Three explainable rules:
//  A. two bad missions in a row, both run with lessons: the lessons are not helping;
//  B. the same goal scored at least 2 points higher before, with fewer lessons: the memory made it worse on a known goal;
//  C. drift: the average of the last 3 missions (with lessons) is 2 points under the average of the 3 before them.
// Nothing to forget when no lesson was used.
export function decideReset(outcomes, { forced = false } = {}) {
  const cur = outcomes[outcomes.length - 1];
  if (forced) return { reset: true, rule: 'forced', reason: 'reset requested for the experiment' };
  if (!cur || !(cur.lessonsUsed > 0)) return { reset: false, rule: null, reason: 'no lesson was used: nothing to forget' };
  const prev = outcomes[outcomes.length - 2];
  if (prev && prev.lessonsUsed > 0 && cur.judgeScore < GOOD && prev.judgeScore < GOOD) {
    return { reset: true, rule: 'A', reason: `two bad missions in a row with lessons applied (${prev.judgeScore}/10 then ${cur.judgeScore}/10)` };
  }
  const same = outcomes.slice(0, -1).filter((o) => norm(o.goal) === norm(cur.goal) && (o.lessonsUsed || 0) < cur.lessonsUsed);
  const bestBefore = same.reduce((b, o) => (o.judgeScore > (b?.judgeScore ?? -1) ? o : b), null);
  if (bestBefore && bestBefore.judgeScore >= cur.judgeScore + 2) {
    return { reset: true, rule: 'B', reason: `this goal scored ${bestBefore.judgeScore}/10 with ${bestBefore.lessonsUsed || 0} lessons and ${cur.judgeScore}/10 now with ${cur.lessonsUsed}: the memory made it worse` };
  }
  const withLessons = outcomes.filter((o) => o.lessonsUsed > 0);
  if (withLessons.length >= 6) {
    const avg = (xs) => xs.reduce((a, o) => a + o.judgeScore, 0) / xs.length;
    const last = avg(withLessons.slice(-3)); const before = avg(withLessons.slice(-6, -3));
    if (last <= before - 2 + 1e-9) return { reset: true, rule: 'C', reason: `the note drifts: ${last.toFixed(1)} on the last 3 missions against ${before.toFixed(1)} on the 3 before` };
  }
  return { reset: false, rule: null, reason: 'the lessons are not hurting' };
}

// The agent archives its own lessons (never deleted), starts empty, and writes the decision in memory/resets.json.
export function archiveLessons(lessonsPath, { reason, rule, goal }, archiveDir = join(dirname(lessonsPath), 'archive')) {
  const lessons = existsSync(lessonsPath) ? JSON.parse(readFileSync(lessonsPath, 'utf8')) : [];
  mkdirSync(archiveDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archived = join(archiveDir, basename(lessonsPath, '.json') + '-' + stamp + '.json');
  if (existsSync(lessonsPath)) renameSync(lessonsPath, archived); else writeFileSync(archived, '[]');
  writeFileSync(lessonsPath, '[]');
  const resetsPath = join(dirname(lessonsPath), 'resets.json');
  const resets = existsSync(resetsPath) ? JSON.parse(readFileSync(resetsPath, 'utf8')) : [];
  resets.push({ at: new Date().toISOString(), rule, reason, goal, lessonsArchived: lessons.length, archived });
  writeFileSync(resetsPath, JSON.stringify(resets, null, 2));
  return { archived, count: lessons.length };
}

// Which answer survives: the higher judge score, then more verified sources, then fewer contradicted ones; the memory
// version wins a perfect tie (it cost nothing more).
export function compareRuns(withMemory, fromZero) {
  const a = withMemory; const b = fromZero;
  if (b.score !== a.score) return { kept: b.score > a.score ? 'from-zero' : 'with-memory', why: `judge ${b.score}/10 from zero against ${a.score}/10 with memory` };
  if ((b.green || 0) !== (a.green || 0)) return { kept: b.green > a.green ? 'from-zero' : 'with-memory', why: `same note, ${b.green} verified sources from zero against ${a.green}` };
  if ((b.red || 0) !== (a.red || 0)) return { kept: b.red < a.red ? 'from-zero' : 'with-memory', why: `same note and sources, ${b.red} contradicted from zero against ${a.red}` };
  return { kept: 'with-memory', why: 'same result either way: the memory did no harm' };
}
