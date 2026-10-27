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
