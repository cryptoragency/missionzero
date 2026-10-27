// Contradictor and judge on the FINAL ANSWER.
// The A/B of 2026-10-27 showed that attacking the plan makes the result worse: the judge was scoring an intention.
// Here every version of the answer is re-read against the pages it cites (verify.js) before the judge scores it,
// and a red claim caps the note. Only the best-scored version is kept.
import { readJson } from './loop.js';
import { MAX_ROUNDS, GOOD_ENOUGH } from './contradict.js';

const CONTRADICT_PROMPT = 'You are the contradictor. Attack this final answer against the goal: a claim its source does not support (see verification), '
  + 'a missing figure, a secondary source where a primary one was seen, a number without edition year or definition. If you find no real flaw, say so. '
  + 'At most 4 objections of one sentence each, no prose outside the JSON. JSON: {"objections":["concrete flaw"],"flawless":false}.';
const REVISE_PROMPT = 'Rewrite the final answer so it answers every objection. Cite ONLY URLs from seenSources, copied exactly; drop any claim you cannot back with one of them. '
  + 'Answer in at most 120 words, each contribution in one sentence, no prose outside the JSON. '
  + 'JSON: {"answer":"","sources":[{"url":"","contribution":""}],"confidence":0-10,"uncertainties":[""]}.';
const JUDGE_PROMPT = 'You are the judge. Score this final answer from 0 to 10 against the goal, using the verification: a GREEN claim is confirmed by its page, a RED one is not. '
  + 'Be strict: precision of figures, primary sources, every claim backed. Reason in at most 25 words, no prose outside the JSON. JSON: {"score":0-10,"reason":""}.';
export const STAGNATION = 2; // rounds without a better note before the contradictor stops (the best version is kept anyway)
export const RED_CAP = 5; // an answer with an unsupported claim can never score above this
export const NO_SOURCE_CAP = 2; // an answer without any source is not an answer

const clampRounds = (n) => Math.max(0, Math.min(MAX_ROUNDS, Math.floor(Number(n)) || 0));

async function grade({ goal, answer, ask, verify }) {
  const check = await verify(answer.sources || []);
  let score = 0;
  let reason = '';
  try {
    const r = await ask([
      { role: 'system', content: JUDGE_PROMPT },
      { role: 'user', content: JSON.stringify({ goal, answer: answer.answer, sources: answer.sources, verification: (check.results || []).map(({ url, verdict, detail }) => ({ url, verdict, detail })) }) },
    ], { max_tokens: 1200, tag: 'judge' });
    const j = readJson(r.text);
    const n = Number(j?.score);
    score = Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0;
    reason = String(j?.reason || '').slice(0, 300);
  } catch { score = 0; }
  if (check.red > 0) score = Math.min(score, RED_CAP);
  if (!(answer.sources || []).length) score = Math.min(score, NO_SOURCE_CAP);
  return { score, green: check.green, red: check.red, reason };
}

// Returns the best version of the answer, its grade and the trace of every version.
// `research` (optional) is called with the objections and may return newly seen sources: they become citable.
export async function refineAnswer({ goal, answer, seen, ask, verify, research = null, rounds = 0, escalate = true }) {
  const base = clampRounds(rounds);
  const max = escalate && base > 0 ? MAX_ROUNDS : base;
  seen = [...(seen || [])];
  const seenUrls = new Set(seen.map((s) => s.url));
  const keepSeen = (a) => ({ ...a, sources: (Array.isArray(a.sources) ? a.sources : []).filter((s) => seenUrls.has(s.url)) });
  let current = keepSeen(answer);
  const g0 = await grade({ goal, answer: current, ask, verify });
  const versions = [{ round: 0, ...g0, objections: [], answer: current }];
  let best = versions[0];
  const done = () => ({ answer: best.answer, score: best.score, green: best.green, red: best.red, rounds: versions.length - 1, versions: versions.map(({ answer: _a, ...r }) => r) });
  if (base === 0) return done();

  let flat = 0; // rounds in a row without a better note
  for (let round = 1; round <= max; round += 1) {
    if (round > base && best.score >= GOOD_ENOUGH) break; // beyond the base rounds, only while the note is bad
    if (flat >= STAGNATION) break; // the note is not moving: stop paying for rounds
    let found;
    try {
      const r = await ask([
        { role: 'system', content: CONTRADICT_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, answer: current, verification: { green: best.green, red: best.red } }) },
      ], { max_tokens: 1500, tag: 'contradict' });
      found = readJson(r.text);
    } catch { break; }
    const objections = Array.isArray(found?.objections) ? found.objections.filter(Boolean) : [];
    if (found?.flawless || !objections.length) break; // nothing left to contradict

    // The objection says what is missing: go and get it before rewriting.
    let fetched = 0;
    if (research) {
      try {
        for (const s of (await research({ goal, answer: current, objections, seen })) || []) {
          if (!s?.url) continue;
          const i = seen.findIndex((x) => x.url === s.url);
          // A page read in full replaces the search snippet of the same URL: the rewrite gets the real text.
          if (i >= 0) { if (s.title === 'page read in full' && seen[i].title !== s.title) { seen[i] = s; fetched += 1; } }
          else { seen.push(s); seenUrls.add(s.url); fetched += 1; }
        }
      } catch { /* the rewrite goes on with what was seen */ }
    }

    let revised = null;
    try {
      const r = await ask([
        { role: 'system', content: REVISE_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, answer: current, objections, seenSources: seen }) },
      ], { max_tokens: 3500, tag: 'rewrite' });
      revised = readJson(r.text);
    } catch { break; }
    if (!revised?.answer) continue;
    current = keepSeen(revised);
    const v = { round, ...(await grade({ goal, answer: current, ask, verify })), objections, fetched, answer: current };
    versions.push(v);
    if (v.score > best.score) { best = v; flat = 0; } else flat += 1; // strictly better only: an earlier version wins ties
  }
  return done();
}
