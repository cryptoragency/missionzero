// A small scanner for the flaws found on most shop websites. It writes the generic findings format
// (demo-site/findings.example.json) that the repair mode reads. Any real scanner can replace it: the repair
// mode only needs the findings. It runs the same probes AFTER a fix, to say whether the flaw is gone.
// Mostly GETs, but some probes act. Active probes: one POST to the cart, two login attempts, a 40-request burst (F21,
// skipped with burst: false). That is why a scan runs only on a host whose owner proved control of it (see proveOwnership below).
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { isPrivateAddress } from './tools.js';

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; MissionZero-scan/0.1)' };

async function get(o, base, path, headers = {}) {
  try {
    const r = await (o?.fetchFn || fetch)(base + path, { headers: { ...UA, ...headers }, redirect: 'manual', signal: AbortSignal.timeout(8000) });
    return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() };
  } catch (e) { return { status: 0, headers: {}, body: '', error: e.message }; }
}
async function post(o, base, path, form, headers = {}) {
  try {
    const r = await (o?.fetchFn || fetch)(base + path, { method: 'POST', headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams(form).toString(), redirect: 'manual', signal: AbortSignal.timeout(8000) });
    return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() };
  } catch (e) { return { status: 0, headers: {}, body: '', error: e.message }; }
}

// A site that answers every unknown address with its home page (a single-page app behind try_files, a CMS catch-all)
// would make the "200 on a sensitive path" probes fire on that page. The fallback is learnt once per scan from an address
// that cannot exist; a probe whose answer is that same page has found nothing.
export async function fallbackPage(o, base) {
  if (!o) return null;
  if (o.__fallback === undefined) {
    const r = await get(o, base, '/mz-no-such-page-' + Math.random().toString(36).slice(2, 10));
    o.__fallback = r.status === 200 ? squash(r.body) : null;
  }
  return o.__fallback;
}
const squash = (s) => String(s).replace(/\s+/g, ' ').trim();
const isFallback = async (o, base, r) => { const fb = await fallbackPage(o, base); return Boolean(fb) && squash(r.body) === fb; };

