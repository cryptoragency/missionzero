// The vital journeys of the shop: what a customer must always be able to do.
// They are green on the flawed shop today and MUST stay green after every fix: a repair that breaks one is rejected.
// The repair mode runs them before and after each fix, on a copy, never on the live site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './server.js';

export const JOURNEYS = [
  { name: 'browse the catalogue', run: () => { const [c, , b] = handle('GET', '/'); assert.equal(c, 200); assert.ok(b.includes('Lampe Osier') && b.includes('Plaid Lin')); } },
  { name: 'search an article', run: () => { const [c, , b] = handle('GET', '/search?q=lampe'); assert.equal(c, 200); assert.ok(b.includes('lampe')); } },
  { name: 'add to cart and see the total', run: () => { handle('POST', '/cart', 'id=2&price=45'); const [c, , b] = handle('GET', '/cart'); assert.equal(c, 200); assert.ok(b.includes('Vase Terracotta')); assert.match(b, /Total : \d+ €/); } },
  { name: 'reach the checkout and pay', run: () => { assert.equal(handle('GET', '/checkout')[0], 200); const [c, , b] = handle('POST', '/checkout', 'name=Test&email=t%40example.org&card=4242'); assert.equal(c, 200); assert.ok(b.includes('Commande')); } },
  // The customer places an order, gets a link and whatever cookie the shop sets, and follows that order with them.
  { name: 'follow my own order', run: () => { const [, h, done] = handle('POST', '/checkout', 'name=Test&email=t%40example.org&card=4242'); const link = (done.match(/href="(\/order\?id=\d+)"/) || [])[1]; assert.ok(link, 'no order link after checkout'); const cookie = String(h['set-cookie'] || '').split(';')[0]; const [c, , b] = handle('GET', link, '', { cookie }); assert.equal(c, 200); assert.ok(b.includes('Commande ' + link.split('=')[1])); } },
  { name: 'log in as the administrator', run: () => { const [c, h] = handle('POST', '/login', 'user=admin&password=maisonverde2019'); assert.equal(c, 302); assert.ok(h['set-cookie']); assert.equal(handle('GET', '/admin', '', { cookie: h['set-cookie'] })[0], 200); } },
  { name: 'read the legal notice', run: () => { assert.equal(handle('GET', '/mentions-legales')[0], 200); } },
];

for (const j of JOURNEYS) test('journey: ' + j.name, () => j.run());
