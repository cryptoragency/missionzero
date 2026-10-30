// Actions Mission Zero can run by itself. None has a real-world effect:
// reading public pages and creating files in the evidence folder. Anything else needs a human approval.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { pdfToText, PDF_MAX_BYTES } from './pdf.js';
import { relevantPassages } from './passages.js';

const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

// The address a page names comes from the model, the search results or a redirect: it can point at this machine or its
// network (127.0.0.1, 169.254.169.254, a router). Every address, and every redirect hop, is resolved and refused when it
// lands on a non-public IP. MZ_ALLOW_LOCAL=1 lets through this machine only (127.0.0.1, ::1, localhost: a local test
// site), never the link-local or private network; the scanner and the repair mode test local sites with their own fetch.
// An IPv6 address as its eight 16-bit groups ("::" expanded, a dotted IPv4 tail turned into two groups).
function groups6(a) {
  let s = a;
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) { const [p, q, r, t] = v4[1].split('.').map(Number); s = s.slice(0, -v4[1].length) + ((p << 8) | q).toString(16) + ':' + ((r << 8) | t).toString(16); }
  const [head, tail] = s.split('::');
  const h = head ? head.split(':') : []; const t = tail !== undefined ? (tail ? tail.split(':') : []) : null;
  const all = t === null ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t];
  return all.map((g) => parseInt(g, 16));
}
export function isPrivateAddress(ip) {
  let a = String(ip || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(a) === 6) {
    const g = groups6(a);
    // ::ffff:a.b.c.d is an IPv4 address: judged as one.
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) a = [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join('.');
    else {
      return g.every((x) => x === 0) || (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) // :: and ::1
        || (g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0 || (g[0] & 0xff00) === 0xff00 // unique local, link-local, site-local, multicast
        || (g[0] === 0x64 && g[1] === 0xff9b) // NAT64 (64:ff9b::/96 and the local-use 64:ff9b:1::/48): an IPv4 behind, any IPv4
        || g[0] === 0x2002; // 6to4: an IPv4 address inside, private ones included
    }
  }
  if (isIP(a) === 4) {
    const [x, y, z] = a.split('.').map(Number);
    return x === 0 || x === 10 || x === 127 || (x === 169 && y === 254) || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168)
      || (x === 100 && y >= 64 && y <= 127) || x >= 224 // shared (CGNAT), multicast and reserved ranges are not the public web either
      || (x === 192 && y === 0 && (z === 0 || z === 2)) || (x === 198 && (y === 18 || y === 19)); // IETF protocol, TEST-NET-1, benchmarking
  }
  return true; // not an IP at all: refused
}
const THIS_MACHINE = new Set(['127.0.0.1', '::1', 'localhost']);
const lookupAll = async (host) => (await dnsLookup(host, { all: true, verbatim: true })).map((x) => x.address);

