// Verifier: checks every claim of an AI-written report against the pages it cites.
// A claim is GREEN only if the cited page really says it. Unreachable pages and unsupported claims are RED.
import { readPage } from './tools.js';
import { readJson } from './loop.js';
import { relevantPassages } from './passages.js';
export { relevantPassages };

export async function verifyClaim({ claim, url, ask, fetchPage = (u) => readPage(u, { maxChars: 60000 }) }) {
  const page = await fetchPage(url);
  if (!page.ok) return { claim, url, verdict: 'source-unreachable', color: 'red', detail: page.error || 'page unreadable' };
  const passages = relevantPassages(page.text, claim);
  if (!passages.length) return { claim, url, verdict: 'unsupported', color: 'red', detail: 'no passage of the cited page matches the claim' };
  const r = await ask([
    { role: 'system', content: 'You check one claim against passages of the page it cites. Be strict: numbers, names and dates must match the passages. JSON: {"verdict":"supported|unsupported|contradicted","quote":"exact words from a passage, or empty"}.' },
    { role: 'user', content: JSON.stringify({ claim, passages }) },
  ], { max_tokens: 3000 });
  const j = readJson(r.text) || {};
  const verdict = ['supported', 'unsupported', 'contradicted'].includes(j.verdict) ? j.verdict : 'unsupported';
  // A "supported" verdict must come with a quote that really appears in the passages, otherwise it is not trusted.
  const quoted = j.quote && passages.some((p) => p.toLowerCase().includes(String(j.quote).toLowerCase().slice(0, 60)));
  const final = verdict === 'supported' && !quoted ? 'unsupported' : verdict;
  return { claim, url, verdict: final, color: final === 'supported' ? 'green' : 'red', detail: quoted ? j.quote : '' };
}

export async function verifyReport({ items, ask, fetchPage }) {
  const results = [];
  for (const it of items) results.push(await verifyClaim({ claim: it.claim, url: it.url, ask, fetchPage }));
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
