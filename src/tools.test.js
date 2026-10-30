import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPage, checkUrl, isPrivateAddress, safeFetch, webSearch, readBody } from './tools.js';

test('readPage refuses this machine before any request: 127.0.0.1, localhost, ::1', async () => {
  for (const url of ['http://127.0.0.1:1', 'http://localhost:8098/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/', 'http://0.0.0.0/']) {
    const r = await readPage(url);
    assert.equal(r.ok, false, url); assert.match(r.error, /refused/, url);
  }
});

test('the private, loopback and link-local ranges are refused, public addresses pass', () => {
  for (const ip of ['127.0.0.1', '127.9.9.9', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', 'fc00::1', 'fd12::3', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1'])
    assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ['93.184.216.34', '172.32.0.1', '8.8.8.8', '2606:4700::6810:84e5']) assert.equal(isPrivateAddress(ip), false, ip);
});

test('a public name that resolves to a private address is refused; other schemes are refused', async () => {
  const toLoopback = async () => ['127.0.0.1'];
  const mixed = async () => ['93.184.216.34', '10.0.0.5'];
  assert.match((await checkUrl('https://evil.example/', { lookup: toLoopback, allowLocal: false })).why, /resolves to 127\.0\.0\.1/);
  assert.match((await checkUrl('https://evil.example/', { lookup: mixed, allowLocal: false })).why, /resolves to 10\.0\.0\.5/);
  assert.equal((await checkUrl('https://ok.example/', { lookup: async () => ['93.184.216.34'], allowLocal: false })).ok, true);
  assert.match((await checkUrl('file:///etc/passwd', { allowLocal: false })).why, /scheme not allowed/);
  assert.match((await checkUrl('ftp://x.example/', { allowLocal: false })).why, /scheme not allowed/);
  assert.equal((await checkUrl('http://127.0.0.1:1', { allowLocal: true })).ok, true); // MZ_ALLOW_LOCAL=1
});

test('a redirect to a private address is refused at the hop, and more than 5 redirects are refused', async () => {
  const hops = [];
  const toMeta = async (u) => { hops.push(u); return new Response('', { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } }); };
  const r = await readPage('https://public.example/a', { fetchFn: toMeta });
  assert.equal(r.ok, false); assert.match(r.error, /169\.254\.169\.254 is not a public address/); assert.equal(hops.length, 1);
  let n = 0;
  const loop = async () => new Response('', { status: 301, headers: { location: '/next' + (n++) } });
  const l = await safeFetch('https://public.example/', {}, { fetchFn: loop });
  assert.match(l.refused, /more than 5 redirects/); assert.equal(n, 6);
  const ok = await safeFetch('https://public.example/', {}, { fetchFn: async (u) => (u.endsWith('/final') ? new Response('fine') : new Response('', { status: 302, headers: { location: '/final' } })) });
  assert.equal(ok.url, 'https://public.example/final'); assert.equal(await ok.response.text(), 'fine');
});

test('a body larger than the cap is cut while streaming (page) or refused (declared length, pdf)', async () => {
  let pulled = 0;
  const big = new ReadableStream({ pull(c) { pulled += 1; c.enqueue(new Uint8Array(64 * 1024).fill(97)); if (pulled > 200) c.close(); } });
  const r = await readBody(new Response(big), 100000, { truncate: true });
  assert.equal(r.buf.length, 100000); assert.ok(pulled < 10, 'the stream was read to the end: ' + pulled);
  const declared = new Response('x', { headers: { 'content-length': String(30 * 1024 * 1024) } });
  assert.equal((await readBody(declared, 1024)).tooLarge, true);
  const html = 'A page sentence long enough to be kept as text by the reader of Mission Zero. '.repeat(30000); // about 2.3 MB
  const page = await readPage('https://big.example/', { fetchFn: async () => new Response(html, { headers: { 'content-type': 'text/html' } }), maxChars: 10 ** 7 });
  assert.equal(page.ok, true); assert.ok(page.text.length <= 1500000, String(page.text.length));
});

test('webSearch goes through the same guard and parses the results', async () => {
  const html = '<div class="result results_links"><a class="result__a" href="x">OWASP</a><a class="result__snippet">Cheat sheet</a> uddg=https%3A%2F%2Fowasp.org%2Fx&amp;</div>';
  let init = null;
  const r = await webSearch('csp', { fetchFn: async (u, i) => { init = i; return new Response(html, { headers: { 'content-type': 'text/html' } }); } });
  assert.equal(r.ok, true); assert.equal(r.results[0].url, 'https://owasp.org/x');
  assert.equal(init.redirect, 'manual'); assert.ok(init.signal, 'a deadline is set');
});
