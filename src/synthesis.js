// Final answer: the model writes it, but every cited source is CHECKED against what Mission Zero actually saw.
import { readJson } from './loop.js';

export function seenUrls(evidence) {
  const seen = new Map();
  for (const p of evidence) {
    if (p.step !== 'observation') continue;
    for (const r of p.obs?.results || []) if (r.url) seen.set(r.url, r);
    if (p.obs?.url && p.obs?.text) seen.set(p.obs.url, { url: p.obs.url, title: 'page read in full', snippet: p.obs.text.slice(0, 700) });
  }
  return seen;
}

export async function synthesize({ goal, evidence, ask }) {
  const seen = seenUrls(evidence);
  const sources = [...seen.values()].map((r) => ({ url: r.url, title: r.title, snippet: r.snippet }));
  const r = await ask([
    { role: 'system', content: 'Write the final answer in English. Cite ONLY URLs from the provided list, copied exactly. '
      + 'For each source, "contribution" is the FACT that page supports, with its figure, close to the page\'s own words (e.g. "12,195 confirmed breaches were analyzed"), never a description of the source. '
      + 'ONE FIGURE PER CONTRIBUTION: several figures from the same page make several entries with the same url, each verified on its own. '
      + 'Use ONLY facts present in seenSources. Every figure in "answer" must also appear in one "contribution". '
      + 'Answer in JSON: {"answer":"","sources":[{"url":"","contribution":""}],"confidence":7,"uncertainties":[""]}.' },
    { role: 'user', content: JSON.stringify({ goal, seenSources: sources, lessons: evidence.filter((p) => p.step === 'evaluation').map((p) => p.lesson) }) },
  ], { max_tokens: 5000, tag: 'synthesize' }); // reasoning is billed inside the cap
  const j = readJson(r.text) || { answer: '', sources: [], confidence: 0, uncertainties: ['unreadable synthesis'] };
  const cited = Array.isArray(j.sources) ? j.sources : [];
  const verified = cited.filter((s) => seen.has(s.url));
  return { ...j, sources: verified, rejectedSources: cited.length - verified.length, seenSources: sources.length };
}
