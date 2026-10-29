// Version papier du script : la page HTML du script, rendue en PDF A4 (thème clair), headless. node video/make-script-pdf.cjs
const { chromium } = require('C:/gui/cryptor.agency/agence/node_modules/playwright');
const { resolve } = require('node:path');
(async () => {
  const src = resolve(__dirname, 'script-film-2026-10-29.html');
  const out = resolve(__dirname, 'script-film-2026-10-29.pdf');
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('file:///' + src.split('\\').join('/'));
  await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
  await p.addStyleTag({ content: '@page { size: A4; margin: 14mm 12mm; } body { font-size: 11pt; padding: 0; } .tw { overflow: visible; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } h2 { page-break-after: avoid; } table.scene td:first-child { width: 20%; } table.scene td.fr { width: 42%; }' });
  await p.waitForTimeout(800);
  await p.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: '<div style="font-size:8px;color:#888;width:100%;text-align:center;font-family:sans-serif">Mission Zero, le film · script du 29 octobre 2026 · page <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  await b.close();
  console.log('pdf', out);
})();
