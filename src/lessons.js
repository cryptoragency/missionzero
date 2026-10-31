// The human side of the memory: see what the agent learned, approve a quarantined lesson, or reject one.
//   node src/lessons.js            list (approved first, then quarantined with the reason)
//   node src/lessons.js approve 3  a human approves lesson 3: it reaches the planner from the next mission
//   node src/lessons.js reject 3   lesson 3 leaves the memory; it is kept in memory/rejected.json, never silently lost
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadLessons, saveLessons } from './memory.js';

export function applyHuman(lessons, verb, n, rejectedPath = null) {
  const i = Number(n) - 1;
  if (!Number.isInteger(i) || i < 0 || i >= lessons.length) throw new Error('no lesson number ' + n + ' (1 to ' + lessons.length + ')');
  const at = new Date().toISOString();
  if (verb === 'approve') {
    const out = lessons.map((l, k) => (k === i ? { ...l, approved: true, approvedBy: 'human', promotedAt: at } : l));
    delete out[i].quarantine;
    return out;
  }
  if (verb === 'reject') {
    if (rejectedPath) {
      const gone = existsSync(rejectedPath) ? JSON.parse(readFileSync(rejectedPath, 'utf8')) : [];
      gone.push({ ...lessons[i], rejectedBy: 'human', rejectedAt: at });
      writeFileSync(rejectedPath, JSON.stringify(gone, null, 2));
    }
    return lessons.filter((_, k) => k !== i);
  }
  throw new Error('unknown verb: ' + verb + ' (approve or reject)');
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:')}` || process.argv[1]?.endsWith('lessons.js')) {
  const path = 'memory/lessons.json';
  const [verb, n] = process.argv.slice(2);
  let lessons = loadLessons(path);
  if (verb) { lessons = applyHuman(lessons, verb, n, 'memory/rejected.json'); saveLessons(path, lessons); console.log(verb === 'approve' ? 'Approved: lesson ' + n : 'Rejected: lesson ' + n + ' (kept in memory/rejected.json)'); }
  lessons.forEach((l, k) => console.log(`${String(k + 1).padStart(2)}. ${l.approved ? 'approved   ' : 'QUARANTINE '} ${l.text}${l.quarantine ? '\n      why: ' + l.quarantine : ''}`));
}
