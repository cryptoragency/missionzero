// Meta Model API client (OpenAI-compatible) with a cost counter and a hard spending cap.
// Prices in dollars per million tokens, as listed on 28 October 2026 for Muse Spark (1.25 in / 4.25 out; Baseten's model page
// shows the same for the open weights, plus 0.15 for cached input). MZ_PRICE_IN / MZ_PRICE_OUT / MZ_PRICE_CACHED override them.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
// The Participant Guide names meta-models/muse-spark-open-1026 for the hackathon; our Baseten key refused it on 30 October 2026
// and serves meta-models/muse-spark-open, so that is the default (MZ_MODEL overrides).
// MZ_BASE_URL switches the provider: the open-weight Muse Spark served by Baseten (or any OpenAI-compatible endpoint)
// takes the same requests.
const BASE = (process.env.MZ_BASE_URL || 'https://api.meta.ai/v1').replace(/\/$/, '');
// An empty or missing variable means the default; an explicit 0 stays 0 (a free provider is a valid price).
const num = (x, d) => (x === undefined || x === '' ? d : Number(x));
const PRICE = { input: num(process.env.MZ_PRICE_IN, 1.25), output: num(process.env.MZ_PRICE_OUT, 4.25), cached: num(process.env.MZ_PRICE_CACHED, 0.15) };
const RUN_CAP = Number(process.env.MZ_CAP_USD) || 5;
const DAILY_CAP = Number(process.env.MZ_DAILY_CAP_USD) || 0;
const LEDGER = 'memory/spend.json';
const TIMEOUT_MS = 120000;
const BACKOFF_MS = [2000, 8000]; // two more tries on 429 and 5xx, unless the server says how long to wait
// Reasoning effort by role: checks and scores need little, planning and writing a bit more.
const EFFORT = { verify: 'minimal', judge: 'low', contradict: 'low', research: 'low', evaluate: 'low', distill: 'minimal', plan: 'medium', synthesize: 'medium', rewrite: 'medium', fix: 'medium', review: 'low', vision: 'low', other: 'low' };

// Open-weight providers of Muse Spark (OpenAI-compatible), each with its key and the slug it serves. Fireworks lists
// accounts/fireworks/models/muse-spark-open at the same prices (1.25 in / 4.25 out, 30 October 2026, hackathon workshop).
const PROVIDERS = [
  { name: 'baseten', test: /baseten/i, key: 'BASETEN_API_KEY', model: 'meta-models/muse-spark-open' },
  { name: 'fireworks', test: /fireworks/i, key: 'FIREWORKS_API_KEY', model: 'accounts/fireworks/models/muse-spark-open' },
];
const OPEN = PROVIDERS.find((p) => p.test.test(BASE));
// The key follows the provider: BASETEN_API_KEY or FIREWORKS_API_KEY when the base URL is theirs, MODEL_API_KEY (Meta) otherwise; MZ_API_KEY overrides.
const KEY_NAME = OPEN ? OPEN.key : 'MODEL_API_KEY';
const KEY = process.env.MZ_API_KEY || process.env[KEY_NAME];
export const provider = () => (OPEN ? OPEN.name : /api\.meta\.ai/.test(BASE) ? 'meta' : new URL(BASE).hostname);
// A typo in MZ_BASE_URL would hand the key to whoever answers there: an unknown host or a plain-http URL is refused at the
// first call, unless MZ_ALLOW_CUSTOM_BASE=1 says it is meant (then a warning still says where the key goes).
const KNOWN_HOSTS = ['api.meta.ai', 'inference.baseten.co', 'api.fireworks.ai'];
function baseProblem(base) {
  let u; try { u = new URL(base); } catch { return `MZ_BASE_URL is not a URL: ${base}`; }
  if (u.protocol === 'https:' && KNOWN_HOSTS.includes(u.hostname)) return null;
  return `MZ_BASE_URL (${u.protocol}//${u.hostname}) is not a known https provider (${KNOWN_HOSTS.join(', ')}): the key would be sent there. Set MZ_ALLOW_CUSTOM_BASE=1 if this endpoint is yours.`;
}
const BASE_PROBLEM = baseProblem(BASE);
const CUSTOM_BASE = process.env.MZ_ALLOW_CUSTOM_BASE === '1';
if (BASE_PROBLEM && CUSTOM_BASE) { try { console.warn(`Warning: MZ_BASE_URL is not a known provider; ${process.env.MZ_API_KEY ? 'MZ_API_KEY' : KEY_NAME} will be sent to ${new URL(BASE).hostname}.`); } catch { /* not a URL: the call fails with its own message */ } }
const checkBase = (base) => { if (base === BASE && BASE_PROBLEM && !CUSTOM_BASE) throw new Error(BASE_PROBLEM); };

