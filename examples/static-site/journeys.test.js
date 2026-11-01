// The vital journeys of the site: what a visitor must always be able to do. A fix that breaks one is rejected.
// Edit TITLE, PAGES and APIS for your site. The policy (CSP) is read as a browser reads it: a missing directive falls back to default-src.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handle } from './server.js';

const TITLE = 'Example Studio'; // a text every page of the site shows
const PAGES = ['/'];            // the pages a visitor must reach
const APIS = [];                // the origins the page sends data to (forms, chat), e.g. 'https://api.example.org'

const csp = (h) => Object.fromEntries(String(h['content-security-policy'] || '').split(';').map((s) => s.trim().split(/\s+/)).filter((p) => p[0]).map((p) => [p[0].toLowerCase(), p.slice(1)]));
const rule = (pol, d) => pol[d] || pol['default-src'] || null; // null: nothing restricts it
const home = () => handle('GET', '/');
const inline = (b) => [...b.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const allowsInline = (src, code) => !src || (src.includes("'unsafe-inline'") && !src.some((s) => /^'(sha\d+|nonce)-/.test(s))) || src.includes(`'sha256-${createHash('sha256').update(code).digest('base64')}'`);
const allowsHost = (src, origin) => !src || src.includes('*') || src.includes('https:') || src.includes(origin);

export const JOURNEYS = [
  { name: 'reach every page', run: () => { for (const p of PAGES) { const [c, h, b] = handle('GET', p); assert.equal(c, 200, p); assert.match(h['content-type'], /text\/html/); assert.ok(b.includes(TITLE), p); } } },
  { name: 'load every script of the page', run: () => { const [, , b] = home(); for (const s of [...b.matchAll(/<script[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1]).filter((s) => !/^https?:/.test(s))) { const [c, h] = handle('GET', '/' + s.replace(/^\//, '')); assert.equal(c, 200, s); assert.match(h['content-type'], /javascript/, s); } } },
  { name: 'the page scripts still run', run: () => { const [, h, b] = home(); const src = rule(csp(h), 'script-src'); if (src) assert.ok(src.includes("'self'")); for (const code of inline(b)) assert.ok(allowsInline(src, code), 'an inline script is blocked by script-src'); } },
  { name: 'the page styles still apply', run: () => { const [, h, b] = home(); const src = rule(csp(h), 'style-src'); if (src && /<style|style="/.test(b)) assert.ok(src.includes("'unsafe-inline'"), 'the page has inline styles'); } },
  { name: 'images and fonts still load', run: () => { const [, h] = home(); for (const d of ['img-src', 'font-src']) { const src = rule(csp(h), d); if (src) assert.ok(src.includes("'self'"), d); } } },
  { name: 'forms reach their APIs', run: () => { const [, h] = home(); for (const o of APIS) assert.ok(allowsHost(rule(csp(h), 'connect-src'), o), 'connect-src blocks ' + o); } },
  { name: 'many visitors open the site at the same time', run: () => { for (let i = 1; i <= 60; i++) assert.equal(handle('GET', '/', '', { 'x-real-ip': '203.0.113.' + i })[0], 200, 'visitor ' + i + ' refused: a limit counts per visitor, never for all of them'); } },
  // One visitor reads the site as a person does: ten pages, each with all its scripts, within a minute.
  { name: 'one visitor browses ten pages', run: () => { const ip = { 'x-real-ip': '198.51.100.7' }; for (let n = 1; n <= 10; n++) { const [c, , b] = handle('GET', '/', '', ip); assert.equal(c, 200, 'page ' + n + ' refused'); for (const s of [...b.matchAll(/<script[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1]).filter((s) => !/^https?:/.test(s))) assert.equal(handle('GET', '/' + s.replace(/^\//, ''), '', ip)[0], 200, 'page ' + n + ': ' + s + ' refused: a limit must let one visitor browse normally'); } } },
];

for (const j of JOURNEYS) test('journey: ' + j.name, () => j.run());