// { ok: true } or { ok: false, why }. `lookup` = null skips the name resolution (tests that name hosts nobody resolves).
export async function checkUrl(url, { lookup = lookupAll, allowLocal = process.env.MZ_ALLOW_LOCAL === '1' } = {}) {
  let u; try { u = new URL(String(url)); } catch { return { ok: false, why: 'invalid url' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, why: 'scheme not allowed: ' + u.protocol };
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (allowLocal && THIS_MACHINE.has(host.toLowerCase())) return { ok: true };
  if (/^localhost$|\.localhost$/i.test(host)) return { ok: false, why: 'refused: ' + host + ' is this machine' };
  if (isIP(host)) return isPrivateAddress(host) ? { ok: false, why: 'refused: ' + host + ' is not a public address' } : { ok: true };
  if (!lookup) return { ok: true };
  let ips; try { ips = await lookup(host); } catch (e) { return { ok: false, why: 'dns: ' + host + ' does not resolve (' + (e.code || e.message) + ')' }; }
  const bad = (ips || []).find(isPrivateAddress);
  if (!ips?.length || bad) return { ok: false, why: 'refused: ' + host + ' resolves to ' + (bad || 'nothing') + ', not a public address' };
  return { ok: true };
}

// fetch with the address checked, redirects followed by hand (max 5, each hop checked again) and one deadline for all.
const MAX_REDIRECTS = 5;
export async function safeFetch(url, init = {}, { fetchFn = fetch, lookup, timeoutMs = 30000 } = {}) {
  // Names are resolved even with an injected fetch (it may well reach the network); only an explicit lookup: null skips it.
  const resolveNames = lookup !== undefined ? lookup : lookupAll;
  const signal = init.signal || AbortSignal.timeout(timeoutMs);
  let current = String(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const c = await checkUrl(current, { lookup: resolveNames });
    if (!c.ok) return { refused: c.why, url: current };
    const r = await fetchFn(current, { ...init, redirect: 'manual', signal });
    const location = r.status >= 300 && r.status < 400 ? r.headers?.get?.('location') : null;
    if (!location) return { response: r, url: current };
    r.body?.cancel?.().catch(() => {});
    current = new URL(location, current).href;
  }
  return { refused: 'more than ' + MAX_REDIRECTS + ' redirects', url: current };
}

// Reads a body with a byte counter: past `max` the stream is cancelled before anything is parsed.
// `truncate`: keep the first `max` bytes (a web page) instead of refusing (a PDF cut in the middle is unreadable).
export async function readBody(r, max, { truncate = false } = {}) {
  const declared = Number(r.headers?.get?.('content-length') || 0);
  if (declared > max && !truncate) { r.body?.cancel?.().catch(() => {}); return { tooLarge: true, bytes: declared }; }
  if (!r.body?.getReader) { const b = Buffer.from(await r.arrayBuffer()); return b.length > max ? (truncate ? { buf: b.subarray(0, max) } : { tooLarge: true, bytes: b.length }) : { buf: b }; }
  const reader = r.body.getReader(); const chunks = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength; chunks.push(value);
    if (n > max) { reader.cancel().catch(() => {}); if (!truncate) return { tooLarge: true, bytes: n }; break; }
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)));
  return { buf: buf.length > max ? buf.subarray(0, max) : buf };
}
export const HTML_MAX_BYTES = 1500000;

