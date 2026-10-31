// L'API de Mission Zero (31 octobre 2026) : une application (un moteur de recherche, un assistant, un tableau de bord de
// labo) envoie la réponse de son IA et les sources qu'elle cite ; Mission Zero ouvre chaque page, relit chaque citation et
// rend un verdict : VERIFIED si chaque affirmation est sur sa page, NOT VERIFIED sinon, avec les preuves.
//
//   POST /api/verify   { "question": "...", "answer": "...", "sources": [{ "claim": "...", "url": "https://..." }] }
//   GET  /health       { "ok": true }
//
// Sécurité :
// - une clé obligatoire (MZ_API_KEY, 32 caractères au moins) : « Authorization: Bearer <clé> », comparée en temps constant ;
//   sans clé, le serveur refuse de démarrer ;
// - écoute sur 127.0.0.1 par défaut (HOST=0.0.0.0 seulement dans le conteneur, publié sur 127.0.0.1 par Docker) ;
// - corps JSON seulement, 32 Ko au plus, 10 sources au plus, adresses http(s) seulement ;
// - pages lues par readPage : toute adresse privée, locale ou de métadonnées est refusée, à chaque redirection (SSRF) ;
// - débit borné par adresse (30 requêtes par minute) et 4 vérifications en même temps au plus ;
// - coût borné par requête (MZ_API_CAP_USD, 0,25 $ par défaut) et par jour (le plafond quotidien du client Meta) ;
// - aucune trace de pile ni de clé dans les réponses ou le journal ; pas de CORS sauf MZ_API_ORIGIN.
//   MZ_API_KEY=<clé> node --env-file-if-exists=.env src/api.js
import http from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const LIMITS = { bodyBytes: 32 * 1024, sources: 10, claimChars: 600, urlChars: 2000, textChars: 8000, perMinute: 30, concurrent: 4, timeoutMs: 120000 };

const sameKey = (a, b) => { const h = (s) => createHash('sha256').update(String(s)).digest(); return timingSafeEqual(h(a), h(b)); };

// Le contrôle de la requête, sans réseau : ce qui est refusé l'est avant tout appel au modèle.
export function checkBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'body must be a JSON object';
  const { sources } = body;
  if (!Array.isArray(sources) || sources.length === 0) return 'sources must be a non-empty array of { claim, url }';
  if (sources.length > LIMITS.sources) return 'at most ' + LIMITS.sources + ' sources per request';
  for (const s of sources) {
    if (!s || typeof s.claim !== 'string' || typeof s.url !== 'string') return 'each source needs a string claim and a string url';
    if (!s.claim.trim() || s.claim.length > LIMITS.claimChars) return 'claim must be 1 to ' + LIMITS.claimChars + ' characters';
    if (s.url.length > LIMITS.urlChars) return 'url too long';
    let u; try { u = new URL(s.url); } catch { return 'invalid url: ' + s.url.slice(0, 80); }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'only http and https urls are read';
    if (u.username || u.password) return 'urls with credentials are refused';
  }
  for (const f of ['question', 'answer']) if (body[f] != null && (typeof body[f] !== 'string' || body[f].length > LIMITS.textChars)) return f + ' must be a string of at most ' + LIMITS.textChars + ' characters';
  return null;
}

// Le verdict : VERIFIED seulement si chaque affirmation est trouvée, mot pour mot, sur sa page.
export function verdictOf(report) {
  const verified = report.results.length > 0 && report.red === 0;
  return {
    verdict: verified ? 'VERIFIED' : 'NOT VERIFIED',
    green: report.green, red: report.red,
    results: report.results.map((r) => ({ claim: r.claim, url: r.url, verdict: r.verdict, ...(r.color === 'green' ? { quote: r.detail } : { why: String(r.detail || '').slice(0, 400) }) })),
  };
}

