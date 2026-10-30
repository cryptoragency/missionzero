import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendChain, verifyChain, CHAIN_FILE } from './chain.js';

function run3() {
  const folder = mkdtempSync(join(tmpdir(), 'mz-chain-t-'));
  for (const n of ['a', 'b', 'c']) { writeFileSync(join(folder, n + '.json'), '{"n":"' + n + '"}'); appendChain(folder, n + '.json'); }
  return folder;
}

test('an intact chain is ok and always reports its head and count', () => {
  const folder = run3();
  const v = verifyChain(folder);
  assert.equal(v.ok, true); assert.equal(v.entries, 3); assert.match(v.head, /^[0-9a-f]{64}$/);
  assert.equal(verifyChain(folder, { expectHead: v.head, expectCount: 3 }).ok, true);
});

test('removing the last entry and rewriting the head is caught when the count (or head) published at the end is given', () => {
  const folder = run3();
  const published = verifyChain(folder);
  const chain = JSON.parse(readFileSync(join(folder, CHAIN_FILE), 'utf8'));
  chain.entries.pop(); chain.head = chain.entries[chain.entries.length - 1].hash;
  writeFileSync(join(folder, CHAIN_FILE), JSON.stringify(chain));
  // From the folder alone the shorter chain is consistent, but the report shows the new head and count to compare.
  const alone = verifyChain(folder);
  assert.equal(alone.ok, true); assert.equal(alone.entries, 2); assert.notEqual(alone.head, published.head);
  const counted = verifyChain(folder, { expectCount: 3 });
  assert.equal(counted.ok, false); assert.match(counted.why, /2 entries, 3 expected/); assert.equal(counted.entries, 2); assert.ok(counted.head);
  assert.equal(verifyChain(folder, { expectHead: published.head }).ok, false);
});

test('a head that does not match the last entry, or a removed middle entry, breaks the chain', () => {
  const folder = run3();
  const chain = JSON.parse(readFileSync(join(folder, CHAIN_FILE), 'utf8'));
  writeFileSync(join(folder, CHAIN_FILE), JSON.stringify({ ...chain, head: chain.entries[0].hash }));
  assert.match(verifyChain(folder).why, /head does not match the last entry/);
  chain.entries.splice(1, 1);
  writeFileSync(join(folder, CHAIN_FILE), JSON.stringify(chain));
  assert.equal(verifyChain(folder).ok, false);
});

test('appendChain refuses a file outside the folder and refuses to extend a broken chain', () => {
  const folder = run3();
  assert.throws(() => appendChain(folder, '../outside.json'), /not a file of the evidence folder/);
  assert.throws(() => appendChain(folder, join(tmpdir(), 'abs.json')), /not a file of the evidence folder/);
  writeFileSync(join(folder, 'b.json'), '{"tampered":true}');
  writeFileSync(join(folder, 'd.json'), '{}');
  assert.throws(() => appendChain(folder, 'd.json'), /broken chain \(file changed after the run: b.json\)/);
});

test('an entry naming a file outside the folder is refused by the verifier', () => {
  const folder = run3();
  const chain = JSON.parse(readFileSync(join(folder, CHAIN_FILE), 'utf8'));
  chain.entries[0].file = '../../etc/passwd';
  writeFileSync(join(folder, CHAIN_FILE), JSON.stringify(chain));
  const v = verifyChain(folder);
  assert.equal(v.ok, false); assert.match(v.why, /not a file of the evidence folder/);
});