// Each probe returns a finding when the flaw is present, null otherwise. `opts.login` (user, password) enables the session probes.
export const PROBES = [
  { id: 'F01', type: 'missing-security-headers', severity: 'medium', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); const want = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy'];
    const missing = want.filter((h) => !r.headers[h]);
    return missing.length ? { evidence: 'missing: ' + missing.join(', '), description: 'Browsers get no instruction against framing, MIME sniffing or script injection.' } : null;
  } },
  { id: 'F02', type: 'version-disclosure', severity: 'low', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); const leak = ['server', 'x-powered-by'].filter((h) => /\d+\.\d+/.test(r.headers[h] || ''));
    return leak.length ? { evidence: leak.map((h) => h + ': ' + r.headers[h]).join('; '), description: 'The stack and its versions are announced to anyone.' } : null;
  } },
  { id: 'F03', type: 'reflected-xss', severity: 'high', path: '/search?q=', run: async (b, o) => {
    const probe = '<mz"x>'; const r = await get(o, b, '/search?q=' + encodeURIComponent(probe));
    return r.body.includes(probe) ? { evidence: 'the query is echoed unescaped: ' + probe, description: 'A crafted link runs script in the visitor\'s browser.' } : null;
  } },
  { id: 'F04', type: 'client-side-price', severity: 'high', path: '/cart', run: async (b, o) => {
    await post(o, b, '/cart', { id: 3, price: 1 }); const r = await get(o, b, '/cart');
    return /·\s*1\s*€/.test(r.body) ? { evidence: 'POST /cart with price=1 gives a 1 € line for a 120 € product', description: 'The price is read from the form instead of the catalogue.' } : null;
  } },
  { id: 'F05', type: 'card-data-over-http', severity: 'critical', path: '/checkout', run: async (b, o) => {
    const r = await get(o, b, '/checkout'); const card = /name="card"/.test(r.body) && /name="cvv"/.test(r.body);
    return card && b.startsWith('http:') ? { evidence: 'form with fields card and cvv served over http://', description: 'Card numbers travel in clear and are handled by the shop itself.' } : null;
  } },
  { id: 'F06', type: 'idor', severity: 'high', path: '/order?id=1002', run: async (b, o) => {
    const r = await get(o, b, '/order?id=1002');
    return r.status === 200 && /@/.test(r.body) && !(await isFallback(o, b, r)) ? { evidence: 'order 1002 (name, e-mail, address) returned without any session', description: 'Any order is readable by changing the number.' } : null;
  } },
  { id: 'F07', type: 'weak-authentication', severity: 'high', path: '/login', run: async (b, o) => {
    const a = await post(o, b, '/login', { user: 'admin', password: 'x' }); const z = await post(o, b, '/login', { user: 'zzz-nobody', password: 'x' });
    const strip = (s) => s.replace(/\s+/g, ' ');
    return strip(a.body) !== strip(z.body) ? { evidence: 'the error text differs for a valid username', description: 'Usernames can be enumerated.' } : null;
  } },
  { id: 'F08', type: 'insecure-cookie', severity: 'medium', path: '/login', needsLogin: true, run: async (b, o) => {
    const r = await post(o, b, '/login', { user: o.login.user, password: o.login.password }); const c = r.headers['set-cookie'] || '';
    if (!c) return null; const miss = ['HttpOnly', 'Secure', 'SameSite'].filter((a) => !new RegExp(a, 'i').test(c));
    return miss.length ? { evidence: 'Set-Cookie: ' + c.slice(0, 80) + ' (missing ' + miss.join(', ') + ')', description: 'The session cookie can be read by script and sent cross-site.' } : null;
  } },
  { id: 'F09', type: 'broken-access-control', severity: 'critical', path: '/admin', needsLogin: true, run: async (b, o) => {
    const r = await post(o, b, '/login', { user: o.login.user, password: o.login.password }); const c = (r.headers['set-cookie'] || '').split(';')[0];
    const value = c.split('=')[1] || '';
    return value && value.length < 24 ? { evidence: 'session value "' + value + '" is short and predictable', description: 'The session value can be guessed; whoever sets it is admin.' } : null;
  } },
  { id: 'F10', type: 'robots-discloses-paths', severity: 'low', path: '/robots.txt', run: async (b, o) => {
    const r = await get(o, b, '/robots.txt'); const m = (r.body.match(/Disallow:\s*(\/(admin|\.env|backup|export)[^\s]*)/g) || []);
    return m.length ? { evidence: m.join(', '), description: 'The file points attackers to the sensitive paths.' } : null;
  } },
  { id: 'F11', type: 'exposed-secrets', severity: 'critical', path: '/.env', run: async (b, o) => {
    const r = await get(o, b, '/.env');
    return r.status === 200 && /PASSWORD|SECRET/.test(r.body) && !(await isFallback(o, b, r)) ? { evidence: 'HTTP 200 with PASSWORD/SECRET entries', description: 'Database, mail and payment secrets are public.' } : null;
  } },
  { id: 'F12', type: 'directory-listing-backups', severity: 'high', path: '/backup/', run: async (b, o) => {
    const r = await get(o, b, '/backup/');
    return r.status === 200 && /Index of/i.test(r.body) && !(await isFallback(o, b, r)) ? { evidence: 'index listing: ' + (r.body.match(/href="[^"]+"/g) || []).slice(0, 3).join(' '), description: 'Configuration and database backups are downloadable.' } : null;
  } },
  { id: 'F13', type: 'personal-data-exposed', severity: 'critical', path: '/export/customers.csv', run: async (b, o) => {
    const r = await get(o, b, '/export/customers.csv');
    return r.status === 200 && /@/.test(r.body) && !(await isFallback(o, b, r)) ? { evidence: 'names and e-mails returned without authentication', description: 'Customer personal data is public: a GDPR breach.' } : null;
  } },
  { id: 'F14', type: 'outdated-library', severity: 'medium', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); const src = (r.body.match(/src="([^"]*jquery[^"]*)"/i) || [])[1]; if (!src) return null;
    // The script address is resolved as a browser would (relative, absolute or //cdn). Only a script of the scanned site
    // is downloaded; a third-party copy is judged by the version written in its address, never fetched.
    let u; try { u = new URL(src, b + '/'); } catch { return null; }
    const named = (u.pathname.match(/jquery[-.]?v?(\d+\.\d+)/i) || [])[1];
    const j = u.origin === new URL(b).origin ? await get(o, u.origin, u.pathname + u.search) : { body: named ? 'jQuery v' + named : '' };
    const v = (j.body.match(/jQuery v?(\d+)\.(\d+)/i) || []);
    return v[1] && (Number(v[1]) < 3 || (Number(v[1]) === 3 && Number(v[2]) < 5)) ? { evidence: 'jQuery ' + v[1] + '.' + v[2] + ' at ' + src, description: 'A library with published vulnerabilities (CVE-2020-11022, CVE-2020-11023) is loaded on every page.' } : null;
  } },
  { id: 'F15', type: 'missing-privacy-policy', severity: 'medium', path: '/mentions-legales', run: async (b, o) => {
    const r = await get(o, b, '/mentions-legales');
    return !/confidentialit|données personnelles|privacy/i.test(r.body) ? { evidence: 'no privacy policy, no information on the data collected by the checkout form', description: 'Personal data is collected without the information the law requires.' } : null;
  } },
];