// `verify(sources)` est injectée : les tests la remplacent, le serveur réel branche verifyReport sur le client Meta.
export function createApi({ key, verify, origin = null, now = () => Date.now(), log = () => {} }) {
  if (!key || String(key).length < 32) throw new Error('MZ_API_KEY is missing or shorter than 32 characters: the API does not start without a key');
  const hits = new Map(); let running = 0;
  const limited = (ip) => { const t = now(), w = (hits.get(ip) || []).filter((x) => t - x < 60000); w.push(t); hits.set(ip, w); return w.length > LIMITS.perMinute; };
  return http.createServer((req, res) => {
    const send = (code, obj, extra = {}) => {
      const h = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...extra };
      if (origin) { h['access-control-allow-origin'] = origin; h['vary'] = 'origin'; h['access-control-allow-headers'] = 'authorization, content-type'; h['access-control-allow-methods'] = 'POST, GET'; }
      res.writeHead(code, h); res.end(JSON.stringify(obj));
    };
    const path = (req.url || '/').split('?')[0];
    if (req.method === 'OPTIONS' && origin) return send(204, {});
    if (req.method === 'GET' && path === '/health') return send(200, { ok: true });
    if (path !== '/api/verify') return send(404, { error: 'not found' });
    if (req.method !== 'POST') return send(405, { error: 'POST only' }, { allow: 'POST' });
    const auth = String(req.headers.authorization || ''); const m = /^Bearer (.+)$/.exec(auth);
    if (!m || !sameKey(m[1], key)) return send(401, { error: 'missing or wrong API key' }, { 'www-authenticate': 'Bearer' });
    const ip = req.socket.remoteAddress || '?';
    if (limited(ip)) return send(429, { error: 'too many requests: ' + LIMITS.perMinute + ' per minute' }, { 'retry-after': '60' });
    if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return send(415, { error: 'content-type must be application/json' });
    if (running >= LIMITS.concurrent) return send(503, { error: 'busy, retry in a moment' }, { 'retry-after': '5' });
    let size = 0; const chunks = []; let done = false;
    req.on('data', (c) => { size += c.length; if (size > LIMITS.bodyBytes && !done) { done = true; send(413, { error: 'body larger than ' + LIMITS.bodyBytes + ' bytes' }); req.destroy(); } else chunks.push(c); });
    req.on('end', async () => {
      if (done) return; done = true;
      let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'invalid JSON' }); }
      const bad = checkBody(body); if (bad) return send(400, { error: bad });
      running += 1; const t0 = now();
      const timer = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), LIMITS.timeoutMs).unref());
      try {
        const report = await Promise.race([verify(body.sources.map((s) => ({ claim: s.claim, url: s.url }))), timer]);
        const out = verdictOf(report); log({ at: new Date().toISOString(), ip, sources: body.sources.length, verdict: out.verdict, ms: now() - t0 });
        send(200, out);
      } catch (e) {
        const msg = /cap|limit|plafond/i.test(String(e && e.message)) ? 'cost cap reached' : /timeout/.test(String(e && e.message)) ? 'verification took too long' : 'verification failed';
        log({ at: new Date().toISOString(), ip, error: msg }); send(msg === 'cost cap reached' ? 402 : 502, { error: msg });
      } finally { running -= 1; }
    });
  });
}

// Le serveur réel : la clé, le client Meta (plafonds de coût), le vérificateur de citations.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { createClient } = await import('./meta.js');
  const { verifyReport } = await import('./verify.js');
  const capUsd = Number(process.env.MZ_API_CAP_USD || 0.25);
  const verify = (items) => { const { ask } = createClient({ capUsd }); return verifyReport({ items, ask }); };
  const server = createApi({ key: process.env.MZ_API_KEY, verify, origin: process.env.MZ_API_ORIGIN || null, log: (l) => console.log(JSON.stringify(l)) });
  const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 3000);
  server.requestTimeout = LIMITS.timeoutMs + 10000; server.headersTimeout = 15000;
  server.listen(port, host, () => console.log('Mission Zero API · http://' + host + ':' + port + '/api/verify'));
}
