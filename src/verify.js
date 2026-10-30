// Verifier: checks every claim of an AI-written report against the pages it cites.
// A claim is GREEN only if the cited page really says it. Unreachable pages and unsupported claims are RED.
import { readPage } from './tools.js';
import { readJson } from './loop.js';
import { relevantPassages, normalizeNumbers } from './passages.js';
export { relevantPassages };

const VERIFY_PROMPT = 'You check one claim against passages of the page it cites. Be strict: numbers, names and dates must match the passages. '
  + '"supported" = a passage says what the claim says; "contradicted" = a passage states the opposite or another figure; "unsupported" = the passages say nothing about it. '
  + 'quote: copy the words of ONE passage character for character, no ellipsis, no paraphrase, long enough to carry the claim (its figures included); empty if not supported. '
  + 'No prose outside the JSON. JSON: {"verdict":"supported|unsupported|contradicted","quote":"exact words from a passage, or empty"}.';

// Compared the way a reader would: case, runs of spaces, curly quotes and number spellings ("12,195", "eight") do not count.
const norm = (s) => normalizeNumbers(String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')).replace(/\s+/g, ' ').trim();
const numbersOf = (s) => [...new Set(norm(s).match(/\d+(?:\.\d+)?/g) || [])];
export const MIN_QUOTE = 25;

// Why a quote does not prove the claim, or null when it does: the WHOLE quote must sit in one passage, be 25 characters
// or more (a shorter one only when it carries a figure of the claim), and carry every figure the claim states.
export function quoteProblem(quote, claim, passages) {
  const q = norm(quote);
  if (!q) return 'no quote';
  if (!passages.some((p) => norm(p).includes(q))) return 'the quote is not in the passages';
  const figures = numbersOf(claim); const inQuote = new Set(numbersOf(q));
  if (q.length < MIN_QUOTE && !figures.some((n) => inQuote.has(n))) return 'the quote is too short to prove anything';
  const missing = figures.filter((n) => !inQuote.has(n));
  if (missing.length) return 'the quote does not carry the figure' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ');
  return null;
}

// The whole page is read (a standard or a report runs to 250 000 characters); the passages do the narrowing.
export async function verifyClaim({ claim, url, ask, fetchPage = (u) => readPage(u, { maxChars: 400000 }) }) {
  const page = await fetchPage(url);
  if (!page.ok) return { claim, url, verdict: 'source-unreachable', color: 'red', detail: page.error || 'page unreadable' };
  const passages = relevantPassages(page.text, claim);
  if (!passages.length) return { claim, url, verdict: 'unsupported', color: 'red', detail: 'no passage of the cited page matches the claim' };
  const r = await ask([
    { role: 'system', content: VERIFY_PROMPT },
    { role: 'user', content: JSON.stringify({ claim, passages }) },
  ], { max_tokens: 1000, tag: 'verify' });
  const j = readJson(r.text) || {};
  const verdict = ['supported', 'unsupported', 'contradicted'].includes(j.verdict) ? j.verdict : 'unsupported';
  // A "supported" verdict must come with a quote that really proves it, otherwise it is not trusted.
  const problem = verdict === 'supported' ? quoteProblem(j.quote, claim, passages) : null;
  const final = problem ? 'unsupported' : verdict;
  // On a red verdict, the closest passage goes back to the writer: the fix is usually to say what the page says (SHOULD, not SHALL).
  const detail = final === 'supported' ? j.quote : (problem ? problem + '; ' : '') + 'nearest passages: ' + passages.slice(0, 3).map((p) => '"' + p.slice(0, 220) + '"').join(' ');
  return { claim, url, verdict: final, color: final === 'supported' ? 'green' : 'red', detail };
}

// `cache` (a Map, one per run): the same claim against the same page gives the same verdict, so it is checked once;
// the pages read are kept next to that Map (not in it: run.js counts its keys as verdicts), so a page cited by ten
// claims is downloaded once in the run. Without a cache, pages are still shared within one report.
const PAGES = new WeakMap();
export async function verifyReport({ items, ask, fetchPage, cache = null }) {
  let pages = cache ? PAGES.get(cache) : null;
  if (!pages) { pages = new Map(); if (cache) PAGES.set(cache, pages); }
  const read = fetchPage || ((u) => readPage(u, { maxChars: 400000 }));
  const cachedFetch = (u) => { if (!pages.has(u)) pages.set(u, Promise.resolve().then(() => read(u))); return pages.get(u); };
  const results = [];
  for (const it of items) {
    const key = `${it.url}\n${String(it.claim || '').trim().toLowerCase()}`;
    if (cache?.has(key)) { results.push({ ...cache.get(key), cached: true }); continue; }
    const r = await verifyClaim({ claim: it.claim, url: it.url, ask, fetchPage: cachedFetch });
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
