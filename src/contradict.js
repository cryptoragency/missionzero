// Contradictor + judge: before an action is executed, one agent attacks the plan (0 to 5 rounds),
// the planner revises it each time, and a judge scores every version. The best-scored version is kept.
import { readJson } from './loop.js';

export const MAX_ROUNDS = 5;
export const GOOD_ENOUGH = 7; // below this best score, the contradictor gets one more round, up to MAX_ROUNDS

const CONTRADICT_PROMPT = 'You are the contradictor. Attack the proposed plan against the goal: wrong assumption, weak source, '
  + 'a cheaper or more direct action, a missing check. If you find no real flaw, return {"objections":[],"flawless":true}. '
  + 'JSON: {"objections":["concrete flaw"],"flawless":false}.';
const REVISE_PROMPT = 'Revise the plan so it answers every objection. Keep the same JSON shape: '
  + '{"hypotheses":[""],"action":{"type":"","query":"","url":"","find":"","name":"","content":"","costUsd":0,"real":false},"expected":""}. '
  + 'A web_search query stays 3 to 8 keywords, never a sentence or a boolean expression. Keep costUsd 0 and real false.';
const JUDGE_PROMPT = 'You are the judge. Score this plan from 0 to 10 for how likely it is to move the goal forward at no cost and with checkable evidence. '
  + 'Be strict: an unanswered objection lowers the score. score is an integer from 0 to 10. JSON: {"score":0,"reason":""}.';

const clampRounds = (n) => Math.max(0, Math.min(MAX_ROUNDS, Math.floor(Number(n)) || 0));

async function judge({ goal, plan, objections, ask }) {
  try {
    const r = await ask([
      { role: 'system', content: JUDGE_PROMPT },
      { role: 'user', content: JSON.stringify({ goal, plan, objections }) },
    ], { max_tokens: 1500 });
    const j = readJson(r.text);
    const score = Number(j?.score);
    return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0;
  } catch { return 0; }
}

// Returns the best plan, its score and the full trace of versions.
export async function refinePlan({ goal, plan, ask, rounds = 0, escalate = true }) {
  const base = clampRounds(rounds);
  const max = escalate && base > 0 ? MAX_ROUNDS : base;
  if (base === 0) return { plan, score: null, rounds: 0, versions: [] };
  let current = plan;
  let objections = [];
  const versions = [{ round: 0, score: await judge({ goal, plan: current, objections, ask }), objections: [], plan: current }];
  let best = versions[0];

  for (let round = 1; round <= max; round += 1) {
    if (round > base && best.score >= GOOD_ENOUGH) break; // beyond the base rounds, only while the note is bad
    let found;
    try {
      const r = await ask([
        { role: 'system', content: CONTRADICT_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, plan: current }) },
      ], { max_tokens: 1500 });
      found = readJson(r.text);
    } catch { break; }
    objections = Array.isArray(found?.objections) ? found.objections.filter(Boolean) : [];
    if (found?.flawless || !objections.length) break; // nothing left to contradict: stop early

    let revised = null;
    try {
      const r = await ask([
        { role: 'system', content: REVISE_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, plan: current, objections }) },
      ], { max_tokens: 2500 });
      revised = readJson(r.text);
    } catch { break; }
    if (!revised?.action) continue; // unreadable revision: keep the current plan, try another round
    // A revision can never make the plan costlier or more real than the original: money and real-world actions stay a human call.
    revised.action.costUsd = Math.min(Number(revised.action.costUsd) || 0, Number(plan.action?.costUsd) || 0);
    revised.action.real = !!(revised.action.real && plan.action?.real);
    current = revised;
    const v = { round, score: await judge({ goal, plan: current, objections: [], ask }), objections, plan: current };
    versions.push(v);
    if (v.score > best.score) best = v; // strictly better only: an earlier plan wins ties
  }
  return { plan: best.plan, score: best.score, rounds: versions.length - 1, versions: versions.map(({ plan: _p, ...rest }) => rest) };
}
