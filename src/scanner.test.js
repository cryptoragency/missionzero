import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { scan, proveOwnership, isLocal } from './scanner.js';

const TOKEN = 'mz-owner-0123456789abcdef';
// A site that serves the owner token, reachable through 127.0.0.2 (loopback, not in the local list) to play a remote host.
function serve(token) {
  return new Promise((res) => {
    const s = createServer((req, r) => {
      if (req.url === '/.well-known/mission-zero.txt' && token) { r.writeHead(200); return r.end(token); }
      r.writeHead(req.url === '/.well-known/mission-zero.txt' ? 404 : 200); r.end('<html>shop</html>');
    });
    s.listen(0, '0.0.0.0', () => res({ base: 'http://127.0.0.2:' + s.address().port, stop: () => s.close() }));
  });
}

test('a local address is owned by definition', () => {
  assert.ok(isLocal('http://127.0.0.1:3000')); assert.ok(isLocal('http://localhost:3000'));
  assert.ok(!isLocal('https://shop.example')); assert.ok(!isLocal('not a url'));
});

test('a remote host is refused without an owner token: no probe runs', async () => {
  await assert.rejects(() => scan('https://shop.example.invalid', { ownerToken: '' }), /scan refused: https:\/\/shop.example.invalid is not a site you proved you own \(no owner token/);
  await assert.rejects(() => scan('https://shop.example.invalid', { ownerToken: 'short' }), /no owner token of 16 characters/);
});

test('a remote host is refused when it does not serve the token, accepted when it does', async () => {
  const silent = await serve(null);
  try {
    const p = await proveOwnership(silent.base, TOKEN);
    assert.equal(p.ok, false); assert.match(p.why, /answered 404/);
    await assert.rejects(() => scan(silent.base, { ownerToken: TOKEN }), /scan refused/);
  } finally { silent.stop(); }
  const wrong = await serve('someone-else-token-xxxxxxxx');
  try { const p = await proveOwnership(wrong.base, TOKEN); assert.equal(p.ok, false); assert.match(p.why, /not yours/); } finally { wrong.stop(); }
  const mine = await serve(TOKEN);
  try {
    const r = await scan(mine.base, { ownerToken: TOKEN, only: ['missing-hsts'] });
    assert.equal(r.owner, '/.well-known/mission-zero.txt'); assert.equal(r.findings.length, 1);
  } finally { mine.stop(); }
});
