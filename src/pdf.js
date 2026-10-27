// PDF reader: the primary reports Mission Zero needs (Verizon DBIR, Hiscox, Ponemon...) are PDFs, not web pages.
// Text only, first pages first, hard caps on size and page count so one report never eats the budget or the memory.
import { fileURLToPath } from 'node:url';
export const PDF_MAX_BYTES = 25 * 1024 * 1024;
export const PDF_MAX_PAGES = 150;

export async function pdfToText(bytes, { maxPages = PDF_MAX_PAGES, maxChars = 60000 } = {}) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const standardFontDataUrl = fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)) + '/'; // pdf.js wants a trailing slash
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl, disableFontFace: true, isEvalSupported: false, useSystemFonts: false });
  const doc = await task.promise;
  const pages = Math.min(doc.numPages, maxPages);
  let out = '';
  try {
    for (let p = 1; p <= pages && out.length < maxChars; p += 1) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ') + '\n';
    }
  } finally { await task.destroy(); }
  return { text: out.slice(0, maxChars), pages: doc.numPages, pagesRead: pages };
}
