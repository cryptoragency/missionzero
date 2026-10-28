import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskSecrets, maskDeep } from './secrets.js';

test('env lines, PHP defines, JS passwords and Stripe keys are masked, nothing else', () => {
  const code = "DB_PASSWORD=Verde2019!\nSMTP_PASSWORD=jardin\nSTRIPE_SECRET=sk_live_EXAMPLE_NOT_REAL\ndefine('DB_PASSWORD', 'Verde2019!');\nif (p.password === 'maisonverde2019') ok();\nconst port = 8098;";
  const { text, masked } = maskSecrets(code);
  for (const s of ['Verde2019!', 'jardin', 'sk_live_', 'maisonverde2019']) assert.ok(!text.includes(s), s + ' still in: ' + text);
  const env = text.match(/DB_PASSWORD=(«SECRET_\d+»)/); assert.ok(env, text);
  assert.ok(text.includes("define('DB_PASSWORD', '" + env[1] + "')"), text); // same value, same placeholder
  assert.ok(text.includes('const port = 8098;'));
  assert.equal(masked, 4);
});

test('restore turns the placeholders back into the originals, so an exact edit still applies', () => {
  const code = "if (p.user === 'admin' && p.password === 'maisonverde2019') return admin();";
  const { text, restore } = maskSecrets(code);
  const modelFind = text.slice(text.indexOf('p.password'), text.indexOf(') return'));
  assert.match(modelFind, /«SECRET_\d+»/);
  assert.equal(restore(modelFind), "p.password === 'maisonverde2019'");
});

test('maskDeep masks every string of an object with one numbering and restores', () => {
  const { value, masked, restore } = maskDeep({ finding: { evidence: 'STRIPE_SECRET=sk_live_abc123456' }, code: { 'server.js': "token: 'sk_live_abc123456'" }, n: 3 });
  assert.equal(masked, 1);
  assert.equal(value.n, 3);
  assert.ok(!JSON.stringify(value).includes('sk_live_abc'));
  assert.equal(restore(value.finding.evidence), 'STRIPE_SECRET=sk_live_abc123456');
});

test('a text without secrets is returned unchanged', () => {
  const t = 'Content-Security-Policy: default-src self; the password field must be of type password.';
  assert.equal(maskSecrets(t).text, t);
  assert.equal(maskSecrets(t).masked, 0);
});
