import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decideReset, archiveLessons, compareRuns, recordOutcome, loadOutcomes } from './zero.js';

const o = (judgeScore, lessonsUsed, goal = 'g') => ({ judgeScore, lessonsUsed, goal, green: 1, red: 0 });

test('no lesson used: nothing to forget', () => {
  assert.equal(decideReset([o(3, 0)]).reset, false);
});

test('rule A: two bad missions in a row with lessons', () => {
  assert.equal(decideReset([o(10, 5, 'a'), o(6, 6, 'b')]).reset, false);
  const d = decideReset([o(10, 5, 'a'), o(6, 6, 'b'), o(5, 7, 'c')]);
  assert.equal(d.reset, true); assert.equal(d.rule, 'A'); assert.match(d.reason, /6\/10 then 5\/10/);
});

test('rule B: a known goal scored higher before with fewer lessons', () => {
  const d = decideReset([o(10, 2, 'DBIR human element'), o(9, 5, 'other'), o(7, 9, 'dbir  human element!')]);
  assert.equal(d.reset, true); assert.equal(d.rule, 'B');
  assert.equal(decideReset([o(10, 2, 'x'), o(9, 9, 'x')]).reset, false); // one point is noise
  assert.equal(decideReset([o(10, 9, 'x'), o(7, 2, 'x')]).reset, false); // the better run had MORE lessons: not the memory's fault
});

test('rule C: the note drifts down over six missions', () => {
  const g = ['a', 'b', 'c', 'd', 'e', 'f'];
  const d = decideReset([10, 9, 10, 8, 7, 8].map((s, i) => o(s, i + 1, g[i])));
  assert.equal(d.reset, true); assert.equal(d.rule, 'C');
  assert.equal(decideReset([10, 9, 10, 9, 9, 8].map((s, i) => o(s, i + 1, g[i]))).reset, false);
});

test('forced reset for the experiment', () => {
  assert.equal(decideReset([o(10, 3)], { forced: true }).rule, 'forced');
});

test('the agent archives its lessons, starts empty, and writes why', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mz-zero-'));
  const lessonsPath = join(dir, 'lessons.json');
  writeFileSync(lessonsPath, JSON.stringify([{ text: 'search the PDF first', approved: true }, { text: 'x', approved: true }]));
  const r = archiveLessons(lessonsPath, { reason: 'two bad missions', rule: 'A', goal: 'g' });
  assert.equal(r.count, 2);
  assert.ok(existsSync(r.archived));
  assert.deepEqual(JSON.parse(readFileSync(lessonsPath, 'utf8')), []);
  assert.equal(JSON.parse(readFileSync(r.archived, 'utf8')).length, 2);
  const resets = JSON.parse(readFileSync(join(dir, 'resets.json'), 'utf8'));
  assert.equal(resets.length, 1); assert.equal(resets[0].rule, 'A'); assert.equal(resets[0].lessonsArchived, 2);
});

test('the better answer survives: note, then verified sources, then contradicted ones; a tie keeps the memory', () => {
  assert.equal(compareRuns({ score: 7, green: 2, red: 0 }, { score: 10, green: 1, red: 0 }).kept, 'from-zero');
  assert.equal(compareRuns({ score: 10, green: 2, red: 0 }, { score: 10, green: 3, red: 0 }).kept, 'from-zero');
  assert.equal(compareRuns({ score: 10, green: 2, red: 1 }, { score: 10, green: 2, red: 0 }).kept, 'from-zero');
  assert.equal(compareRuns({ score: 10, green: 2, red: 0 }, { score: 10, green: 2, red: 0 }).kept, 'with-memory');
  assert.equal(compareRuns({ score: 10, green: 2, red: 0 }, { score: 8, green: 5, red: 0 }).kept, 'with-memory');
});

test('outcomes are recorded and reloaded', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mz-zero-')); const path = join(dir, 'outcomes.json');
  recordOutcome(path, o(10, 3)); recordOutcome(path, o(4, 4));
  const all = loadOutcomes(path);
  assert.equal(all.length, 2); assert.equal(all[1].judgeScore, 4); assert.ok(all[1].at);
});
