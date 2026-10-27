// A small scanner for the flaws found on most shop websites. It writes the generic findings format
// (demo-site/findings.example.json) that the repair mode reads. Any real scanner can replace it: the repair
// mode only needs the findings. It runs the same probes AFTER a fix, to say whether the flaw is gone.
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; MissionZero-scan/0.1)' };

async function get(base, path, headers = {}) {
  try {
    const r = await fetch(base + path, { headers: { ...UA, ...headers }, redirect: 'manual', signal: AbortSignal.timeout(8000) });
    return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() };
  } catch (e) { return { status: 0, headers: {}, body: '', error: e.message }; }
}
async function post(base, path, form, headers = {}) {
  try {
    const r = await fetch(base + path, { method: 'POST', headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams(form).toString(), redirect: 'manual', signal: AbortSignal.timeout(8000) });
    return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() };
  } catch (e) { return { status: 0, headers: {}, body: '', error: e.message }; }
}

// Each probe returns a finding when the flaw is present, null otherwise. `opts.login` (user, password) enables the session probes.
export const PROBES = [
  { id: 'F01', type: 'missing-security-headers', severity: 'medium', path: '/', run: async (b) => {
    const r = await get(b, '/'); const want = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy'];
    const missing = want.filter((h) => !r.headers[h]);
    return missing.length ? { evidence: 'missing: ' + missing.join(', '), description: 'Browsers get no instruction against framing, MIME sniffing or script injection.' } : null;
  } },
  { id: 'F02', type: 'version-disclosure', severity: 'low', path: '/', run: async (b) => {
    const r = await get(b, '/'); const leak = ['server', 'x-powered-by'].filter((h) => /\d+\.\d+/.test(r.headers[h] || ''));
    return leak.length ? { evidence: leak.map((h) => h + ': ' + r.headers[h]).join('; '), description: 'The stack and its versions are announced to anyone.' } : null;
  } },
  { id: 'F03', type: 'reflected-xss', severity: 'high', path: '/search?q=', run: async (b) => {
    const probe = '<mz"x>'; const r = await get(b, '/search?q=' + encodeURIComponent(probe));
    return r.body.includes(probe) ? { evidence: 'the query is echoed unescaped: ' + probe, description: 'A crafted link runs script in the visitor\'s browser.' } : null;
  } },
  { id: 'F04', type: 'client-side-price', severity: 'high', path: '/cart', run: async (b) => {
    await post(b, '/cart', { id: 3, price: 1 }); const r = await get(b, '/cart');
    return /·\s*1\s*€/.test(r.body) ? { evidence: 'POST /cart with price=1 gives a 1 € line for a 120 € product', description: 'The price is read from the form instead of the catalogue.' } : null;
  } },
  { id: 'F05', type: 'card-data-over-http', severity: 'critical', path: '/checkout', run: async (b) => {
    const r = await get(b, '/checkout'); const card = /name="card"/.test(r.body) && /name="cvv"/.test(r.body);
    return card && b.startsWith('http:') ? { evidence: 'form with fields card and cvv served over http://', description: 'Card numbers travel in clear and are handled by the shop itself.' } : null;
  } },
  { id: 'F06', type: 'idor', severity: 'high', path: '/order?id=1002', run: async (b) => {
    const r = await get(b, '/order?id=1002');
    return r.status === 200 && /@/.test(r.body) ? { evidence: 'order 1002 (name, e-mail, address) returned without any session', description: 'Any order is readable by changing the number.' } : null;
  } },
  { id: 'F07', type: 'weak-authentication', severity: 'high', path: '/login', run: async (b) => {
    const a = await post(b, '/login', { user: 'admin', password: 'x' }); const z = await post(b, '/login', { user: 'zzz-nobody', password: 'x' });
    const strip = (s) => s.replace(/\s+/g, ' ');
    return strip(a.body) !== strip(z.body) ? { evidence: 'the error text differs for a valid username', description: 'Usernames can be enumerated.' } : null;
  } },
  { id: 'F08', type: 'insecure-cookie', severity: 'medium', path: '/login', needsLogin: true, run: async (b, o) => {
    const r = await post(b, '/login', { user: o.login.user, password: o.login.password }); const c = r.headers['set-cookie'] || '';
    if (!c) return null; const miss = ['HttpOnly', 'Secure', 'SameSite'].filter((a) => !new RegExp(a, 'i').test(c));
    return miss.length ? { evidence: 'Set-Cookie: ' + c.slice(0, 80) + ' (missing ' + miss.join(', ') + ')', description: 'The session cookie can be read by script and sent cross-site.' } : null;
  } },
  { id: 'F09', type: 'broken-access-control', severity: 'critical', path: '/admin', needsLogin: true, run: async (b, o) => {
    const r = await post(b, '/login', { user: o.login.user, password: o.login.password }); const c = (r.headers['set-cookie'] || '').split(';')[0];
    const value = c.split('=')[1] || '';
    return value && value.length < 24 ? { evidence: 'session value "' + value + '" is short and predictable', description: 'The session value can be guessed; whoever sets it is admin.' } : null;
  } },
  { id: 'F10', type: 'robots-discloses-paths', severity: 'low', path: '/robots.txt', run: async (b) => {
    const r = await get(b, '/robots.txt'); const m = (r.body.match(/Disallow:\s*(\/(admin|\.env|backup|export)[^\s]*)/g) || []);
    return m.length ? { evidence: m.join(', '), description: 'The file points attackers to the sensitive paths.' } : null;
  } },
  { id: 'F11', type: 'exposed-secrets', severity: 'critical', path: '/.env', run: async (b) => {
    const r = await get(b, '/.env');
    return r.status === 200 && /PASSWORD|SECRET/.test(r.body) ? { evidence: 'HTTP 200 with PASSWORD/SECRET entries', description: 'Database, mail and payment secrets are public.' } : null;
  } },
  { id: 'F12', type: 'directory-listing-backups', severity: 'high', path: '/backup/', run: async (b) => {
    const r = await get(b, '/backup/');
    return r.status === 200 && /Index of/i.test(r.body) ? { evidence: 'index listing: ' + (r.body.match(/href="[^"]+"/g) || []).slice(0, 3).join(' '), description: 'Configuration and database backups are downloadable.' } : null;
  } },
  { id: 'F13', type: 'personal-data-exposed', severity: 'critical', path: '/export/customers.csv', run: async (b) => {
    const r = await get(b, '/export/customers.csv');
    return r.status === 200 && /@/.test(r.body) ? { evidence: 'names and e-mails returned without authentication', description: 'Customer personal data is public: a GDPR breach.' } : null;
  } },
  { id: 'F14', type: 'outdated-library', severity: 'medium', path: '/', run: async (b) => {
    const r = await get(b, '/'); const src = (r.body.match(/src="([^"]*jquery[^"]*)"/i) || [])[1]; if (!src) return null;
    const j = await get(b, src); const v = (j.body.match(/jQuery v?(\d+)\.(\d+)/i) || []);
    return v[1] && (Number(v[1]) < 3 || (Number(v[1]) === 3 && Number(v[2]) < 5)) ? { evidence: 'jQuery ' + v[1] + '.' + v[2] + ' at ' + src, description: 'A library with published vulnerabilities (CVE-2020-11022, CVE-2020-11023) is loaded on every page.' } : null;
  } },
  { id: 'F15', type: 'missing-privacy-policy', severity: 'medium', path: '/mentions-legales', run: async (b) => {
    const r = await get(b, '/mentions-legales');
    return !/confidentialit|données personnelles|privacy/i.test(r.body) ? { evidence: 'no privacy policy, no information on the data collected by the checkout form', description: 'Personal data is collected without the information the law requires.' } : null;
  } },
];

export async function scan(base, opts = {}) {
  const findings = [];
  for (const p of PROBES) {
    if (p.needsLogin && !opts.login) continue;
    if (opts.only && !opts.only.includes(p.id)) continue;
    const hit = await p.run(base, opts);
    if (hit) findings.push({ id: p.id, severity: p.severity, type: p.type, url: base + p.path, ...hit });
  }
  return { target: base, scanner: 'mission-zero scan 0.1', scannedAt: new Date().toISOString(), findings };
}
