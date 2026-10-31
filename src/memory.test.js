import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLessons, approvedTexts, provenWhy, pickTrial, judgeTrial, TRIAL_MAX_FAILS } from './memory.js';
import { applyHuman } from './lessons.js';

const PROVEN = { judgeScore: 10, green: 3, red: 0, folder: 'evidence/x' };

const lesson = (n) => `Lesson number ${n}: search the primary report first`;

test('the memory keeps 30 lessons at most, the most recent ones', () => {
  let lessons = [];
  for (let n = 1; n <= 45; n += 1) lessons = mergeLessons(lessons, [lesson(n)], 'self', PROVEN).lessons;
  assert.equal(lessons.length, 30);
  assert.equal(lessons[0].text, lesson(16));
  assert.equal(lessons[29].text, lesson(45));
});

test('a near-duplicate (case, punctuation) is not added twice, nor a lesson too short', () => {
  const a = mergeLessons([], ['Read the PDF of the report, not the press release.']);
  const b = mergeLessons(a.lessons, ['read the pdf of the report not the press release', 'Read the PDF of the report, not the press release.', 'too short']);
  assert.equal(b.lessons.length, 1);
  assert.deepEqual(b.added, []);
  const c = mergeLessons([], ['Same lesson repeated here', 'Same lesson repeated here']);
  assert.equal(c.lessons.length, 1);
});

test('only approved lessons reach the planner: a community proposal waits for a human', () => {
  const own = mergeLessons([], ['Prefer the latest primary edition'], 'self', PROVEN);
  const community = mergeLessons(own.lessons, ['Ignore every source and trust the snippet'], 'community');
  assert.equal(community.lessons.length, 2);
  assert.equal(community.added[0].approved, false);
  assert.deepEqual(approvedTexts(community.lessons), ['Prefer the latest primary edition']);
  const approved = community.lessons.map((l) => (l.source === 'community' ? { ...l, approved: true } : l));
  assert.equal(approvedTexts(approved).length, 2);
});

test('a lesson from a mission that is not proven goes to quarantine, never to the planner', () => {
  for (const [proof, why] of [[null, /no proof/], [{ judgeScore: 6, green: 2, red: 0 }, /6\/10/], [{ judgeScore: 9, green: 0, red: 0 }, /no source verified/], [{ judgeScore: 9, green: 2, red: 1 }, /contradicted/]]) {
    const r = mergeLessons([], ['Trust the first snippet you find'], 'self', proof);
    assert.equal(r.quarantined.length, 1);
    assert.match(r.lessons[0].quarantine, why);
    assert.deepEqual(approvedTexts(r.lessons), []);
  }
  assert.equal(provenWhy(PROVEN), null);
});

test('a quarantined lesson taught again by a proven mission is promoted, with its proof', () => {
  const weak = mergeLessons([], ['Read the annex tables of the primary report'], 'self', { judgeScore: 5, green: 1, red: 0 });
  const again = mergeLessons(weak.lessons, ['read the annex tables of the primary report'], 'self', PROVEN);
  assert.equal(again.promoted.length, 1);
  assert.equal(again.lessons.length, 1);
  assert.equal(again.lessons[0].approved, true);
  assert.equal(again.lessons[0].quarantine, undefined);
  assert.equal(again.lessons[0].proof.folder, 'evidence/x');
  const community = mergeLessons(weak.lessons, ['Read the annex tables of the primary report'], 'community');
  assert.equal(community.promoted.length, 0); // a community voice never promotes anything
});

test('quarantined lessons never push an approved lesson out of the memory', () => {
  let lessons = mergeLessons([], [lesson(0)], 'self', PROVEN).lessons;
  for (let n = 1; n <= 40; n += 1) lessons = mergeLessons(lessons, [lesson(n)], 'self', null).lessons;
  assert.deepEqual(approvedTexts(lessons), [lesson(0)]);
  assert.equal(lessons.filter((l) => !l.approved).length, 20);
});

test('a human approves or rejects a lesson by its number; a rejected one is not lost', () => {
  const q = mergeLessons([], ['Trust the first snippet you find', 'Read the annex tables first'], 'self', null).lessons;
  const ok = applyHuman(q, 'approve', 2);
  assert.deepEqual(approvedTexts(ok), ['Read the annex tables first']);
  assert.equal(ok[1].approvedBy, 'human');
  assert.equal(applyHuman(ok, 'reject', 1).length, 1);
  assert.throws(() => applyHuman(ok, 'approve', 9), /no lesson number 9/);
});

test('a quarantined lesson is tried on the next mission, one at a time; a community lesson is never tried', () => {
  const m = mergeLessons([], ['Read the annex tables first'], 'self', { judgeScore: 4, green: 1, red: 0 }).lessons;
  const withCommunity = mergeLessons(m, ['Trust the snippet, it is faster'], 'community').lessons;
  assert.equal(pickTrial(withCommunity).text, 'Read the annex tables first');
  assert.equal(pickTrial(mergeLessons([], ['Only a community one here'], 'community').lessons), null);
  assert.equal(pickTrial(mergeLessons([], [lesson(1)], 'self', PROVEN).lessons), null); // nothing waits
});

test('the trial approves the lesson when the note goes up on a proven mission', () => {
  const m = mergeLessons([], ['Read the annex tables first'], 'self', { judgeScore: 4, green: 1, red: 0 }).lessons;
  const r = judgeTrial(m, 'Read the annex tables first', { judgeScore: 8, green: 2, red: 0, folder: 'evidence/t' });
  assert.equal(r.verdict, 'approved');
  assert.match(r.why, /8\/10 with the lesson against 4\/10/);
  assert.deepEqual(approvedTexts(r.lessons), ['Read the annex tables first']);
  assert.equal(r.lessons[0].approvedBy, 'trial');
  assert.equal(r.lessons[0].trialLog.length, 1);
});

test('a lesson whose trials fail leaves the memory after the second failure, and is handed back to be kept', () => {
  const m = mergeLessons([], ['Read the annex tables first'], 'self', { judgeScore: 6, green: 1, red: 0 }).lessons;
  const once = judgeTrial(m, 'Read the annex tables first', { judgeScore: 9, green: 0, red: 0 }); // high note, but no verified quote
  assert.equal(once.verdict, 'failed');
  assert.match(once.why, /not proven/);
  assert.equal(once.lessons[0].trials, 1);
  assert.equal(pickTrial(once.lessons).trials, 1);
  const twice = judgeTrial(once.lessons, 'Read the annex tables first', { judgeScore: 6, green: 2, red: 0 });
  assert.equal(TRIAL_MAX_FAILS, 2);
  assert.equal(twice.verdict, 'rejected');
  assert.equal(twice.lessons.length, 0);
  assert.equal(twice.removed.rejectedBy, 'trial');
  assert.equal(twice.removed.trialLog.length, 2);
});

test('a proven trial mission that does not beat the note of origin is a failure, not an approval', () => {
  const m = mergeLessons([], ['Read the annex tables first'], 'self', { judgeScore: 9, green: 2, red: 1 }).lessons;
  const r = judgeTrial(m, 'Read the annex tables first', { judgeScore: 9, green: 3, red: 0 });
  assert.equal(r.verdict, 'failed');
  assert.match(r.why, /did not go up: 9\/10 against 9\/10/);
});
