// Enregistre film-v4.html en headless (1280x720) : captures d'étapes puis vidéo complète (?record=1&auto=1).
const pw = require('C:/gui/cryptor.agency/agence/node_modules/playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[2]; const file = 'file:///' + path.resolve('video/film-v4.html').split(path.sep).join('/');
(async () => {
  const b = await pw.chromium.launch({ headless: true });
  // Captures à des instants du film (secondes), en jouant pour de vrai.
  // --video-seule : saute la série de captures (déjà faite) et n'enregistre que la vidéo.
  if (!process.argv.includes('--video-seule')) {
  const p0 = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p0.on('pageerror', (e) => console.log('pageerror', e.message));
  await p0.goto(file + '?record=1&auto=1'); const t0 = Date.now();
  // Instants utiles (s), sur toute la durée (276 s) : boucle (fil + point, division, zooms, alerte, repassages avec pulsation,
  // rétrécissement, sortie), écran des choix (entrée sans coupure, éventail), boutique, correction, ARGUS, puis l'horloge de fin.
  const marks = [3.2, 4.5, 6.2, 19, 26, 29.5, 31.3, 33, 35.5, 37.3, 39, 42, 44.2, 46.5, 48.8, 49.6, 51.5, 55, 60, 64.5,
    66, 70, 75, 80, 86, 92, 100, 110.5, 112.5, 115, 119.5, 122.5, 124.5, 127.5, 136, 146, 152, 158,
    // lot 2 : sortie d'ARGUS, choix (sécurité prouvée → l'espace), l'espace, choix (espace prouvé → la médecine), la médecine, la fin
    160.8, 162, 166, 170.5, 172.5, 176, 181, 186, 192, 198, 203, 207.5, 209.5, 214, 219, 221, 226, 231, 236, 241, 246, 251, 256, 259.5, 261.5, 263, 265.5, 268, 271, 275];
  for (const m of marks) { const w = t0 + m * 1000 - Date.now(); if (w > 0) await p0.waitForTimeout(w); await p0.screenshot({ path: path.join(out, 'v3-' + String(m.toFixed(1)).padStart(5, '0') + 's.png') }); }
  // L'horloge « fin · N s » : la barre du film est masquée en mode enregistrement, on la réaffiche pour la capture finale.
  await p0.waitForFunction(() => document.getElementById('clock').textContent.startsWith('fin'), null, { timeout: 480000 });
  await p0.addStyleTag({ content: '.record .filmbar { display:flex !important; }' }); await p0.screenshot({ path: path.join(out, 'v3-fin-horloge.png') });
  console.log('captures', await p0.evaluate(() => document.getElementById('clock').textContent));
  await p0.close();
  }
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage(); await p.goto(file + '?record=1&auto=1');
  await p.waitForFunction(() => document.getElementById('clock').textContent.startsWith('fin'), null, { timeout: 480000 });
  const total = await p.evaluate(() => document.getElementById('clock').textContent);
  await p.waitForTimeout(1500); const v = p.video(); await ctx.close(); const vp = await v.path(); await b.close();
  fs.renameSync(vp, path.join(out, 'film-v4.webm')); console.log('webm ok', total);
})().catch((e) => { console.error(e); process.exit(1); });