// Policy probes: the classes of flaw a surface scanner reports on any site (headers, consent, rate limiting). They stay out
// of the default shop scan (the 15 flaws) and answer when named by id or by TYPE: a finding from another scanner is rescanned
// here by its type, with the same probe before and after the fix.
export const POLICY_PROBES = [
  { id: 'F16', type: 'missing-hsts', severity: 'medium', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); const h = r.headers['strict-transport-security'] || '';
    const age = Number((h.match(/max-age=(\d+)/i) || [])[1] || 0);
    return age < 15552000 ? { evidence: h ? 'strict-transport-security: ' + h : 'no strict-transport-security header', description: 'Browsers are not told to stay on HTTPS: a first visit over HTTP can be intercepted.' } : null;
  } },
  { id: 'F17', type: 'weak-csp-script-src', severity: 'medium', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); const csp = r.headers['content-security-policy'] || (r.body.match(/http-equiv="content-security-policy"\s+content="([^"]*)"/i) || [])[1] || '';
    return csp && !/(^|;)\s*(script-src|default-src)\s/i.test(csp) ? { evidence: 'content-security-policy: ' + csp.slice(0, 160), description: 'The policy restricts framing only: any injected script still runs. A script-src (or default-src) directive is missing.' } : null;
  } },
  { id: 'F22', type: 'weak-csp-connect-src', severity: 'medium', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); const csp = r.headers['content-security-policy'] || (r.body.match(/http-equiv="content-security-policy"\s+content="([^"]*)"/i) || [])[1] || '';
    return csp && !/(^|;)\s*(connect-src|default-src)\s/i.test(csp) ? { evidence: 'content-security-policy: ' + csp.slice(0, 160), description: 'The policy does not restrict where the page may send data (connect-src): an injected script can exfiltrate to any server.' } : null;
  } },
  { id: 'F18', type: 'missing-corp', severity: 'low', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); return r.headers['cross-origin-resource-policy'] ? null : { evidence: 'no cross-origin-resource-policy header', description: 'Any site can embed the resources of this one (images, scripts) without restriction.' };
  } },
  { id: 'F19', type: 'missing-coep', severity: 'low', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); return r.headers['cross-origin-embedder-policy'] ? null : { evidence: 'no cross-origin-embedder-policy header', description: 'The page is not isolated from the cross-origin resources it embeds.' };
  } },
  { id: 'F20', type: 'missing-cookie-consent', severity: 'medium', path: '/', run: async (b, o) => {
    const r = await get(o, b, '/'); const body = r.body.toLowerCase();
    const sets = Boolean(r.headers['set-cookie']) || /document\.cookie\s*=/.test(r.body) || /<script[^>]+src="https?:\/\//i.test(r.body);
    const consent = /cookie/.test(body) && /(accept|consent|j'accepte|refuser|param[eè]tres des cookies)/.test(body);
    return sets && !consent ? { evidence: 'cookies or third-party scripts are set and the page shows no consent banner text', description: 'Visitors are not asked before cookies or third-party scripts are used (ePrivacy, CNIL).' } : null;
  } },
  { id: 'F21', type: 'no-rate-limiting', severity: 'medium', path: '/', run: async (b, o) => {
    const rs = await Promise.all(Array.from({ length: 40 }, (_, i) => get(o, b, '/?burst=' + i)));
    const limited = rs.some((r) => r.status === 429 || r.headers['retry-after'] || r.headers['x-ratelimit-limit'] || r.headers['ratelimit-limit']);
    return !limited && rs.every((r) => r.status === 200) ? { evidence: '40 requests in a burst, all answered 200, no 429 and no rate-limit header', description: 'Nothing slows down an automated attack (password guessing, scraping, flooding).' } : null;
  } },
];
export const ALL_PROBES = [...PROBES, ...POLICY_PROBES];
export const hasProbe = (f) => ALL_PROBES.some((p) => p.id === f.id || p.type === f.type);

// The scanner probes only a host you proved you control. A local address (localhost) is treated as yours. Any other host
// must serve /.well-known/mission-zero.txt containing the owner token (opts.ownerToken or MZ_OWNER_TOKEN, 16 characters or
// more): the same kind of proof a certificate authority asks (ACME HTTP-01). Without it the scan is refused before a single probe runs.
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
export function isLocal(base) { try { return LOCAL_HOSTS.has(new URL(base).hostname); } catch { return false; } }

