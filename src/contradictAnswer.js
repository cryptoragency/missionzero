// Contradictor and judge on the FINAL ANSWER.
// The A/B of 2026-10-27 showed that attacking the plan makes the result worse: the judge was scoring an intention.
// Here every version of the answer is re-read against the pages it cites (verify.js) before the judge scores it,
// and a red claim caps the note. Only the best-scored version is kept.
import { readJson } from './loop.js';
import { MAX_ROUNDS, GOOD_ENOUGH } from './contradict.js';

const CONTRADICT_PROMPT = 'You are the contradictor. Attack this final answer against the goal: a claim its source does not support (see verification), '
  + 'a missing figure, a secondary source where a primary one was seen, a number without edition year or definition. A claim whose verdict is not "supported" is RED. If you find no real flaw, return {"objections":[],"flawless":true}. '
  + 'At most 4 objections of one sentence each, no prose outside the JSON. JSON: {"objections":["concrete flaw"],"flawless":false}.';
const REVISE_PROMPT = 'Rewrite the final answer so it answers every objection. Cite ONLY URLs from seenSources, copied exactly; drop any claim you cannot back with one of them. '
  + 'A RED verdict comes with the nearest passages of the page: first try to restate the claim in the page\'s own words (SHOULD is not SHALL, a recommendation is not a requirement, a listing date is not an edition) before dropping the source; prefer the latest primary edition over drafts. '
  + 'ONE FIGURE PER CONTRIBUTION: a claim that bundles several figures is split into one entry per figure (same url), so a wrong figure never drags the right ones down. Keep every figure the nearest passages confirm. '
  + 'If a source is confirmed for one figure and not another, split it and keep the confirmed figure. '
  + 'The "answer" field has at most 120 words. Each "contribution" is the FACT that page supports, with its figure, close to the page\'s own words, never a description of the source. No prose outside the JSON. '
  + 'confidence is an integer from 0 to 10. JSON: {"answer":"","sources":[{"url":"","contribution":""}],"confidence":0,"uncertainties":[""]}.';
const JUDGE_PROMPT = 'You are the judge. Score this final answer from 0 to 10 against the goal, using the verification: a GREEN claim is confirmed by its page. A claim whose verdict is not "supported" is RED. '
  + 'Be strict: precision of figures, primary sources, every claim backed. Reason in at most 25 words, no prose outside the JSON. score is an integer from 0 to 10. JSON: {"score":0,"reason":""}.';
export const STAGNATION = 2; // rounds without a better note before the contradictor stops (the best version is kept anyway)
export const RED_CAP = 5; // an answer with an unsupported claim can never score above this
export const NO_SOURCE_CAP = 2; // an answer without any source is not an answer

const clampRounds = (n) => Math.max(0, Math.min(MAX_ROUNDS, Math.floor(Number(n)) || 0));

async function grade({ goal, answer, ask, verify }) {
  // A verifier that throws (network, cap) must not end the refinement and lose the versions already graded:
  // this version is judged without verification and can never score above RED_CAP, so the best graded one stays.
  let check; let failed = '';
  try { check = await verify(answer.sources || []); } catch (e) { check = { results: [], green: 0, red: 0 }; failed = 'verification failed: ' + String(e.message || e).slice(0, 160); }
  let score = 0;
  let reason = '';
  // The judge reasons before it answers and the reasoning is billed inside the cap: a cut answer is unreadable, and an
  // unreadable judge must never pass for a 0/10. One retry with a higher cap, then the reason says it was unreadable.
  for (const cap of [2500, 5000]) try {
    const r = await ask([
      { role: 'system', content: JUDGE_PROMPT },
      { role: 'user', content: JSON.stringify({ goal, answer: answer.answer, sources: answer.sources, verification: (check.results || []).map(({ url, verdict, detail }) => ({ url, verdict, detail })) }) },
    ], { max_tokens: cap, tag: 'judge' });
    const j = readJson(r.text);
    const n = Number(j?.score);
    if (!j || !Number.isFinite(n)) { reason = 'the judge answer was unreadable (cut by the token cap)'; continue; }
    score = Math.max(0, Math.min(10, n));
    reason = String(j?.reason || '').slice(0, 300);
    break;
  } catch (e) { score = 0; reason = 'judge failed: ' + String(e.message || e).slice(0, 120); }
  if (check.red > 0 && score > RED_CAP) { score = RED_CAP; reason = `${reason} (capped at ${RED_CAP}: red claim)`.trim(); }
  if (failed) { score = Math.min(score, RED_CAP); reason = `${failed}; ${reason}`; }
  if (!(answer.sources || []).length) score = Math.min(score, NO_SOURCE_CAP);
  const verification = (check.results || []).map(({ url, claim, verdict, detail }) => ({ url, claim, verdict, detail }));
  return { score, green: check.green, red: check.red, reason, verification };
}