// Daily ledger, one per machine: { date, usd }. The day is the UTC day: a daily cap resets at midnight UTC (see .env.example).
// Each call re-reads the file and adds ITS delta, written to a temporary file then renamed, so several clients or
// processes add up instead of overwriting each other with a stale total.
const today = () => new Date().toISOString().slice(0, 10);
export function spentToday(path = LEDGER) {
  try { const l = JSON.parse(readFileSync(path, 'utf8')); return l.date === today() ? Number(l.usd) || 0 : 0; } catch { return 0; }
}
export function addToLedger(path, usd) {
  if (!(usd > 0)) return;
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    writeFileSync(tmp, JSON.stringify({ date: today(), usd: Math.round((spentToday(path) + usd) * 1e6) / 1e6 }));
    renameSync(tmp, path);
  } catch { /* the run cap still holds in memory */ }
}
const runCapError = (cap) => new Error(`Spending cap of $${cap} reached for this run. Raise MZ_CAP_USD to continue.`);
const dailyCapError = (cap) => new Error(`Daily cap of $${cap} reached. Stopped until tomorrow (UTC), or raise MZ_DAILY_CAP_USD.`);

const wait = (ms) => new Promise((res) => setTimeout(res, ms));
// retry-after is either seconds or an HTTP date; anything above a minute is cut to a minute.
function retryAfterMs(r) {
  const h = r?.headers?.get?.('retry-after');
  if (!h) return null;
  const s = Number(h);
  const ms = Number.isFinite(s) ? s * 1000 : Date.parse(h) - Date.now();
  return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, 60000) : null;
}
// One request with a timeout, retried on 429, 5xx, a network error and a timeout. Returns the last response and its body.
async function send(url, init, { fetchFn = fetch, sleep = wait, timeoutMs = TIMEOUT_MS } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    let r; let body;
    try {
      r = await fetchFn(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      body = await r.text();
    } catch (e) {
      // A dropped connection or a slow answer is as passing as a 503: tried again, then reported as it is.
      if (attempt >= BACKOFF_MS.length) throw e;
      await sleep(BACKOFF_MS[attempt]); continue;
    }
    const retriable = r.status === 429 || r.status >= 500;
    if (r.ok || !retriable || attempt >= BACKOFF_MS.length) return { r, body };
    await sleep(retryAfterMs(r) ?? BACKOFF_MS[attempt]);
  }
}

