// The experiment loop: goal -> hypotheses -> action -> observation -> evaluation -> new strategy.
// The model and the actions are injected, so the loop can be tested without a network.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

const JSON_RE = /\{[\s\S]*\}/;
export function readJson(text) {
  const m = String(text || '').match(JSON_RE);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export function loadMemory(path) {
  if (!path || !existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return []; }
}

const PLAN_PROMPT = 'You are Mission Zero. You reach a goal through successive experiments. Allowed actions, and only these: '
  + '{"type":"web_search","query":"3 to 8 keywords, not a sentence"} or {"type":"create_page","name":"","content":"complete HTML"}. '
  + 'No cost and no real-world action (costUsd 0, real false) unless indispensable. After an empty search, change the keywords. '
  + 'Answer ONLY in JSON: {"hypotheses":[""],"action":{"type":"","query":"","name":"","content":"","costUsd":0,"real":false},"expected":""}.';
const EVAL_PROMPT = 'Evaluate honestly. JSON: {"score":0-10,"reached":false,"lesson":"","uncertainties":[""],"pivot":""}.';

export async function run({ goal, constraints = [], budgetUsd = 100, maxTurns = 6, ask, execute, approve, help = null, memoryPath = null, journalPath = null }) {
  const memory = loadMemory(memoryPath);
  const evidence = [];
  const note = (e) => { const line = { t: new Date().toISOString(), ...e }; evidence.push(line); if (journalPath) appendFileSync(journalPath, JSON.stringify(line) + '\n'); };
  let best = { score: 0 };

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    // 1. Hypotheses and next action, taking earlier failures into account.
    let plan;
    try {
      const r = await ask([
        { role: 'system', content: PLAN_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, constraints, budgetUsd, failures: memory.filter((m) => !m.ok).slice(-8), recentEvidence: evidence.slice(-4) }) },
      ], { max_tokens: 2500 });
      plan = readJson(r.text);
    } catch (e) { note({ turn, step: 'model-error', message: e.message }); break; }
    if (!plan || !plan.action) { note({ turn, step: 'unreadable-plan' }); continue; }
    note({ turn, step: 'plan', hypotheses: plan.hypotheses, action: plan.action });

    // 2. Safeguard: a paid or real-world action needs a human yes.
    if (plan.action.real || Number(plan.action.costUsd) > 0) {
      const ok = approve ? await approve(plan.action) : false;
      note({ turn, step: 'approval', ok: !!ok });
      if (!ok) { memory.push({ turn, action: plan.action, ok: false, reason: 'refused' }); continue; }
    }

    // 3. Action, then observation.
    let obs;
    try { obs = await execute(plan.action); } catch (e) { obs = { ok: false, error: e.message }; }
    note({ turn, step: 'observation', obs });

    // 4. Evaluation against the original goal.
    let ev = null;
    try {
      const r = await ask([
        { role: 'system', content: EVAL_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, action: plan.action, expected: plan.expected, observation: obs }) },
      ], { max_tokens: 2000 });
      ev = readJson(r.text);
    } catch (e) { note({ turn, step: 'evaluation-error', message: e.message }); }
    if (!ev) ev = { score: 0, reached: false, lesson: 'unreadable evaluation', uncertainties: [], pivot: '' };
    note({ turn, step: 'evaluation', ...ev });

    memory.push({ turn, action: plan.action, ok: Number(ev.score) >= 6, lesson: ev.lesson });
    if (memoryPath) writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    if (Number(ev.score) > best.score) best = { score: Number(ev.score), turn, action: plan.action };
    if (ev.reached) return { reached: true, turns: turn, best, evidence };
    if (help && Number(ev.score) <= 2) { const advice = await help({ goal, evidence: evidence.slice(-6) }); note({ turn, step: 'help', advice }); }
  }
  return { reached: false, turns: evidence.filter((p) => p.step === 'plan').length, best, evidence };
}
