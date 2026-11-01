import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createPublicKey } from 'node:crypto';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyCertificate, canonical, fingerprint, fileHashes, statusLine, keyFingerprint, SCHEMA, PINNED_KEYS } from './certificate.js';

// A throwaway installer key and a tiny installation: the real CRYPTOR.AGENCY signing key is never in the repository.
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
function install() {
  const root = mkdtempSync(join(tmpdir(), 'mz-cert-'));
  mkdirSync(join(root, 'src')); mkdirSync(join(root, 'certificates'));
  writeFileSync(join(root, 'certificates', 'test-1.pub.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
  writeFileSync(join(root, 'src', 'agent.js'), 'export const x = 1;\n');
  writeFileSync(join(root, 'src', 'agent.test.js'), '// tests are not part of the vouched code\n');
  writeFileSync(join(root, 'package.json'), '{"name":"mission-zero","version":"0.1.0"}\n');
  return root;
}
function issue(root, extra = {}, key = privateKey) {
  const files = fileHashes(root);
  const certificate = { schema: SCHEMA, alg: 'ed25519', keyId: 'test-1', id: 'MZC-2026-0001', licensee: 'Example SAS', sites: ['example.org'], version: '0.1.0', installedAt: '2026-11-05T10:00:00Z', installer: 'CRYPTOR.AGENCY', files, codeFingerprint: fingerprint(root, files), ...extra };
  const file = join(root, 'mission-zero-certificate.json');
  writeFileSync(file, JSON.stringify({ certificate, signature: sign(null, Buffer.from(canonical(certificate)), key).toString('base64') }, null, 2));
  return file;
}
const PIN = { 'test-1': keyFingerprint(publicKey) };
const check = (root, file, o = {}) => verifyCertificate(file, { root, keysDir: join(root, 'certificates'), pinned: PIN, ...o });

test('a certificate signed by the installer key, on unchanged code, is certified', () => {
  const root = install(); const r = check(root, issue(root), { site: 'https://www.example.org' });
  assert.equal(r.status, 'certified', r.why);
});

test('no certificate: the installation runs and is told, neutrally, that it is not certified', () => {
  const root = install();
  assert.equal(check(root, join(root, 'none.json')).status, 'none');
  assert.match(statusLine({ file: join(root, 'none.json') }), /^Installation not certified \(no certificate\)\. Noncommercial use under LICENSE/);
});

test('an edited certificate (another licensee written in) or a changed signature byte is refused', () => {
  const root = install(); const file = issue(root);
  const doc = JSON.parse(readFileSync(file, 'utf8')); doc.certificate.licensee = 'Someone Else'; writeFileSync(file, JSON.stringify(doc));
  assert.equal(check(root, file).status, 'invalid');
  const file2 = issue(root); const d2 = JSON.parse(readFileSync(file2, 'utf8'));
  const s = Buffer.from(d2.signature, 'base64'); s[0] ^= 1; d2.signature = s.toString('base64'); writeFileSync(file2, JSON.stringify(d2));
  assert.equal(check(root, file2).status, 'invalid');
});

test('another key, another algorithm or an unknown key id is refused; a missing key or bad JSON is a local error', () => {
  const root = install();
  assert.equal(check(root, issue(root, {}, generateKeyPairSync('ed25519').privateKey)).status, 'invalid');
  assert.equal(check(root, issue(root, { alg: 'none' })).status, 'invalid');
  assert.equal(check(root, issue(root, { keyId: 'absent-9' })).status, 'error');
  const bad = join(root, 'bad.json'); writeFileSync(bad, '{not json'); assert.equal(check(root, bad).status, 'error');
});

test('code changed, added or removed after the installation: the certificate names the files', () => {
  const root = install(); const file = issue(root);
  writeFileSync(join(root, 'src', 'agent.js'), 'export const x = 2; // check removed\n');
  writeFileSync(join(root, 'src', 'injected.js'), 'export default 1;\n');
  const r = check(root, file);
  assert.equal(r.status, 'modified'); assert.deepEqual(r.changed, ['src/agent.js', 'src/injected.js']);
  const root2 = install(); const file2 = issue(root2); rmSync(join(root2, 'src', 'agent.js'));
  assert.deepEqual(check(root2, file2).changed, ['src/agent.js']);
});

test('CRLF line ends and test files do not count as a change', () => {
  const root = install(); const file = issue(root);
  writeFileSync(join(root, 'src', 'agent.js'), 'export const x = 1;\r\n');
  writeFileSync(join(root, 'src', 'agent.test.js'), '// changed\n');
  assert.equal(check(root, file).status, 'certified');
});

test('a certificate copied to another site, past its date or revoked is not valid there', () => {
  const root = install(); const file = issue(root, { validUntil: '2027-11-05T00:00:00Z' });
  assert.equal(check(root, file, { site: 'other.example' }).status, 'wrong-site');
  assert.equal(check(root, file, { now: new Date('2028-01-01') }).status, 'expired');
  writeFileSync(join(root, 'certificates', 'revoked.json'), JSON.stringify({ certificates: [{ id: 'MZC-2026-0001', date: '2026-12-01', reason: 'contract ended' }] }));
  assert.equal(check(root, file).status, 'revoked');
  writeFileSync(join(root, 'certificates', 'revoked.json'), JSON.stringify({ keys: [{ keyId: 'test-1', since: '2026-11-01' }] }));
  assert.equal(check(root, file).status, 'revoked', 'a withdrawn key revokes even a certificate dated before the withdrawal');
  writeFileSync(join(root, 'certificates', 'revoked.json'), JSON.stringify({ keys: [{ keyId: 'test-1', since: '2026-11-01', stillValid: ['MZC-2026-0001'] }] }));
  assert.equal(check(root, file).status, 'certified', 'unless listed as really issued');
});

test('the signature does not depend on key order in the file', () => {
  assert.equal(canonical({ b: 1, a: { d: [2, { f: 1, e: 0 }], c: 'x' } }), '{"a":{"c":"x","d":[2,{"e":0,"f":1}]},"b":1}');
});

test('a public key swapped in certificates/ to self-certify is refused; the shipped key is the pinned one', () => {
  const root = install(); const file = issue(root);
  assert.equal(verifyCertificate(file, { root, keysDir: join(root, 'certificates') }).status, 'invalid', 'test-1 is not a CRYPTOR.AGENCY key');
  writeFileSync(join(root, 'certificates', 'test-1.pub.pem'), generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }));
  assert.match(check(root, file).why, /replaced/);
  const shipped = keyFingerprint(createPublicKey(readFileSync(new URL('../certificates/cryptor-2026-1.pub.pem', import.meta.url), 'utf8')));
  assert.equal(shipped, PINNED_KEYS['cryptor-2026-1']);
});

test('malformed fields and a changed version are refused cleanly, never thrown', () => {
  const root = install();
  assert.equal(check(root, issue(root, { sites: 'example.org' })).status, 'invalid');
  assert.equal(check(root, issue(root, { files: ['x'] })).status, 'invalid');
  const file = issue(root); writeFileSync(join(root, 'package.json'), '{"name":"mission-zero","version":"0.2.0"}\n');
  assert.equal(check(root, file).status, 'modified');
});
