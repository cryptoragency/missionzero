// Vision on the demo shop: node --env-file=.env bench/run-vision.js [--site=demo-site] [--concept="credit card form"]
// Starts the site, screenshots the home and checkout pages headless, asks Muse Spark whether the pages still work for a
// customer, and asks SAM 3.1 to box the concept on the checkout page. Prints the verdicts and the cost.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '../src/meta.js';
import { freePort, startSite } from '../src/repair.js';
import { screenshotPages, lookAtPages, toDataUrl } from '../src/vision.js';
import { segment } from '../src/sam.js';
import { evidenceFolder } from '../src/evidenceDir.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const siteDir = arg('site', 'demo-site');
const concept = arg('concept', 'credit card form');
const folder = evidenceFolder('vision-');
mkdirSync(folder, { recursive: true });

const port = await freePort(); const site = await startSite(siteDir, port);
let shots;
try { shots = await screenshotPages('http://127.0.0.1:' + port, [{ name: 'home', path: '/' }, { name: 'checkout', path: '/checkout' }], folder); } finally { site.stop(); }
console.log('screenshots:', shots.map((s) => s.path).join(', '));

const client = createClient();
const look = await lookAtPages({ shots, ask: client.ask });
console.log('muse-spark sees:', JSON.stringify(look));
const t0 = Date.now();
const sam = await segment({ dataUrl: toDataUrl(shots[1].path), concept });
console.log(`sam-3.1 "${concept}" on checkout:`, sam.boxes.length, 'box(es)', JSON.stringify(sam.boxes), 'in', ((Date.now() - t0) / 1000).toFixed(1), 's', 'usage', JSON.stringify(sam.usage || {}));
writeFileSync(join(folder, 'vision.json'), JSON.stringify({ shots, look, sam, cost: client.counter }, null, 2));
console.log('muse-spark cost', client.counter.usd.toFixed(4), '$ ·', folder);
