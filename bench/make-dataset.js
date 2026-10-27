// Builds a test set with KNOWN answers from Wikipedia: true claims, altered numbers, wrong sources, invented links.
// Usage: node bench/make-dataset.js  ->  bench/dataset.json
import { writeFileSync } from 'node:fs';

const TITLES = ['Artificial_intelligence', 'Cloud_computing', 'General_Data_Protection_Regulation', 'ISO/IEC_27001', 'Machine_learning', 'Computer_security', 'Blockchain', 'Internet_of_things', 'Large_language_model', 'Big_data', 'Edge_computing', 'Data_center'];
const API = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Polite fetch: one request every 2 seconds, retry with a longer pause when the API says "too many requests".
async function plain(title) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await sleep(2000 * attempt);
    const r = await fetch(API + encodeURIComponent(title), { headers: { 'user-agent': 'MissionZeroBench/0.1 (hackathon test set; contact via cryptor.agency)' } });
    const body = await r.text();
    try { return Object.values(JSON.parse(body).query.pages)[0].extract || ''; } catch { /* rate limited, try again */ }
  }
  return '';
}

// A good test sentence: medium length, one clear number, no formulas or parentheses.
function pick(text) {
  const sentences = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z])/);
  return sentences.find((s) => s.length > 70 && s.length < 230 && /\b\d{2,4}\b/.test(s) && !/[()=\[\]]/.test(s));
}
const alter = (s) => s.replace(/\b(\d{2,4})\b/, (n) => String(Number(n) * 3 + 11));
const wiki = (t) => 'https://en.wikipedia.org/wiki/' + t;

const items = [];
const sentences = [];
for (const t of TITLES) { const s = pick(await plain(t)); if (s) sentences.push({ t, s }); }
sentences.forEach(({ t, s }, i) => {
  const other = sentences[(i + 1) % sentences.length].t;
  items.push({ id: t + ':true', kind: 'good', claim: s, url: wiki(t) });
  items.push({ id: t + ':altered', kind: 'bad', why: 'altered number', claim: alter(s), url: wiki(t) });
  items.push({ id: t + ':wrong-source', kind: 'bad', why: 'real claim, wrong source', claim: s, url: wiki(other) });
  items.push({ id: t + ':invented', kind: 'bad', why: 'invented link', claim: s, url: wiki(t + '_Institute_Report_2024') });
});
writeFileSync('bench/dataset.json', JSON.stringify(items, null, 2));
console.log(sentences.length + ' articles, ' + items.length + ' test items (' + items.filter((i) => i.kind === 'good').length + ' good, ' + items.filter((i) => i.kind === 'bad').length + ' bad)');
