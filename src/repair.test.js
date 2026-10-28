import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyEdits, copySite, runJourneys, repairOne, freePort, startSite } from './repair.js';
import { scan } from './scanner.js';

const SITE = 'demo-site';
const F02 = { id: 'F02', severity: 'low', type: 'version-disclosure', url: 'http://x/', evidence: 'x-powered-by: PHP/7.2.24', description: 'versions announced' };
const know = async () => ({ answer: 'Remove the X-Powered-By and Server version headers.', sources: [{ url: 'https://owasp.org/x', contribution: 'remove version headers' }], score: 9, green: 1, red: 0 });

test('the scanner finds the 15 flaws of the demo shop, and the journeys are green on it', async () => {
  const port = await freePort(); const site = await startSite(SITE, port);
  try {
    const r = await scan('http://127.0.0.1:' + port, { login: { user: 'admin', password: 'maisonverde2019' } });
    assert.equal(r.findings.length, 15, r.findings.map((f) => f.id).join(','));
  } finally { site.stop(); }
  const j = runJourneys(SITE);
  assert.ok(j.ok, j.output);
  assert.equal(j.pass, 7);
});

test('an edit whose text is absent or ambiguous is refused, an exact one is applied', () => {
  const copy = copySite(SITE);
  const r = applyEdits(copy, [
    { file: 'server.js', find: 'this text is not in the file', replace: 'x' },
    { file: 'server.js', find: 'html(', replace: 'x' }, // many occurrences
    { file: 'server.js', find: "'x-powered-by': 'PHP/7.2.24 WooCommerce/3.5.1', ", replace: '' },
  ]);
  assert.equal(r.refused.length, 2);
  assert.equal(r.applied.length, 1);
  assert.ok(!readFileSync(join(copy, 'server.js'), 'utf8').includes('WooCommerce/3.5.1'));
});

test('a fix that keeps the journeys green and removes the flaw is PROPOSED, never applied to the original', async () => {
  const propose = async () => ({ edits: [{ file: 'server.js', find: "server: 'Apache/2.4.29 (Ubuntu) PHP/7.2.24', 'x-powered-by': 'PHP/7.2.24 WooCommerce/3.5.1', ", replace: '' }], summary: 'drop version headers', risk: 'none' });
  const r = await repairOne({ finding: F02, siteDir: SITE, ask: null, know, propose });
  assert.equal(r.status, 'proposed', r.why);
  assert.ok(r.journeysAfter.ok);
  assert.equal(r.rescan.findings.length, 0);
  assert.ok(readFileSync(join(SITE, 'server.js'), 'utf8').includes('WooCommerce/3.5.1')); // the original is untouched
});

test('a fix that breaks a vital journey is REJECTED', async () => {
  const propose = async () => ({ edits: [{ file: 'server.js', find: "if (path === '/') return html(", replace: "if (path === '/') return [500, {}, 'broken'] || html(" }], summary: 'oops', risk: 'everything' });
  const r = await repairOne({ finding: F02, siteDir: SITE, ask: null, know, propose });
  assert.equal(r.status, 'rejected');
  assert.ok(r.journeysAfter.broken.includes('browse the catalogue'));
});

test('a fix that changes nothing useful is INEFFECTIVE', async () => {
  const propose = async () => ({ edits: [{ file: 'server.js', find: '// Fictional orders', replace: '// Orders' }], summary: 'comment', risk: 'none' });
  const r = await repairOne({ finding: F02, siteDir: SITE, ask: null, know, propose });
  assert.equal(r.status, 'ineffective');
});

