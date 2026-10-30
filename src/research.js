// Targeted research triggered by an objection on the final answer: ONE free action (read a primary page already seen,
// or a short search), whose observation enlarges what the rewrite may cite. Hypothesis, trial, proof: the contradictor
// says what is missing, this goes and gets it instead of rewriting the same material.
import { readJson } from './loop.js';
import { seenUrls } from './synthesis.js';

const RESEARCH_PROMPT = 'An objection says the final answer lacks something. Pick ONE free action that would fetch it: '
  + '{"type":"read_page","url":"a URL copied exactly from seenSources, prefer the primary report","find":"the exact facts to locate, as keywords and numbers"} or {"type":"web_search","query":"3 to 8 keywords"}. '
  + 'No prose outside the JSON. JSON: {"action":{"type":"","url":"","find":"","query":"","costUsd":0,"real":false},"why":""}.';

// Objections worth a research turn: a missing figure, or a primary source seen but not read.
const TRIGGER = /RED:|not supported|missing|lack|absent|no figure|zero figures|not read|secondary source|primary (source|report|page|study) .*(seen|available|exist)|without edition|unverified|instead of|rather than|not (to )?the .* itself|snapshot|subset|summary|draft/i;
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
    // Only the two read-only actions, and a page only if it was already seen: the model cannot send the executor
    // to an address it made up (or to create_page) from an objection.
    if (action.type !== 'read_page' && action.type !== 'web_search') return [];
    if (action.type === 'read_page' && !(seen || []).some((s) => s?.url && s.url === action.url)) return [];
    const key = action.type === 'read_page' ? String(action.url || '') : '';
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

// Red claim = go back to the page. A verdict "unsupported" or "contradicted" used to be handed to the rewrite with
// the nearest passages only; now the cited page is READ AGAIN with the claim itself as the target (`find`), so the
// rewrite sees the passages that actually carry the figure, and can restate the claim in the page's words or drop it.
// One re-read per (url, claim) per run, at most `max` pages per round; an unreachable page is not re-read.
export function makeReread({ execute, evidence = null, note = null, max = 3 }) {
  const done = new Set(); // url + claim already re-read: never twice
  return async ({ reds, seen: _seen }) => {
    const found = [];
    for (const r of (reds || []).filter((x) => x?.url && x.verdict !== 'source-unreachable').slice(0, max)) {
      const key = r.url + '\n' + String(r.claim || '').trim().toLowerCase();
      if (done.has(key)) continue;
      done.add(key);
      const action = { type: 'read_page', url: r.url, find: String(r.claim || '').slice(0, 300), costUsd: 0, real: false };
      let obs;
      try { obs = await execute(action); } catch (e) { obs = { ok: false, error: e.message }; }
      const step = { step: 'observation', obs, triggeredBy: 'red-claim' };
      if (evidence) evidence.push(step);
      if (note) note({ step: 'reread', action, ok: !!obs?.ok, verdict: r.verdict });
      if (obs?.ok) found.push(...seenUrls([step]).values());
    }
    return found;
  };
}
