// Verifier: checks every claim of an AI-written report against the pages it cites.
// A claim is GREEN only if the cited page really says it. Unreachable pages and unsupported claims are RED.
import { readPage } from './tools.js';
import { readJson } from './loop.js';
import { relevantPassages } from './passages.js';
export { relevantPassages };

// The whole page is read (a standard or a report runs to 250 000 characters); the passages do the narrowing.
export async function verifyClaim({ claim, url, ask, fetchPage = (u) => readPage(u, { maxChars: 400000 }) }) {
  const page = await fetchPage(url);
  if (!page.ok) return { claim, url, verdict: 'source-unreachable', color: 'red', detail: page.error || 'page unreadable' };
  const passages = relevantPassages(page.text, claim);
  if (!passages.length) return { claim, url, verdict: 'unsupported', color: 'red', detail: 'no passage of the cited page matches the claim' };
  const r = await ask([
    { role: 'system', content: 'You check one claim against passages of the page it cites. Be strict: numbers, names and dates must match the passages. JSON: {"verdict":"supported|unsupported|contradicted","quote":"exact words from a passage, or empty"}.' },
    { role: 'user', content: JSON.stringify({ claim, passages }) },
  ], { max_tokens: 1000, tag: 'verify' });
  const j = readJson(r.text) || {};
  const verdict = ['supported', 'unsupported', 'contradicted'].includes(j.verdict) ? j.verdict : 'unsupported';
  // A "supported" verdict must come with a quote that really appears in the passages, otherwise it is not trusted.
  const quoted = j.quote && passages.some((p) => p.toLowerCase().includes(String(j.quote).toLowerCase().slice(0, 60)));
  const final = verdict === 'supported' && !quoted ? 'unsupported' : verdict;
  // On a red verdict, the closest passage goes back to the writer: the fix is usually to say what the page says (SHOULD, not SHALL).
  const detail = final === 'supported' ? j.quote : 'nearest passages: ' + passages.slice(0, 3).map((p) => '« ' + p.slice(0, 220) + ' »').join(' ');
  return { claim, url, verdict: final, color: final === 'supported' ? 'green' : 'red', detail };
}

// `cache` (a Map, one per run): the same claim against the same page gives the same verdict, so it is checked once.
export async function verifyReport({ items, ask, fetchPage, cache = null }) {
  const results = [];
  for (const it of items) {
    const key = `${it.url}\n${String(it.claim || '').trim().toLowerCase()}`;
    if (cache?.has(key)) { results.push({ ...cache.get(key), cached: true }); continue; }
    const r = await verifyClaim({ claim: it.claim, url: it.url, ask, fetchPage });
    cache?.set(key, r);
    results.push(r);
  }
  const green = results.filter((r) => r.color === 'green').length;
  return { results, green, red: results.length - green };
}

// Baseline: the same model asked to re-read its own claim, with no access to the page.
export async function selfCheck({ claim, ask }) {
  const r = await ask([
    { role: 'system', content: 'Is this claim accurate? Answer from your own knowledge. JSON: {"verdict":"true|false"}.' },
    { role: 'user', content: claim },
  ], { max_tokens: 2000 });
  return { claim, verdict: readJson(r.text)?.verdict === 'true' ? 'true' : 'false' };
}
