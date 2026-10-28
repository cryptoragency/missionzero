// Vision: Muse Spark looks at a page the way a customer does. After a fix passes the HTTP journeys, a screenshot of the
// repaired copy is shown to the model: a blank page, an error text or a vanished product grid would pass an HTTP
// assertion and fail a human. Images go as base64 data URLs on /v1/chat/completions (image_url content part).
import { readFileSync } from 'node:fs';
import { readJson } from './loop.js';

export const toDataUrl = (path, type = 'image/png') => `data:${type};base64,${readFileSync(path).toString('base64')}`;

const LOOK_PROMPT = 'You check screenshots of a small online shop after a security fix. Answer from what is VISIBLE only. '
  + 'JSON: {"ok":true|false,"problems":["..."],"seen":["at most 4 short items"]}. "ok" is false if the page is blank, '
  + 'shows an error or stack trace, lost its product cards, its forms or its navigation, or shows raw code. Minor styling is fine. A page that now says access denied, forbidden, not found or asks to log in is NOT a problem when the fix restricts access: judge the shop by its other pages.';

// `ask` is the Meta client's ask (messages, opts). Content parts carry the text and the image(s).
export async function lookAtPages({ shots, ask, question = 'Is this page still a working shop page for a customer?' }) {
  const content = [{ type: 'text', text: question + ' Pages: ' + shots.map((s) => s.name).join(', ') + '.' }];
  for (const s of shots) {
    content.push({ type: 'text', text: 'Page: ' + s.name });
    content.push({ type: 'image_url', image_url: { url: s.dataUrl || toDataUrl(s.path) } });
  }
  const r = await ask([{ role: 'system', content: LOOK_PROMPT }, { role: 'user', content }], { max_tokens: 3000, tag: 'vision' });
  const j = readJson(r.text) || {};
  return { ok: j.ok === true, unreadable: j.ok === undefined, problems: Array.isArray(j.problems) ? j.problems.map(String) : [], seen: Array.isArray(j.seen) ? j.seen.map(String) : [], raw: j.ok === undefined ? String(r.text).slice(0, 300) : undefined };
}

// Screenshots of a running site, headless (Playwright from the path in MZ_PLAYWRIGHT, or the package if installed).
export async function screenshotPages(baseUrl, pages, outDir, { playwrightPath = process.env.MZ_PLAYWRIGHT || 'playwright', width = 1280, height = 800 } = {}) {
  const { mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  const { chromium } = req(playwrightPath);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const shots = [];
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    for (const p of pages) {
      const path = join(outDir, p.name.replace(/[^a-z0-9]+/gi, '-') + '.png');
      await page.goto(baseUrl + p.path, { waitUntil: 'load', timeout: 15000 });
      await page.screenshot({ path, fullPage: false });
      shots.push({ name: p.name, path });
    }
  } finally { await browser.close(); }
  return shots;
}
