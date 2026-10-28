// Meta Model API client (OpenAI-compatible) with a cost counter and a hard spending cap.
// Prices in dollars per million tokens: to confirm on dev.meta.ai (muse-spark-1.1: 1.25 in / 4.25 out).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
// MZ_BASE_URL switches the provider: the open-weight Muse Spark served by Baseten (or any OpenAI-compatible endpoint)
// takes the same requests; MZ_PRICE_IN / MZ_PRICE_OUT set that provider's prices per million tokens.
const BASE = (process.env.MZ_BASE_URL || 'https://api.meta.ai/v1').replace(/\/$/, '');
const PRICE = { input: Number(process.env.MZ_PRICE_IN) || 1.25, output: Number(process.env.MZ_PRICE_OUT) || 4.25 };
// Reasoning effort by role: checks and scores need little, planning and writing a bit more.
const EFFORT = { verify: 'minimal', judge: 'low', contradict: 'low', research: 'low', evaluate: 'low', distill: 'minimal', plan: 'medium', synthesize: 'medium', rewrite: 'medium', fix: 'medium', other: 'low' };

// The key follows the provider: BASETEN_API_KEY when the base URL is Baseten's, MODEL_API_KEY (Meta) otherwise; MZ_API_KEY overrides.
const KEY = process.env.MZ_API_KEY || (/baseten/i.test(BASE) ? process.env.BASETEN_API_KEY : process.env.MODEL_API_KEY);
export const provider = () => (/baseten/i.test(BASE) ? 'baseten' : /api\.meta\.ai/.test(BASE) ? 'meta' : new URL(BASE).hostname);
export function createClient({ key = KEY, model = process.env.MZ_MODEL || (/baseten/i.test(BASE) ? 'meta-models/muse-spark-open' : 'muse-spark-1.3'), capUsd = Number(process.env.MZ_CAP_USD) || 100, dailyCapUsd = Number(process.env.MZ_DAILY_CAP_USD) || 0, ledgerPath = 'memory/spend.json', fetchFn = fetch } = {}) {
  if (!key) throw new Error((/baseten/i.test(BASE) ? 'BASETEN_API_KEY' : 'MODEL_API_KEY') + ' is missing (.env file)');
  const counter = { calls: 0, input: 0, output: 0, usd: 0, totalMs: 0, byTag: {} };
// Daily ledger: the spend of every run of the day adds up, so a daily cap holds across runs.
  const today = () => new Date().toISOString().slice(0, 10);
  const spentToday = () => { try { const l = JSON.parse(readFileSync(ledgerPath, 'utf8')); return l.date === today() ? Number(l.usd) || 0 : 0; } catch { return 0; } };
  const startedAt = spentToday();
  const saveLedger = () => { if (!dailyCapUsd) return; try { mkdirSync(dirname(ledgerPath), { recursive: true }); writeFileSync(ledgerPath, JSON.stringify({ date: today(), usd: Math.round((startedAt + counter.usd) * 1e4) / 1e4 })); } catch { /* the cap still holds in memory */ } };
  // muse-spark reasons before it answers, and the reasoning is billed as output: on 2026-10-27 it was 93 % of the cost.
  // Each role gets the effort it needs (minimal, low, medium, high, xhigh, max); MZ_EFFORT=low forces one level for all.
  const effortFor = (tag) => process.env.MZ_EFFORT || EFFORT[tag] || 'low';
  async function ask(messages, { max_tokens = 1500, temperature = 0.7, tag = 'other', reasoning_effort = effortFor(tag) } = {}) {
    if (counter.usd >= capUsd) throw new Error(`Spending cap of ${capUsd} $ reached: human approval required`);
    if (dailyCapUsd && startedAt + counter.usd >= dailyCapUsd) throw new Error(`Daily cap of ${dailyCapUsd} $ reached: stopped until tomorrow or a human yes`);
    const t0 = Date.now();
    const r = await fetchFn(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens, temperature, reasoning_effort }),
    });
    const body = await r.text();
    if (!r.ok) throw new Error(`Meta ${r.status}: ${body.slice(0, 300)}`);
    const j = JSON.parse(body);
    const u = j.usage || {};
    counter.calls += 1;
    counter.input += u.prompt_tokens || 0;
    counter.output += u.completion_tokens || 0;
    counter.totalMs += Date.now() - t0;
    const b = counter.byTag[tag] || (counter.byTag[tag] = { calls: 0, input: 0, output: 0, reasoning: 0, truncated: 0 });
    b.calls += 1; b.input += u.prompt_tokens || 0; b.output += u.completion_tokens || 0;
    b.reasoning += u.completion_tokens_details?.reasoning_tokens || 0;
    if (j.choices?.[0]?.finish_reason === 'length') b.truncated += 1; // the cap cut the answer: raise it for this role
    counter.usd = (counter.input * PRICE.input + counter.output * PRICE.output) / 1e6;
    saveLedger();
    return { text: j.choices?.[0]?.message?.content ?? '', usage: u, counter: { ...counter } };
  }
  return { ask, counter, model };
}