export async function webSearch(query, { fetchFn = fetch, max = 8, lookup } = {}) {
  const got = await safeFetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MissionZero/0.1)' } }, { fetchFn, lookup, timeoutMs: 20000 });
  if (got.refused) return { ok: false, error: 'search ' + got.refused };
  const r = got.response;
  if (!r.ok) return { ok: false, error: 'search ' + r.status };
  const html = (await readBody(r, HTML_MAX_BYTES, { truncate: true })).buf.toString('utf8');
  const blocks = html.split('class="result results_links').slice(1, max + 1);
  const results = blocks.map((b) => ({
    title: clean((b.match(/result__a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || ''),
    snippet: clean((b.match(/result__snippet[^>]*>([\s\S]*?)<\/a>/) || [])[1] || ''),
    url: decodeURIComponent(((b.match(/uddg=([^"&]+)/) || [])[1]) || ''),
  })).filter((x) => x.title);
  return { ok: results.length > 0, query, results };
}

// EUR-Lex sits behind a bot challenge. The same official text is served openly by the EU Publications Office (cellar),
// so an EUR-Lex address is read there: the citation stays EUR-Lex, the reading says where it came from.
const eliToCelex = (type, year, num) => `3${year}${{ reg: 'R', dir: 'L', dec: 'D' }[type] || 'R'}${String(num).padStart(4, '0')}`;
export function officialMirror(url) {
  const u = String(url || '');
  if (!/^https?:\/\/eur-lex\.europa\.eu\//i.test(u)) return null;
  const celex = (u.match(/CELEX(?::|%3A)(\w+)/i) || [])[1];
  if (celex) return `http://publications.europa.eu/resource/celex/${celex}`;
  const eli = u.match(/\/eli\/(reg|dir|dec)\/(\d{4})\/(\d+)/i);
  if (eli) return `http://publications.europa.eu/resource/celex/${eliToCelex(eli[1].toLowerCase(), eli[2], eli[3])}`;
  return null;
}
const BOT_CHALLENGE = /awsWafCookieDomainList|gokuProps|cf-challenge|_cf_chl_|Just a moment|Enable JavaScript and cookies to continue/i;

export async function readPage(url, { fetchFn = fetch, maxChars = 6000, lookup } = {}) {
  if (!/^https?:\/\//i.test(String(url || ''))) return { ok: false, error: 'invalid url' };
  try {
    const mirror = officialMirror(url);
    // The Publications Office negotiates on Accept: anything broader than XHTML returns the metadata notice instead of the text.
    const accept = mirror ? 'application/xhtml+xml,text/html' : 'text/html,application/xhtml+xml,application/pdf,*/*;q=0.8';
    const got = await safeFetch(mirror || url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MissionZero/0.1)', accept, 'accept-language': 'en' } }, { fetchFn, lookup, timeoutMs: 30000 });
    if (got.refused) return { ok: false, url, error: got.refused };
    const r = got.response;
    // The body of a 202 is read once, here: when it is not a challenge, that same text is the page (the stream is spent).
    let peeked = null;
    if (r.status === 202 || r.status === 403 || r.status === 429) {
      peeked = (await readBody(r, 200000, { truncate: true }).catch(() => ({ buf: Buffer.alloc(0) }))).buf;
      const peek = peeked.toString('utf8');
      if (BOT_CHALLENGE.test(peek) || r.status !== 202) return { ok: false, url, error: `blocked: bot challenge (http ${r.status}), a browser would be needed` };
    }
    if (!r.ok) { r.body?.cancel?.().catch(() => {}); return { ok: false, url, error: 'http ' + r.status }; }
    const type = r.headers.get('content-type') || '';
    if (/pdf/i.test(type) || /\.pdf(\?|$)/i.test(url)) {
      // A primary report is usually a PDF: read its text (first pages first, capped). Too large = refused before parsing.
      const b = peeked ? { buf: peeked } : await readBody(r, PDF_MAX_BYTES);
      if (b.tooLarge) return { ok: false, url, error: 'pdf too large: more than ' + Math.round(PDF_MAX_BYTES / 1048576) + ' MB' };
      const { text, pages, pagesRead } = await pdfToText(b.buf, { maxChars });
      return { ok: text.length > 200, url, text: text.slice(0, maxChars), pdf: { pages, pagesRead } };
    }
    if (!/text|html|xml|json/i.test(type)) { r.body?.cancel?.().catch(() => {}); return { ok: false, url, error: 'not text: ' + type.slice(0, 40) }; }
    const raw = (peeked || (await readBody(r, HTML_MAX_BYTES, { truncate: true })).buf).toString('utf8'); // a page past 1.5 MB is read up to there
    if (BOT_CHALLENGE.test(raw.slice(0, 5000))) return { ok: false, url, error: 'blocked: bot challenge, a browser would be needed' };
    const text = clean(raw.replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')).slice(0, maxChars);
    return { ok: text.length > 200, url, text, ...(mirror ? { readVia: mirror } : {}) };
  } catch (e) { return { ok: false, url, error: String(e.message || e).slice(0, 80) }; }
}

export function createPage(name, html, folder = 'evidence') {
  mkdirSync(folder, { recursive: true });
  const file = join(folder, String(name).replace(/[^a-z0-9_-]/gi, '_') + '.html');
  writeFileSync(file, String(html));
  return { ok: true, file, bytes: Buffer.byteLength(String(html)) };
}

// A long document (a 100-page report) is read in full, then reduced to its opening plus the passages that matter for the goal.
// `find` (from the planner) says what to locate; the goal is the fallback. Passages for `find` come first, then for the goal.
export async function readForGoal(url, goal, { fetchFn = fetch, maxChars = 400000, keep = 6000, find = '', lookup } = {}) {
  const r = await readPage(url, { fetchFn, maxChars, lookup });
  if (!r.ok || r.text.length <= keep) return r;
  const seen = new Set();
  const pick = (q, k) => (q ? relevantPassages(r.text, q, k) : []).filter((p) => !seen.has(p) && seen.add(p));
  const passages = [...pick(find, 16), ...pick(goal, 12)];
  const text = (r.text.slice(0, 1500) + '\n[...]\n' + passages.join('\n')).slice(0, keep);
  return { ...r, text, fullLength: r.text.length, find: find || undefined };
}

export function makeExecutor({ folder = 'evidence', fetchFn = fetch, goal = '', lookup } = {}) {
  return async (action) => {
    const t = String(action.type || '').toLowerCase();
    if (t.includes('read')) return readForGoal(action.url, goal, { fetchFn, find: action.find || '', lookup });
    if (t.includes('search')) return webSearch(action.query || action.detail, { fetchFn, lookup });
    if (t.includes('page') || t.includes('prototype')) return createPage(action.name || 'prototype', action.content || action.detail, folder);
    return { ok: false, error: 'unknown action: ' + action.type + ' (allowed: web_search, read_page, create_page)' };
  };
}
