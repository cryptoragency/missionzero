import test from 'node:test';
import assert from 'node:assert/strict';
import { readPage } from './tools.js';

// A one-page PDF built by hand: the text "Small businesses: 43 percent were attacked in 2019 according to the study." plus padding.
function tinyPdf(text) {
  const lines = String(text).match(/.{1,60}(s|$)/g).map((l) => l.trim());
  const stream = 'BT /F1 12 Tf 40 700 Td ' + lines.map((l, i) => `${i ? '0 -14 Td ' : ''}(${l}) Tj`).join(' ') + ' ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

test('readPage reads the text of a PDF report', async () => {
  const sentence = 'Small businesses: 43 percent were attacked in 2019 according to the study, which surveyed 4000 firms across 11 countries and reported the figure with its definition and year.';
  const body = tinyPdf(sentence + ' ' + sentence);
  const fetchFn = async () => new Response(body, { status: 200, headers: { 'content-type': 'application/pdf' } });
  const r = await readPage('https://primary.example/report.pdf', { fetchFn });
  assert.equal(r.ok, true);
  assert.match(r.text, /43 percent were attacked in 2019/);
  assert.equal(r.pdf.pages, 1);
});

test('a PDF larger than the cap is refused without being parsed', async () => {
  const fetchFn = async () => new Response(Buffer.alloc(26 * 1024 * 1024), { status: 200, headers: { 'content-type': 'application/pdf' } });
  const r = await readPage('https://primary.example/huge.pdf', { fetchFn });
  assert.equal(r.ok, false);
  assert.match(r.error, /too large/);
});

test('a long report comes back as the passages matching what the planner wants to find, numbers first', async () => {
  const { readForGoal } = await import('./tools.js');
  const { relevantPassages } = await import('./passages.js');
  const filler = Array.from({ length: 300 }, (_, i) => `Chapter ${i} discusses governance practices and the role of leadership in security culture programs.`).join(' ');
  const key = 'This year, the DBIR team analyzed 22,052 real-world security incidents, of which 12,195 were confirmed data breaches.';
  const human = 'The human element was involved in approximately 60% of breaches this year, similar to last year.';
  const page = filler.slice(0, 8000) + '\n' + key + '\n' + filler.slice(8000) + '\n' + human;
  const fetchFn = async () => new Response(page, { status: 200, headers: { 'content-type': 'text/html' } });
  const r = await readForGoal('https://p.example/report', 'how many breaches were analyzed and what share involved the human element', { fetchFn, find: 'confirmed breaches analyzed, human element share' });
  assert.ok(r.text.includes('12,195'));
  assert.ok(r.text.includes('60%'));
  assert.ok(r.text.length <= 6000);
  // the number boost: with a counting query, the sentence carrying the figure ranks above a wordy one without figures
  const [first] = relevantPassages('Breaches analyzed by the team were many and varied in nature across sectors. The team analyzed 12,195 breaches.', 'how many breaches analyzed', 2);
  assert.match(first, /12,195/);
});

test('a run-on table row that repeats the words does not outrank the one normative sentence with the figure', async () => {
  const { relevantPassages } = await import('./passages.js');
  const row = 'Summary of secrets Type of Secret Purpose Password A subscriber-chosen secret used as an authentication factor secret secret verifier verifier ' + 'memorized secret length characters '.repeat(40);
  const norm = 'Verifiers and CSPs SHALL require passwords that are used as a single-factor authentication mechanism to be a minimum of 15 characters in length.';
  const [first] = relevantPassages(row + '\n' + norm, 'Verifiers SHALL require user-chosen memorized secrets to be at least 15 characters in length when used as a single-factor authenticator', 2);
  assert.match(first, /minimum of 15 characters/);
});

test('an EUR-Lex address is read from the Publications Office, and a bot challenge is reported, not swallowed', async () => {
  const { officialMirror, readPage } = await import('./tools.js');
  assert.equal(officialMirror('https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng'), 'http://publications.europa.eu/resource/celex/32016R0679');
  assert.equal(officialMirror('https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555'), 'http://publications.europa.eu/resource/celex/32022L2555');
  assert.equal(officialMirror('https://www.verizon.com/dbir.pdf'), null);
  const challenge = async () => new Response('<html><script>window.awsWafCookieDomainList = []; window.gokuProps = {}</script></html>', { status: 202, headers: { 'content-type': 'text/html' } });
  const r = await readPage('https://blocked.example/page', { fetchFn: challenge });
  assert.equal(r.ok, false);
  assert.match(r.error, /bot challenge/);
  const { normalizeNumbers } = await import('./passages.js');
  assert.equal(normalizeNumbers('a minimum of eight characters, up to 20 000 000 EUR and 12,195 breaches'), 'a minimum of 8 characters, up to 20000000 eur and 12195 breaches');
});
