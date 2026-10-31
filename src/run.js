// Run Mission Zero on a goal: node --env-file=.env src/run.js "goal" [maxTurns] [contradictions 0-5] [--from-zero]
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync } from 'node:fs';
import { createClient, provider } from './meta.js';
import { run } from './loop.js';
import { makeExecutor } from './tools.js';
import { synthesize, seenUrls } from './synthesis.js';
import { refineAnswer } from './contradictAnswer.js';
import { verifyReport } from './verify.js';
import { makeResearch, makeReread } from './research.js';
import { loadLessons, saveLessons, mergeLessons, distill, approvedTexts, pickTrial, judgeTrial } from './memory.js';
import { recordOutcome, loadOutcomes, decideReset, archiveLessons, compareRuns } from './zero.js';
import { evidenceFolder } from './evidenceDir.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const goal = args[0];
if (!goal) { console.error('Usage: node --env-file=.env src/run.js "goal" [maxTurns] [contradictions 0-5] [--from-zero]'); process.exit(1); }
const maxTurns = Number(args[1]) || 3;
// Contradiction rounds apply to the FINAL ANSWER (3 by default, up to 5 while the note is bad).
// Rounds on the plan lost the A/B of 2026-10-27; they stay available through MZ_PLAN_CONTRADICTIONS (default 0).
const contradictions = Math.max(0, Math.min(5, Number(args[2] ?? 3) || 0));
const planContradictions = Math.max(0, Math.min(5, Number(process.env.MZ_PLAN_CONTRADICTIONS) || 0));
// The key is checked first: a missing key is one line on stderr, and no empty evidence folder is left behind.
let client;
try { client = createClient(); } catch (e) { console.error(e.message); process.exit(1); }
const folder = evidenceFolder('');
mkdirSync(folder, { recursive: true });