// Spend of this process outside any chat client (SAM, voice): it counts against the run cap and the daily ledger.
export const sideCounter = { calls: 0, usd: 0 };
// Spend of every chat client of this process: the run cap holds on chat + side calls together, from either side.
export const chatSpend = { usd: 0 };
// metaFetch: any other call to the provider (SAM, voice). It sets the key, the timeout and the retries, checks the caps
// before the call, and adds what `cost(json)` says the call cost. Throws on an HTTP error; returns { status, body, json }.
// SAM and voice exist only on Meta's API: they always go to META_BASE with MODEL_API_KEY, whatever MZ_BASE_URL says
// (Baseten and Fireworks serve the open-weight Muse Spark text model, not /responses nor /asr/transcribe).
export const META_BASE = 'https://api.meta.ai/v1';
export const META_KEY = process.env.MODEL_API_KEY;
export async function metaFetch(path, init = {}, { base = BASE, key = KEY, keyName = KEY_NAME, fetchFn = fetch, sleep = wait, cost = () => 0, capUsd = RUN_CAP, dailyCapUsd = DAILY_CAP, ledgerPath = LEDGER } = {}) {
  if (!key) throw new Error(keyName + ' is missing (.env file)');
  checkBase(base);
  if (chatSpend.usd + sideCounter.usd >= capUsd) throw runCapError(capUsd);
  if (dailyCapUsd && spentToday(ledgerPath) >= dailyCapUsd) throw dailyCapError(dailyCapUsd);
  const { r, body } = await send(`${base}${path}`, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${key}` } }, { fetchFn, sleep });
  if (!r.ok) throw new Error(`${base === BASE ? provider() : 'meta'} ${r.status}: ${body.slice(0, 300)}`);
  let json = null; try { json = JSON.parse(body); } catch { /* the caller reads the body itself */ }
  const usd = Math.max(0, Number(cost(json)) || 0);
  sideCounter.calls += 1; sideCounter.usd += usd;
  if (dailyCapUsd) addToLedger(ledgerPath, usd);
  return { status: r.status, body, json };
}

export function createClient({ key = KEY, model = process.env.MZ_MODEL || (OPEN ? OPEN.model : 'muse-spark-1.3'), capUsd = RUN_CAP, dailyCapUsd = DAILY_CAP, ledgerPath = LEDGER, fetchFn = fetch, sleep = wait, price = PRICE } = {}) {
  if (!key) throw new Error(KEY_NAME + ' is missing (.env file)');
  const counter = { calls: 0, input: 0, output: 0, cached: 0, usd: 0, totalMs: 0, byTag: {} };
  // muse-spark reasons before it answers, and the reasoning is billed as output: on 2026-10-27 it was 93 % of the cost.
  // Each role gets the effort it needs (minimal, low, medium, high, xhigh, max); MZ_EFFORT=low forces one level for all.
  const effortFor = (tag) => process.env.MZ_EFFORT || EFFORT[tag] || 'low';
  async function ask(messages, { max_tokens = 1500, temperature = 0.7, tag = 'other', reasoning_effort = effortFor(tag) } = {}) {
    checkBase(BASE);
    if (counter.usd + sideCounter.usd >= capUsd) throw runCapError(capUsd);
    // The ledger is read again before each call: another client or process may have spent since.
    if (dailyCapUsd && spentToday(ledgerPath) >= dailyCapUsd) throw dailyCapError(dailyCapUsd);
    const t0 = Date.now();
    const { r, body } = await send(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens, temperature, reasoning_effort }),
    }, { fetchFn, sleep });
    if (!r.ok) throw new Error(`${provider()} ${r.status}: ${body.slice(0, 300)}`);
    const j = JSON.parse(body);
    const u = j.usage || {};
    const input = u.prompt_tokens || 0; const output = u.completion_tokens || 0;
    // Cached input is part of prompt_tokens, billed at the cached price.
    const cached = Math.min(input, u.prompt_tokens_details?.cached_tokens ?? u.cached_tokens ?? 0);
    const usd = ((input - cached) * price.input + cached * price.cached + output * price.output) / 1e6;
    const finish = j.choices?.[0]?.finish_reason ?? null;
    counter.calls += 1; counter.input += input; counter.output += output; counter.cached += cached;
    counter.totalMs += Date.now() - t0;
    counter.usd += usd; chatSpend.usd += usd;
    const b = counter.byTag[tag] || (counter.byTag[tag] = { calls: 0, input: 0, output: 0, reasoning: 0, truncated: 0 });
    b.calls += 1; b.input += input; b.output += output;
    b.reasoning += u.completion_tokens_details?.reasoning_tokens || 0;
    if (finish === 'length') b.truncated += 1; // the cap cut the answer: raise it for this role
    if (dailyCapUsd) addToLedger(ledgerPath, usd);
    return { text: j.choices?.[0]?.message?.content ?? '', usage: u, finish_reason: finish, counter: { ...counter } };
  }
  return { ask, counter, model };
}
