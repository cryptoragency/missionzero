// Final answer: the model writes it, but every cited source is CHECKED against what Mission Zero Zero actually saw.
import { readJson } from './loop.js';

export function seenUrls(evidence) {
  const seen = new Map();
  for (const p of evidence) {
    if (p.step !== 'observation') continue;
    for (const r of p.obs?.results || []) if (r.url) seen.set(r.url, r);
  }
  return seen;
}

export async function synthesize({ goal, evidence, ask }) {
  const seen = seenUrls(evidence);
  const sources = [...seen.values()].map((r) => ({ url: r.url, title: r.title, snippet: r.snippet }));
  const r = await ask([
    { role: 'system', content: 'Write the final answer in English. Cite ONLY URLs from the provided list, copied exactly. Answer in JSON: {"answer":"","sources":[{"url":"","contribution":""}],"confidence":0-10,"uncertainties":[""]}.' },
    { role: 'user', content: JSON.stringify({ goal, seenSources: sources, lessons: evidence.filter((p) => p.step === 'evaluation').map((p) => p.lesson) }) },
  ], { max_tokens: 6000 });
  const j = readJson(r.text) || { answer: '', sources: [], confidence: 0, uncertainties: ['unreadable synthesis'] };
  const cited = Array.isArray(j.sources) ? j.sources : [];
  const verified = cited.filter((s) => seen.has(s.url));
  return { ...j, sources: verified, rejectedSources: cited.length - verified.length, seenSources: sources.length };
}
