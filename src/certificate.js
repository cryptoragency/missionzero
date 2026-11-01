// Certified installation. CRYPTOR.AGENCY installs Mission Zero for a professional user and signs a certificate
// (Ed25519) naming the licensee, the sites, the version, the date and the fingerprint of every file of code it installed.
// This module only VERIFIES, offline: no network call, no data sent, nothing blocked. The signing key never ships with
// the code; only public keys do (certificates/<keyId>.pub.pem), with a local revocation list (certificates/revoked.json).
// What a valid certificate proves: this code, unchanged, was installed by CRYPTOR.AGENCY for the licensee named in it.
// It is provenance, signed by the author; it is not a copyright license and not a security audit.
import { createHash, createPublicKey, verify as edVerify } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const KEYS_DIR = join(ROOT, 'certificates');
export const DEFAULT_CERTIFICATE = 'mission-zero-certificate.json';
export const SCHEMA = 'mz-cert/1';
// The keys CRYPTOR.AGENCY signs with, pinned by the SHA-256 of their public key (DER). The same fingerprints are published
// in the README and on https://cryptor.agency: a key file swapped in certificates/ to self-certify is refused here.
export const PINNED_KEYS = { 'cryptor-2026-1': 'sha256:1ae28a09dc2ceb9e89045a717d94c5fc8c1a6be21877e5cc260ac63cd5433a07' };
export const keyFingerprint = (key) => 'sha256:' + createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex');

// Canonical JSON: keys sorted at every level, so the signature does not depend on how the file was written.
export function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

