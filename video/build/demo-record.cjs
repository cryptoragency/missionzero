// Enregistre la démo page par page (video/demo/demo.html) image par image, sans fenêtre, puis assemble un MP4 par exemple.
//   node video/build/demo-record.cjs [--ex=espace,stress]   (anssi retiré par le gérant le 31/10) [--lang=fr] [--fps=12.5] [--apercu]
//   --apercu : 6 images clés par exemple seulement (dans le dossier de sortie), pas de MP4.
// Sortie : C:\Users\GAME\Desktop\demo-mz-2026-10-31\demo-<exemple>-<langue>.mp4 (+ cle-<exemple>-<langue>-XX.Xs.png)
const pw = require('C:/gui/cryptor.agency/agence/node_modules/playwright');
const path = require('path'); const fs = require('fs'); const { execFileSync } = require('child_process');
const FF = 'C:/Users/GAME/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const OUT = 'C:/Users/GAME/Desktop/demo-mz-2026-10-31'; const FRAMES = 'C:/gui/mission-zero/video/demo/frames';
const PAGE = 'file:///C:/gui/mission-zero/video/demo/demo.html';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const EXS = arg('ex', 'espace,labo').split(','); const LANG = arg('lang', 'fr'); const FPS = Number(arg('fps', 12.5));
const APERCU = process.argv.includes('--apercu');

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(FRAMES, { recursive: true });
  const b = await pw.chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
  for (const ex of EXS) {
    await p.goto(PAGE + '?ex=' + ex + '&lang=' + LANG, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__demo && window.__demo.total > 0);
    await p.waitForTimeout(400); // la police
    const info = await p.evaluate(() => ({ total: window.__demo.total, starts: window.__demo.starts }));
    for (const f of fs.readdirSync(FRAMES)) fs.unlinkSync(path.join(FRAMES, f));
    const t0 = Date.now();
    if (APERCU) {
      const s = info.starts; const keys = [s[0] + 4, s[0] + 12, s[1] + 5, s[1] + 14, s[2] + 10, s[2] + 16];
      for (const t of keys) { await p.evaluate((q) => window.__demo.seek(q), t); await p.screenshot({ path: path.join(OUT, 'cle-' + ex + '-' + LANG + '-' + t.toFixed(1).padStart(4, '0') + 's.png') }); }
      console.log(ex, LANG, 'durée', info.total.toFixed(1), 's · 6 images clés');
      continue;
    }
    const n = Math.round(info.total * FPS);
    for (let i = 0; i < n; i++) { await p.evaluate((q) => window.__demo.seek(q), i / FPS); await p.screenshot({ path: path.join(FRAMES, 'f' + String(i).padStart(4, '0') + '.png') }); }
    const mp4 = path.join(OUT, 'demo-' + ex + '-' + LANG + '.mp4');
    execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', 'f%04d.png', '-r', '25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', mp4], { cwd: FRAMES, stdio: ['ignore', 'inherit', 'inherit'] });
    console.log(ex, LANG, n, 'images en', Math.round((Date.now() - t0) / 1000), 's →', mp4, Math.round(fs.statSync(mp4).size / 1024), 'Ko', '(' + info.total.toFixed(1) + ' s)');
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