test('a proposed fix comes with a unified patch, and the run keeps a hashed journal that detects tampering', async () => {
  const { mkdtempSync, writeFileSync, readFileSync: read } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { repairAll } = await import('./repair.js');
  const { verifyChain } = await import('./chain.js');
  const propose = async () => ({ edits: [{ file: 'server.js', find: "server: 'Apache/2.4.29 (Ubuntu) PHP/7.2.24', 'x-powered-by': 'PHP/7.2.24 WooCommerce/3.5.1', ", replace: '' }], summary: 'drop version headers', risk: 'none' });
  const folder = mkdtempSync(join(tmpdir(), 'mz-chain-'));
  const results = await repairAll({ findings: [F02], siteDir: SITE, ask: null, folder, know, propose });
  assert.equal(results[0].status, 'proposed', results[0].why);
  const patch = read(join(folder, 'F02', 'fix.patch'), 'utf8');
  assert.ok(patch.includes('--- a/server.js') && patch.includes('+++ b/server.js') && patch.includes("-") && patch.includes('WooCommerce/3.5.1'), patch.slice(0, 300));
  assert.deepEqual(verifyChain(folder).ok, true);
  assert.equal(verifyChain(folder).entries, 2); // repair.json + fix.patch
  writeFileSync(join(folder, 'F02', 'repair.json'), '{"status":"proposed","tampered":true}');
  const v = verifyChain(folder);
  assert.equal(v.ok, false); assert.match(v.why, /changed after the run/);
});

test('proposeFix masks the secrets of the code before the model call and restores them in the edits', async () => {
  const { proposeFix } = await import('./repair.js');
  let sent = '';
  const ask = async (messages) => { sent = messages[1].content; const masked = sent.match(/p\.password === '(«SECRET_\d+»)'/); return { text: JSON.stringify({ edits: [{ file: 'server.js', find: "p.password === '" + masked[1] + "'", replace: 'verify(p.password)' }], summary: 'hash ' + masked[1], risk: '' }) }; };
  const fix = await proposeFix({ finding: F02, recommendation: { answer: 'x', sources: [] }, siteDir: SITE, ask });
  assert.ok(!sent.includes('maisonverde2019') && !sent.includes('Verde2019!') && !sent.includes('sk_live_'), 'a secret reached the model');
  assert.ok(fix.secretsMasked >= 3, String(fix.secretsMasked));
  assert.equal(fix.edits[0].find, "p.password === 'maisonverde2019'");
  assert.equal(fix.summary, 'hash maisonverde2019');
});

test('a refused fix is retried once with the reason fed back; the second, different fix is PROPOSED and the first stays in attempts', async () => {
  const seen = [];
  const propose = async ({ previous }) => {
    seen.push(previous);
    if (!previous) return { edits: [{ file: 'server.js', find: "if (path === '/') return html(", replace: "if (path === '/') return [500, {}, 'broken'] || html(" }], summary: 'first, breaks the catalogue', risk: 'all' };
    return { edits: [{ file: 'server.js', find: "server: 'Apache/2.4.29 (Ubuntu) PHP/7.2.24', 'x-powered-by': 'PHP/7.2.24 WooCommerce/3.5.1', ", replace: '' }], summary: 'second, drops version headers', risk: 'none' };
  };
  const r = await repairOne({ finding: F02, siteDir: SITE, ask: null, know, propose });
  assert.equal(r.status, 'proposed', r.why);
  assert.equal(seen.length, 2);
  assert.equal(seen[1].status, 'rejected');
  assert.ok(seen[1].brokenJourneys.includes('browse the catalogue'));
  assert.ok(seen[1].edits[0].replace.includes('broken'));
  assert.equal(r.attempts.length, 1);
  assert.equal(r.fix.summary, 'second, drops version headers');
});

test('with retries=0 a broken fix is rejected at once; the journeys code reaches the model', async () => {
  let calls = 0;
  const propose = async () => { calls += 1; return { edits: [{ file: 'server.js', find: "if (path === '/') return html(", replace: "if (path === '/') return [500, {}, 'broken'] || html(" }], summary: 'oops', risk: 'everything' }; };
  const r = await repairOne({ finding: F02, siteDir: SITE, ask: null, know, propose, retries: 0 });
  assert.equal(r.status, 'rejected'); assert.equal(calls, 1); assert.equal(r.attempts.length, 0);
  const { proposeFix } = await import('./repair.js');
  let sent = null;
  await proposeFix({ finding: F02, recommendation: { answer: 'x', sources: [] }, siteDir: SITE, previous: { status: 'rejected', why: 'breaks' }, ask: async (m) => { sent = JSON.parse(m[1].content); return { text: '{"edits":[]}' }; } });
  assert.ok(sent.journeysCode.includes("name: 'follow my own order'"));
  assert.equal(sent.previous.why, 'breaks');
});