// The code a certificate vouches for: every .js file under src/, web/ and bench/ (tests excluded), package.json and
// package-lock.json. Paths are relative with "/", contents hashed with LF line ends (a Windows checkout signs the same).
export function codeFiles(root = ROOT) {
  const out = [];
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { if (n === 'node_modules') continue; const p = join(d, n); const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.js$/.test(n) && !/\.test\.js$/.test(n)) out.push(p); } };
  for (const d of ['src', 'web', 'bench']) walk(join(root, d));
  for (const f of ['package.json', 'package-lock.json']) if (existsSync(join(root, f))) out.push(join(root, f));
  return out.map((p) => relative(root, p).split('\\').join('/')).sort();
}
export function fileHashes(root = ROOT) {
  return Object.fromEntries(codeFiles(root).map((rel) => [rel, createHash('sha256').update(readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')).digest('hex')]));
}
export function fingerprint(root = ROOT, hashes = fileHashes(root)) {
  return 'sha256:' + createHash('sha256').update(Object.keys(hashes).sort().map((k) => k + '\0' + hashes[k] + '\n').join('')).digest('hex');
}

const REQUIRED = ['schema', 'alg', 'keyId', 'id', 'licensee', 'sites', 'version', 'installedAt', 'installer', 'files', 'codeFingerprint'];
const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return d; } };

// { status, why, certificate, changed }. status:
//   certified | none (no certificate) | error (unreadable file, key missing: a local problem, not a forgery)
//   invalid (signature or format refused) | revoked | expired | wrong-site | modified (code changed since installation)
export function verifyCertificate(file, { root = ROOT, keysDir = KEYS_DIR, site, now = new Date(), pinned = PINNED_KEYS } = {}) {
  if (!file || !existsSync(file)) return { status: 'none', why: 'no certificate file' };
  const doc = readJson(file, null);
  if (!doc) return { status: 'error', why: 'the certificate file is not readable JSON' };
  const c = doc.certificate; const sig = doc.signature;
  if (!c || typeof c !== 'object' || typeof sig !== 'string') return { status: 'invalid', why: 'no certificate or no signature in the file' };
  const missing = REQUIRED.filter((k) => c[k] === undefined || c[k] === '');
  if (missing.length) return { status: 'invalid', why: 'missing fields: ' + missing.join(', '), certificate: c };
  if (!Array.isArray(c.sites) || !c.sites.every((x) => typeof x === 'string') || typeof c.files !== 'object' || Array.isArray(c.files) || typeof c.keyId !== 'string' || typeof c.installedAt !== 'string') return { status: 'invalid', why: 'malformed fields (sites, files, keyId or installedAt)', certificate: c };
  if (c.schema !== SCHEMA || c.alg !== 'ed25519') return { status: 'invalid', why: 'unknown schema or algorithm (only ' + SCHEMA + ', ed25519)', certificate: c };
  if (!/^[a-z0-9-]{3,40}$/.test(c.keyId)) return { status: 'invalid', why: 'bad key id', certificate: c };
  const keyFile = join(keysDir, c.keyId + '.pub.pem');
  let key; try { key = createPublicKey(readFileSync(keyFile, 'utf8')); } catch { return { status: 'error', why: 'the CRYPTOR.AGENCY public key ' + c.keyId + ' is not in certificates/', certificate: c }; }
  if (!pinned[c.keyId]) return { status: 'invalid', why: 'key ' + c.keyId + ' is not a CRYPTOR.AGENCY key', certificate: c };
  if (keyFingerprint(key) !== pinned[c.keyId]) return { status: 'invalid', why: 'the public key ' + c.keyId + ' in certificates/ was replaced: it is not the one CRYPTOR.AGENCY publishes', certificate: c };
  const raw = Buffer.from(sig, 'base64');
  let ok = false; try { ok = raw.length === 64 && edVerify(null, Buffer.from(canonical(c)), key, raw); } catch { ok = false; }
  if (!ok) return { status: 'invalid', why: 'the signature is not CRYPTOR.AGENCY\'s: the certificate was forged or edited', certificate: c };
  const revoked = (readJson(join(keysDir, 'revoked.json'), { certificates: [], keys: [] }));
  const rc = (revoked.certificates || []).find((r) => r.id === c.id);
  if (rc) return { status: 'revoked', why: 'certificate revoked on ' + rc.date + (rc.reason ? ' (' + rc.reason + ')' : ''), certificate: c };
  const rk = (revoked.keys || []).find((r) => r.keyId === c.keyId);
  // A withdrawn key revokes every certificate it signed (a stolen key can write any date), except those CRYPTOR.AGENCY
  // lists as still valid from its register of the certificates it really issued.
  if (rk && !(rk.stillValid || []).includes(c.id)) return { status: 'revoked', why: 'key ' + c.keyId + ' withdrawn on ' + rk.since, certificate: c };
  if (c.validUntil && new Date(c.validUntil) < now) return { status: 'expired', why: 'valid until ' + c.validUntil, certificate: c };
  if (site && !c.sites.some((s) => sameSite(s, site))) return { status: 'wrong-site', why: site + ' is not among the certified sites (' + c.sites.join(', ') + ')', certificate: c };
  let pkgVersion = null; try { pkgVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version; } catch {}
  if (pkgVersion && pkgVersion !== c.version) return { status: 'modified', why: 'version ' + pkgVersion + ' installed, certificate for ' + c.version, certificate: c, changed: ['package.json'] };
  const now_ = fileHashes(root);
  const changed = [...new Set([...Object.keys(c.files), ...Object.keys(now_)])].filter((f) => c.files[f] !== now_[f]).sort();
  if (changed.length || fingerprint(root, now_) !== c.codeFingerprint) return { status: 'modified', why: 'the code changed since CRYPTOR.AGENCY installed it: ' + changed.slice(0, 5).join(', ') + (changed.length > 5 ? ' and ' + (changed.length - 5) + ' more' : ''), certificate: c, changed };
  return { status: 'certified', why: 'signed by CRYPTOR.AGENCY, code unchanged since installation (' + Object.keys(now_).length + ' files)', certificate: c };
}
function sameSite(a, b) { const h = (x) => { try { return new URL(/^https?:/.test(x) ? x : 'https://' + x).hostname.replace(/^www\./, ''); } catch { return String(x); } }; return h(a) === h(b); }

// One line for the start of the API and the repair mode, the same everywhere. Never throws, never blocks.
export function statusLine(opts = {}) {
  const o = { site: process.env.MZ_SITE || undefined, ...opts };
  let r; try { r = verifyCertificate(o.file || process.env.MZ_CERTIFICATE || join(ROOT, DEFAULT_CERTIFICATE), o); } catch (e) { r = { status: 'error', why: 'certificate check failed: ' + e.message }; }
  if (r.status === 'certified') return `Certified installation: ${r.certificate.licensee}, installed by ${r.certificate.installer} on ${String(r.certificate.installedAt).slice(0, 10)} (certificate ${r.certificate.id}, key ${r.certificate.keyId}).`;
  if (r.status === 'none') return 'Installation not certified (no certificate). Noncommercial use under LICENSE; commercial use needs a commercial license, installed by CRYPTOR.AGENCY, which alone carries warranty and support.';
  return `Certificate ${r.status}: ${r.why}. This installation is not certified by CRYPTOR.AGENCY: no warranty, no support (LICENSE).`;
}
