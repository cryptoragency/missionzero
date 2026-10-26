// Meta Model API client (OpenAI-compatible) with a cost counter and a hard spending cap.
// Prices in dollars per million tokens: to confirm on dev.meta.ai (muse-spark-1.1: 1.25 in / 4.25 out).
const BASE = 'https://api.meta.ai/v1';
const PRICE = { input: 1.25, output: 4.25 };

export function createClient({ key = process.env.MODEL_API_KEY, model = process.env.MZ_MODEL || 'muse-spark-1.3', capUsd = Number(process.env.MZ_CAP_USD) || 100, fetchFn = fetch } = {}) {
  if (!key) throw new Error('MODEL_API_KEY is missing (.env file)');
  const counter = { calls: 0, input: 0, output: 0, usd: 0, totalMs: 0 };
  async function ask(messages, { max_tokens = 1500, temperature = 0.7 } = {}) {
    if (counter.usd >= capUsd) throw new Error(`Spending cap of ${capUsd} $ reached: human approval required`);
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
    counter.usd = (counter.input * PRICE.input + counter.output * PRICE.output) / 1e6;
    return { text: j.choices?.[0]?.message?.content ?? '', usage: u, counter: { ...counter } };
  }
  return { ask, counter, model };
}
