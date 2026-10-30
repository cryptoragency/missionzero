// Enregistre film-v4.html en headless (1280x720) : captures d'étapes puis vidéo complète (?record=1&auto=1).
const pw = require('C:/gui/cryptor.agency/agence/node_modules/playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[2]; const file = 'file:///' + path.resolve('video/film-v4.html').split(path.sep).join('/');
(async () => {
  const b = await pw.chromium.launch({ headless: true });
  // Captures à des instants du film (secondes), en jouant pour de vrai.
  const p0 = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p0.on('pageerror', (e) => console.log('pageerror', e.message));
  await p0.goto(file + '?record=1&auto=1');
  const marks = [36, 42, 47, 53, 62, 100, 115]; let t = 0;
  for (const m of marks) { await p0.waitForTimeout((m - t) * 1000); t = m; await p0.screenshot({ path: path.join(out, 'v3-' + String(m).padStart(3, '0') + 's.png') }); }
  await p0.close();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage(); await p.goto(file + '?record=1&auto=1');
  await p.waitForFunction(() => document.getElementById('clock').textContent.startsWith('fin'), null, { timeout: 240000 });
  const total = await p.evaluate(() => document.getElementById('clock').textContent);
  await p.waitForTimeout(1500); const v = p.video(); await ctx.close(); const vp = await v.path(); await b.close();
  fs.renameSync(vp, path.join(out, 'film-v4.webm')); console.log('webm ok', total);
})().catch((e) => { console.error(e); process.exit(1); });
