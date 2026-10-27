// Meta Model API client (OpenAI-compatible) with a cost counter and a hard spending cap.
// Prices in dollars per million tokens: to confirm on dev.meta.ai (muse-spark-1.1: 1.25 in / 4.25 out).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const BASE = 'https://api.meta.ai/v1';
const PRICE = { input: 1.25, output: 4.25 };

export function createClient({ key = process.env.MODEL_API_KEY, model = process.env.MZ_MODEL || 'muse-spark-1.3', capUsd = Number(process.env.MZ_CAP_USD) || 100, dailyCapUsd = Number(process.env.MZ_DAILY_CAP_USD) || 0, ledgerPath = 'memory/spend.json', fetchFn = fetch } = {}) {
  if (!key) throw new Error('MODEL_API_KEY is missing (.env file)');
  const counter = { calls: 0, input: 0, output: 0, usd: 0, totalMs: 0, byTag: {} };
// Daily ledger: the spend of every run of the day adds up, so a daily cap holds across runs.
  const today = () => new Date().toISOString().slice(0, 10);
  const spentToday = () => { try { const l = JSON.parse(readFileSync(ledgerPath, 'utf8')); return l.date === today() ? Number(l.usd) || 0 : 0; } catch { return 0; } };
  const startedAt = spentToday();
  const saveLedger = () => { if (!dailyCapUsd) return; try { mkdirSync(dirname(ledgerPath), { recursive: true }); writeFileSync(ledgerPath, JSON.stringify({ date: today(), usd: Math.round((startedAt + counter.usd) * 1e4) / 1e4 })); } catch { /* the cap still holds in memory */ } };
  async function ask(messages, { max_tokens = 1500, temperature = 0.7, tag = 'other' } = {}) {
    if (counter.usd >= capUsd) throw new Error(`Spending cap of ${capUsd} $ reached: human approval required`);
    if (dailyCapUsd && startedAt + counter.usd >= dailyCapUsd) throw new Error(`Daily cap of ${dailyCapUsd} $ reached: stopped until tomorrow or a human yes`);
    const t0 = Date.now();
    const r = await fetchFn(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens, temperature }),
    });
    const body = await r.text();
    if (!r.ok) throw new Error(`Meta ${r.status}: ${body.slice(0, 300)}`);
    const j = JSON.parse(body);
    const u = j.usage || {};
    counter.calls += 1;
    counter.input += u.prompt_tokens || 0;
    counter.output += u.completion_tokens || 0;
    counter.totalMs += Date.now() - t0;
    const b = counter.byTag[tag] || (counter.byTag[tag] = { calls: 0, input: 0, output: 0 });
    b.calls += 1; b.input += u.prompt_tokens || 0; b.output += u.completion_tokens || 0;
    counter.usd = (counter.input * PRICE.input + counter.output * PRICE.output) / 1e6;
    saveLedger();
    return { text: j.choices?.[0]?.message?.content ?? '', usage: u, counter: { ...counter } };
  }
  return { ask, counter, model };
}
