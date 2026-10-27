// Targeted research triggered by an objection on the final answer: ONE free action (read a primary page already seen,
// or a short search), whose observation enlarges what the rewrite may cite. Hypothesis, trial, proof: the contradictor
// says what is missing, this goes and gets it instead of rewriting the same material.
import { readJson } from './loop.js';
import { seenUrls } from './synthesis.js';

const RESEARCH_PROMPT = 'An objection says the final answer lacks something. Pick ONE free action that would fetch it: '
  + '{"type":"read_page","url":"a seen URL, prefer the primary report"} or {"type":"web_search","query":"3 to 8 keywords"}. '
  + 'JSON: {"action":{"type":"","url":"","query":"","costUsd":0,"real":false},"why":""}.';

// Objections worth a research turn: a missing figure, or a primary source seen but not read.
const TRIGGER = /missing|lack|absent|no figure|zero figures|not read|secondary source|primary (source|report|page|study) .*(seen|available|exist)|without edition|unverified/i;
export const needsResearch = (objections) => (objections || []).some((o) => TRIGGER.test(String(o)));

export function makeResearch({ ask, execute, evidence = null, note = null }) {
  const read = new Map(); // url -> observation: a page is fetched once per run, never five times
  return async ({ goal, objections, seen }) => {
    if (!needsResearch(objections)) return [];
    let action;
    try {
      const r = await ask([
        { role: 'system', content: RESEARCH_PROMPT },
        { role: 'user', content: JSON.stringify({ goal, objections, alreadyReadInFull: [...read.keys()], seenSources: seen.map((s) => ({ url: s.url, title: s.title })) }) },
      ], { max_tokens: 1000, tag: 'research' });
      action = readJson(r.text)?.action;
    } catch { return []; }
    if (!action?.type || action.real || Number(action.costUsd) > 0) return []; // never a paid or real action from here
    const key = /read/i.test(action.type) ? String(action.url || '') : '';
    if (key && read.has(key)) return []; // already read: the rewrite already has its text
    let obs;
    try { obs = await execute(action); } catch (e) { obs = { ok: false, error: e.message }; }
    if (key && obs?.ok) read.set(key, obs);
    const step = { step: 'observation', obs, triggeredBy: 'contradiction' };
    if (evidence) evidence.push(step);
    if (note) note({ step: 'research', action, ok: !!obs?.ok, objections });
    return [...seenUrls([step]).values()];
  };
}