// Returns the best version of the answer, its grade and the trace of every version.
// `research` (optional) is called with the objections and may return newly seen sources: they become citable.
// `reread` (optional) is called with the RED claims of the last version: it reads each cited page again with the
// claim as target (research.js makeReread), and a red claim is an objection by itself, even when the contradictor
// finds nothing: the rewrite must restate it in the page's words, cite another seen page, or drop it.
export const redObjection = (r) => `RED: the claim "${String(r.claim || '').slice(0, 200)}" is not supported by ${r.url} (verdict: ${r.verdict}); restate it in the words of the re-read passages of that page, or cite another seen page that states it, or drop it`;
const redsOf = (v) => (v?.verification || []).filter((r) => r.verdict && r.verdict !== 'supported');

export async function refineAnswer({ goal, answer, seen, ask, verify, research = null, reread = null, rounds = 0, escalate = true }) {
  const base = clampRounds(rounds);
  const max = escalate && base > 0 ? MAX_ROUNDS : base;
  seen = [...(seen || [])];
  const seenUrls = new Set(seen.map((s) => s.url));
  const keepSeen = (a) => ({ ...a, sources: (Array.isArray(a.sources) ? a.sources : []).filter((s) => seenUrls.has(s.url)) });
  let current = keepSeen(answer);
  const g0 = await grade({ goal, answer: current, ask, verify });
  const versions = [{ round: 0, ...g0, objections: [], answer: current }];
  let best = versions[0];
  let last = versions[0]; // the version just graded: its verification (verdicts and nearest passages) guides the next round
  // Every version keeps its verification: the evidence folder shows which claim was confirmed by which passage.
  const done = () => ({ answer: best.answer, score: best.score, green: best.green, red: best.red, verification: best.verification, rounds: versions.length - 1, versions: versions.map(({ answer: _a, ...r }) => r) });
  if (base === 0) return done();

  // A source fetched by research or reread becomes citable; a page read in full replaces the search snippet of the same URL.
  const merge = (list) => { let n = 0; for (const s of list || []) { if (!s?.url) continue; const i = seen.findIndex((x) => x.url === s.url); if (i >= 0) { if (s.title === 'page read in full' && seen[i].title !== s.title) { seen[i] = s; n += 1; } } else { seen.push(s); seenUrls.add(s.url); n += 1; } } return n; };

  let flat = 0; // rounds in a row without a better note
  for (let round = 1; round <= max; round += 1) {
    if (round > base && best.score >= GOOD_ENOUGH) break; // beyond the base rounds, only while the note is bad
    if (flat >= STAGNATION) break; // the note is not moving: stop paying for rounds
    let found;
    try {
      const r = await ask([
        { role: 'system', content: CONTRADICT_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, answer: current, verification: last.verification, judgeReason: last.reason }) },
      ], { max_tokens: 1500, tag: 'contradict' });
      found = readJson(r.text);
    } catch { break; }
    const reds = redsOf(last);
    const objections = [...(Array.isArray(found?.objections) ? found.objections.filter(Boolean) : []), ...reds.map(redObjection)];
    if (!objections.length) break; // nothing left to contradict, and nothing red

    // Red claim: back to the cited page with the claim as target, before anything else.
    let rereadN = 0;
    // Counted as pages read again, not as new entries of seen: a page already read in full and read again is still a re-read.
    if (reread && reds.length) { try { const got = await reread({ reds, seen }); rereadN = (got || []).length; merge(got); } catch { /* the rewrite goes on with the nearest passages */ } }

    // The objection says what is missing: go and get it before rewriting.
    let fetched = 0;
    if (research) { try { fetched = merge(await research({ goal, answer: current, objections, seen })); } catch { /* the rewrite goes on with what was seen */ } }

    let revised = null;
    try {
      const r = await ask([
        { role: 'system', content: REVISE_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, answer: current, objections, verification: last.verification, seenSources: seen }) },
      ], { max_tokens: 5000, tag: 'rewrite' });
      revised = readJson(r.text);
    } catch { break; }
    if (!revised?.answer) { flat += 1; continue; } // an unreadable rewrite is a round without progress
    current = keepSeen(revised);
    const v = { round, ...(await grade({ goal, answer: current, ask, verify })), objections, fetched, reread: rereadN, answer: current };
    versions.push(v);
    last = v;
    if (v.score > best.score) { best = v; flat = 0; } else flat += 1; // strictly better only: an earlier version wins ties
  }
  return done();
}