// The target is a SITE, named by its origin: a base with a path (https://host/~someone/) would let a tenant of a shared
// host serve the token under its own folder and get the whole host scanned. { ok, origin } or { ok: false, why }.
export function targetOf(base) {
  let u; try { u = new URL(String(base)); } catch { return { ok: false, why: 'not a url' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, why: 'only http(s) sites are scanned' };
  if ((u.pathname && u.pathname !== '/') || u.search || u.hash || /[?#]/.test(String(base))) return { ok: false, why: 'give the site\'s origin only (scheme://host[:port]), without a path, query or fragment' };
  if (u.username || u.password) return { ok: false, why: 'no credentials in the address' };
  return { ok: true, origin: u.origin };
}
const lookupAll = async (host) => (await dnsLookup(host, { all: true, verbatim: true })).map((x) => x.address);

// The token file is read up to 200 bytes: a host that answers with an endless body cannot hold the scanner.
const TOKEN_MAX_BYTES = 200;
async function getToken(fetchFn, url) {
  try {
    const r = await (fetchFn || fetch)(url, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(8000) });
    if (!r.body?.getReader) return { status: r.status, body: String(await r.text()).slice(0, TOKEN_MAX_BYTES) };
    const reader = r.body.getReader(); const chunks = []; let n = 0;
    while (n < TOKEN_MAX_BYTES) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
    reader.cancel().catch(() => {});
    return { status: r.status, body: Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, TOKEN_MAX_BYTES).toString('utf8') };
  } catch (e) { return { status: 0, body: '', error: e.message }; }
}

// `fetchFn` and `lookup` can be replaced (tests). The name is resolved once, before the token is fetched: a public name
// that points at 127.0.0.1 or a private network is refused, the proof would come from somewhere else than the internet.
export async function proveOwnership(base, token = process.env.MZ_OWNER_TOKEN, { fetchFn, lookup = lookupAll } = {}) {
  const t0 = targetOf(base); if (!t0.ok) return { ok: false, why: t0.why };
  const origin = t0.origin;
  if (isLocal(origin)) return { ok: true, how: 'local address', origin };
  const url = new URL(origin);
  if (url.protocol !== 'https:') return { ok: false, why: 'a site that is not local is scanned over https only (the proof and the probes would travel in clear)' };
  const t = String(token || '').trim();
  if (t.length < 16) return { ok: false, why: 'no owner token of 16 characters or more (MZ_OWNER_TOKEN), to be served at /.well-known/mission-zero.txt' };
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let ips = [host];
  if (!isIP(host)) { try { ips = await lookup(host); } catch (e) { return { ok: false, why: host + ' does not resolve (' + (e.code || e.message) + ')' }; } }
  const bad = (ips || []).find(isPrivateAddress);
  if (!ips?.length || bad) return { ok: false, why: host + ' points to ' + (bad || 'nothing') + ', a private or local address: refused (a local site is scanned by its local address)' };
  const r = await getToken(fetchFn, origin + '/.well-known/mission-zero.txt');
  if (r.status === 200 && r.body.trim() === t) return { ok: true, how: '/.well-known/mission-zero.txt', origin };
  return { ok: false, why: r.status === 200 ? 'the token served at /.well-known/mission-zero.txt is not yours' : '/.well-known/mission-zero.txt answered ' + (r.status || r.error) };
}

// opts: login, only, policy, ownerToken, burst (false skips the 40-request burst), fetchFn and lookup (tests).
export async function scan(base, opts = {}) {
  const owner = await proveOwnership(base, opts.ownerToken, { fetchFn: opts.fetchFn, lookup: opts.lookup });
  if (!owner.ok) throw new Error('scan refused: ' + base + ' is not a host you proved you control (' + owner.why + ')');
  const origin = owner.origin; // every probe goes to the origin the proof was read from, nowhere else
  const findings = [];
  const ctx = { ...opts }; // the learnt fallback page lives for this scan only
  for (const p of (opts.policy || opts.only ? ALL_PROBES : PROBES)) {
    if (p.needsLogin && !opts.login) continue;
    if (p.id === 'F21' && opts.burst === false) continue;
    if (opts.only && !opts.only.includes(p.id) && !opts.only.includes(p.type)) continue;
    const hit = await p.run(origin, ctx);
    if (hit) findings.push({ id: p.id, severity: p.severity, type: p.type, url: origin + p.path, ...hit });
  }
  return { target: origin, owner: owner.how, scanner: 'mission-zero scan 0.1', scannedAt: new Date().toISOString(), findings };
}
