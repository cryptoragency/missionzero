// The flaws must stay reproducible: each one is asserted, so the demo cannot silently lose its target.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './server.js';

test('the shop serves its pages without any security header and with version disclosure', () => {
  const [code, h, body] = handle('GET', '/');
  assert.equal(code, 200);
  assert.ok(body.includes('Lampe Osier'));
  for (const k of ['content-security-policy', 'x-frame-options', 'strict-transport-security']) assert.equal(h[k], undefined);
  assert.match(h['x-powered-by'], /PHP\/7\.2/);
});

test('reflected XSS, client-side price, IDOR and guessable admin cookie are present', () => {
  assert.ok(handle('GET', '/search?q=%3Cb%3Ex%3C%2Fb%3E')[2].includes('<b>x</b>'));
  handle('POST', '/cart', 'id=3&price=1');
  assert.ok(handle('GET', '/cart')[2].includes('Plaid Lin · 1 €'));
  assert.ok(handle('GET', '/order?id=1002')[2].includes('k.benali@example.org'));
  assert.equal(handle('GET', '/admin')[0], 302);
  assert.equal(handle('GET', '/admin', '', { cookie: 'session=admin-7c9e' })[0], 200);
});

test('secrets, backups and customer data are served to anyone', () => {
  assert.match(handle('GET', '/.env')[2], /DB_PASSWORD/);
  assert.match(handle('GET', '/backup/')[2], /wp-config\.php\.bak/);
  assert.match(handle('GET', '/export/customers.csv')[2], /marie\.dupont@example\.org/);
  assert.match(handle('GET', '/robots.txt')[2], /Disallow: \/\.env/);
});