const lessonsPath = 'memory/lessons.json';
const outcomesPath = 'memory/outcomes.json';
const past = loadLessons(lessonsPath);
const ask = (messages, opts) => client.ask(messages, { max_tokens: 3500, ...opts });
const note = (dir) => (e) => appendFileSync(dir + '/journal.jsonl', JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');

// One mission: the loop, the draft, the verified and contradicted answer. `lessons` is what the planner is told.
async function mission({ lessons, dir }) {
  mkdirSync(dir, { recursive: true });
  const execute = makeExecutor({ folder: dir, goal });
  const usdBefore = client.counter.usd;
  const result = await run({
    goal,
    constraints: ['public sources only', 'no spending', 'no contact with third parties'],
    lessons,
    budgetUsd: 1,
    maxTurns,
    contradictions: planContradictions,
    ask,
    execute,
    approve: async () => false, // no real or paid action without a human
    memoryPath: dir + '/memory.json',
    journalPath: dir + '/journal.jsonl',
  });
  const draft = await synthesize({ goal, evidence: result.evidence, ask });
  const verifyCache = new Map();
  const verify = (sources) => verifyReport({ items: sources.map((s) => ({ claim: s.contribution, url: s.url })), ask, cache: verifyCache });
  const research = makeResearch({ ask, execute, evidence: result.evidence, note: note(dir) });
  const reread = makeReread({ execute, evidence: result.evidence, note: note(dir) });
  const refined = await refineAnswer({ goal, answer: draft, seen: [...seenUrls(result.evidence).values()], ask, verify, research, reread, rounds: contradictions });
  const final = { ...refined.answer, rejectedSources: draft.rejectedSources, judge: { score: refined.score, green: refined.green, red: refined.red, rounds: refined.rounds, versions: refined.versions } };
  writeFileSync(dir + '/final-answer.json', JSON.stringify(final, null, 2));
  return { result, draft, refined, final, verifyCache, usd: client.counter.usd - usdBefore, dir };
}

// summary.json is written whatever happens (cap reached, network down, a bug): a partial summary with `error` and the
// money already spent is better than a folder without one.
let summary = { goal, provider: provider(), model: client.model };
let failure = null;
try {
  // 1) The mission with what the agent knows.
  // A quarantined lesson of the agent is tried on this mission, one at a time (MZ_TRIAL=off disables it).
  const trial = process.env.MZ_TRIAL === 'off' ? null : pickTrial(past);
  const firstLessons = [...approvedTexts(past), ...(trial ? [trial.text] : [])];
  if (trial) { note(folder)({ step: 'trial', lesson: trial.text, from: trial.proof?.judgeScore ?? null }); console.log(`Trying a quarantined lesson on this mission: "${trial.text.slice(0, 90)}"`); }
  const first = await mission({ lessons: firstLessons, dir: folder });
  let kept = first; let zero = null;
  summary = { ...summary, judgeScore: first.refined.score, verifiedGreen: first.refined.green, verifiedRed: first.refined.red, partial: 'first mission done' };
  const outcomes = recordOutcome(outcomesPath, { goal, judgeScore: first.refined.score, green: first.refined.green, red: first.refined.red, lessonsUsed: firstLessons.length, trial: trial ? trial.text : undefined, folder });

  // 2) The agent decides whether its memory is hurting; if so it archives it ITSELF, says why, and starts again from zero.
  const decision = process.env.MZ_ZERO === 'off' ? { reset: false, rule: null, reason: 'MZ_ZERO=off' } : decideReset(outcomes, { forced: process.argv.includes('--from-zero') });
  note(folder)({ step: 'zero', decision });
  if (decision.reset) {
    const archive = archiveLessons(lessonsPath, { reason: decision.reason, rule: decision.rule, goal });
    console.log(`Memory reset (rule ${decision.rule}): ${decision.reason}. ${archive.count} lessons archived in ${archive.archived}; re-running the mission with no memory.`);
    const second = await mission({ lessons: [], dir: folder + '/from-zero' });
    const cmp = compareRuns({ score: first.refined.score, green: first.refined.green, red: first.refined.red }, { score: second.refined.score, green: second.refined.green, red: second.refined.red });
    kept = cmp.kept === 'from-zero' ? second : first;
    zero = { decision, archive, withMemory: { score: first.refined.score, green: first.refined.green, red: first.refined.red, usd: first.usd }, fromZero: { score: second.refined.score, green: second.refined.green, red: second.refined.red, usd: second.usd }, kept: cmp.kept, why: cmp.why };
    note(folder)({ step: 'zero', compared: zero });
    recordOutcome(outcomesPath, { goal, judgeScore: second.refined.score, green: second.refined.green, red: second.refined.red, lessonsUsed: 0, folder: second.dir, fromZero: true, kept: cmp.kept });
    writeFileSync(folder + '/zero.json', JSON.stringify(zero, null, 2));
    console.log(`Kept: the answer ${cmp.kept === 'from-zero' ? 'from zero' : 'with memory'} (${cmp.why}).`);
  }

  // 3) Relearn from the answer that was kept. After a reset: if the from-zero answer won, the memory starts from that mission
  // alone; if the memory did no harm, the archived lessons come back (the archive stays, as the trace of the decision).
  let base = decision.reset && zero.kept === 'from-zero' ? [] : past;
  // The trial's verdict comes from the mission that used the lesson (the first one), never from the from-zero one.
  let trialResult = null;
  if (trial && base === past) {
    const tv = judgeTrial(base, trial.text, { judgeScore: first.refined.score, green: first.refined.green, red: first.refined.red, folder: first.dir });
    base = tv.lessons;
    if (tv.removed) { const rp = 'memory/rejected.json'; const gone = existsSync(rp) ? JSON.parse(readFileSync(rp, 'utf8')) : []; gone.push(tv.removed); writeFileSync(rp, JSON.stringify(gone, null, 2)); }
    trialResult = { lesson: trial.text, verdict: tv.verdict, why: tv.why };
  } else if (trial) trialResult = { lesson: trial.text, verdict: 'archived', why: 'the memory was reset and the answer from zero was kept' };
  if (trialResult) { note(folder)({ step: 'trial', ...trialResult }); console.log(`Trial ${trialResult.verdict}: ${trialResult.why}.`); }
  if (decision.reset && zero.kept !== 'from-zero') { note(folder)({ step: 'zero', restored: past.length }); console.log(`Memory restored: ${past.length} lessons back (the archive stays).`); }
  // What the agent says it learned is quarantined unless the kept mission is proven (score, verified quotes, nothing contradicted).
  const learned = mergeLessons(base, await distill({ goal, evidence: kept.result.evidence, ask }), 'self', { judgeScore: kept.refined.score, green: kept.refined.green, red: kept.refined.red, folder: kept.dir });
  if (learned.quarantined.length) console.log(`${learned.quarantined.length} lesson(s) in quarantine (${learned.quarantined[0].quarantine}): not given to the planner until proven again or approved (node src/lessons.js).`);
  saveLessons(lessonsPath, learned.lessons);
  writeFileSync(folder + '/final-answer.json', JSON.stringify(kept.final, null, 2));
  summary = { goal, provider: provider(), model: client.model, reached: kept.result.reached, turns: kept.result.turns, best: kept.result.best, confidence: kept.final.confidence, judgeScore: kept.refined.score, verifiedGreen: kept.refined.green, verifiedRed: kept.refined.red, contradictionRounds: kept.refined.rounds, verifiedSources: kept.final.sources.length, rejectedSources: kept.final.rejectedSources, cost: client.counter, verificationsCached: [...kept.verifyCache.keys()].length, lessonsUsed: decision.reset && kept !== first ? 0 : firstLessons.length, trial: trialResult || undefined, lessonsLearned: learned.added.length - learned.quarantined.length, lessonsQuarantined: learned.quarantined.length, lessonsPromoted: learned.promoted.length, zero: zero ? { rule: zero.decision.rule, reason: zero.decision.reason, kept: zero.kept, withMemory: zero.withMemory.score, fromZero: zero.fromZero.score } : { reset: false, reason: decision.reason } };
} catch (e) {
  failure = e;
  summary = { ...summary, error: String(e?.message || e).slice(0, 500) };
} finally {
  summary.cost = client.counter; // never forget what was spent, even on a failed run
  try { writeFileSync(folder + '/summary.json', JSON.stringify(summary, null, 2)); } catch (e) { console.error('summary.json could not be written:', e.message); }
}
// The pretty JSON on stdout is what bench/run-demo.js parses as a finished run: a failed run prints its error instead.
if (failure) console.error('Mission stopped:', summary.error);
else console.log(JSON.stringify(summary, null, 2));
console.log('Evidence folder:', folder);
if (failure) process.exitCode = 1;
