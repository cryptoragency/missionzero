// Hashed evidence journal: every record of a run is chained to the previous one (sha256 of the file + previous hash).
// Anyone can recompute the chain from the folder and see whether a record was altered, removed or reordered after the run.
// Removing the LAST record and rewriting the head is invisible from the folder alone: whoever kept the head (or the count)
// published at the end of the run passes it as expectHead / expectCount, and the truncation is caught.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const sha = (s) => createHash('sha256').update(s).digest('hex');
export const CHAIN_FILE = 'chain.json';
const ZERO = '0'.repeat(64);

// A record of the chain is a file INSIDE the folder: "../x" or an absolute path would hash (or vouch for) anything on disk.
function inside(folder, file) {
  const root = resolve(folder);
  const f = resolve(root, String(file || ''));
  if (!file || !f.startsWith(root + sep)) throw new Error('chain: ' + file + ' is not a file of the evidence folder');
  return f;
}

// Appends one entry for `file` (a path relative to `folder`) and returns the new chain head.
// The chain is verified first: appending to a broken chain would give a fresh, valid-looking head to altered records.
export function appendChain(folder, file, meta = {}) {
  const path = join(folder, CHAIN_FILE);
  if (existsSync(path)) { const v = verifyChain(folder); if (!v.ok) throw new Error('chain: cannot append to a broken chain (' + v.why + ')'); }
  const chain = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { entries: [], head: '' };
  const content = readFileSync(inside(folder, file));
  const fileHash = sha(content);
  const prev = chain.head || ZERO;
  const hash = sha(prev + '\n' + file + '\n' + fileHash);
  chain.entries.push({ n: chain.entries.length + 1, file, fileHash, prev, hash, at: new Date().toISOString(), ...meta });
  chain.head = hash;
  writeFileSync(path, JSON.stringify(chain, null, 2));
  return hash;
}

// Recomputes every link: a false `ok` names the first entry that no longer matches its file or its predecessor.
// Every answer carries head and entries, so a report always shows what a reader can compare with the published values.
export function verifyChain(folder, { expectHead = null, expectCount = null } = {}) {
  const path = join(folder, CHAIN_FILE);
  if (!existsSync(path)) return { ok: false, why: 'no chain file', entries: 0, head: null };
  let chain;
  try { chain = JSON.parse(readFileSync(path, 'utf8')); } catch { return { ok: false, why: 'chain file unreadable', entries: 0, head: null }; }
  const entries = Array.isArray(chain.entries) ? chain.entries : [];
  const head = chain.head || null;
  const fail = (why, at) => ({ ok: false, why, ...(at ? { at } : {}), entries: entries.length, head });
  let prev = ZERO;
  for (const [i, e] of entries.entries()) {
    if (e.n !== i + 1) return fail('entry ' + (i + 1) + ' is numbered ' + e.n + ' (removed or reordered)', i + 1);
    let f;
    try { f = inside(folder, e.file); } catch (err) { return fail(err.message, e.n); }
    if (!existsSync(f)) return fail('missing file ' + e.file, e.n);
    const fileHash = sha(readFileSync(f));
    if (fileHash !== e.fileHash) return fail('file changed after the run: ' + e.file, e.n);
    if (e.prev !== prev) return fail('broken link before entry ' + e.n, e.n);
    const hash = sha(prev + '\n' + e.file + '\n' + fileHash);
    if (hash !== e.hash) return fail('hash mismatch at entry ' + e.n, e.n);
    prev = hash;
  }
  const last = entries.length ? entries[entries.length - 1].hash : '';
  if ((chain.head || '') !== last) return fail('head does not match the last entry');
  if (expectCount !== null && entries.length !== Number(expectCount)) return fail(`the chain has ${entries.length} entries, ${expectCount} expected (truncated or extended after the run)`);
  if (expectHead && head !== expectHead) return fail('the head is not the one published at the end of the run (truncated or rewritten)');
  return { ok: true, head, entries: entries.length };
}
