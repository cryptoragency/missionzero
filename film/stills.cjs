// Renders a handful of frames as PNG to look at the film without a window: node stills.cjs [frame,frame,...]
const path = require('path');
const fs = require('fs');
const { bundle } = require('@remotion/bundler');
const { renderStill, selectComposition } = require('@remotion/renderer');

(async () => {
  const frames = (process.argv[2] || '60,330,520,570,650,740,800,880,1100,1300,1600,1760,1950,2180').split(',').map(Number);
  const out = path.join(__dirname, 'out', 'stills'); fs.mkdirSync(out, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(__dirname, 'src', 'index.ts'), onProgress: () => {} });
  const composition = await selectComposition({ serveUrl, id: 'MissionZero' });
  for (const f of frames) {
    await renderStill({ composition, serveUrl, frame: f, output: path.join(out, `f${String(f).padStart(5, '0')}.png`), scale: 0.5, chromiumOptions: { headless: true } });
    console.log('still', f);
  }
  console.log('done', composition.durationInFrames, 'frames');
})().catch((e) => { console.error(e); process.exit(1); });
