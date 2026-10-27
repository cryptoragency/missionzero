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
