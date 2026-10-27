// Captures every scene of a replay page, headless. node video/shots.cjs <replay.html> <outDir>
const { chromium } = require('C:/gui/cryptor.agency/agence/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const file = process.argv[2]; const outDir = process.argv[3];
  const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('file:///' + file.split('\\').join('/') + '?auto=0');
  const n = await p.evaluate(() => window.MZ.scenes);
  for (let i = 0; i < n; i += 1) { await p.evaluate((k) => window.MZ.play(k), i); await p.waitForTimeout(2800); await p.screenshot({ path: outDir + '/scene-' + i + '.png' }); }
  console.log('scenes', n, 'errors', JSON.stringify(errors));
  await b.close();
})();
