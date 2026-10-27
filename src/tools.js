// Actions Mission Zero can run by itself. None has a real-world effect:
// reading public pages and creating files in the evidence folder. Anything else needs a human approval.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export async function webSearch(query, { fetchFn = fetch, max = 8 } = {}) {
  const r = await fetchFn('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MissionZero/0.1)' } });
  if (!r.ok) return { ok: false, error: 'search ' + r.status };
  const html = await r.text();
  const blocks = html.split('class="result results_links').slice(1, max + 1);
  const results = blocks.map((b) => ({
    title: clean((b.match(/result__a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || ''),
    snippet: clean((b.match(/result__snippet[^>]*>([\s\S]*?)<\/a>/) || [])[1] || ''),
    url: decodeURIComponent(((b.match(/uddg=([^"&]+)/) || [])[1]) || ''),
  })).filter((x) => x.title);
  return { ok: results.length > 0, query, results };
}

export async function readPage(url, { fetchFn = fetch, maxChars = 6000 } = {}) {
  if (!/^https?:\/\//i.test(String(url || ''))) return { ok: false, error: 'invalid url' };
  try {
    const r = await fetchFn(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MissionZero/0.1)' }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return { ok: false, url, error: 'http ' + r.status };
    const type = r.headers.get('content-type') || '';
    if (!/text|html|json/i.test(type)) return { ok: false, url, error: 'not text: ' + type.slice(0, 40) };
    const raw = (await r.text()).slice(0, 400000);
    const text = clean(raw.replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')).slice(0, maxChars);
    return { ok: text.length > 200, url, text };
  } catch (e) { return { ok: false, url, error: String(e.message || e).slice(0, 80) }; }
}

export function createPage(name, html, folder = 'evidence') {
  mkdirSync(folder, { recursive: true });
  const file = join(folder, String(name).replace(/[^a-z0-9_-]/gi, '_') + '.html');
  writeFileSync(file, String(html));
  return { ok: true, file, bytes: Buffer.byteLength(String(html)) };
}

export function makeExecutor({ folder = 'evidence', fetchFn = fetch } = {}) {
  return async (action) => {
    const t = String(action.type || '').toLowerCase();
    if (t.includes('read')) return readPage(action.url);
    if (t.includes('search')) return webSearch(action.query || action.detail, { fetchFn });
    if (t.includes('page') || t.includes('prototype')) return createPage(action.name || 'prototype', action.content || action.detail, folder);
    return { ok: false, error: 'unknown action: ' + action.type + ' (allowed: web_search, read_page, create_page)' };
  };
}
