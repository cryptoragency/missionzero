// Hashed evidence journal: every record of a run is chained to the previous one (sha256 of the file + previous hash).
// Anyone can recompute the chain from the folder and see whether a record was altered, removed or reordered after the run.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const sha = (s) => createHash('sha256').update(s).digest('hex');
export const CHAIN_FILE = 'chain.json';

// Appends one entry for `file` (a path relative to `folder`) and returns the new chain head.
export function appendChain(folder, file, meta = {}) {
  const path = join(folder, CHAIN_FILE);
  const chain = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { entries: [], head: '' };
  const content = readFileSync(join(folder, file));
  const fileHash = sha(content);
  const prev = chain.head || '0'.repeat(64);
  const hash = sha(prev + '\n' + file + '\n' + fileHash);
  chain.entries.push({ n: chain.entries.length + 1, file, fileHash, prev, hash, at: new Date().toISOString(), ...meta });
  chain.head = hash;
  writeFileSync(path, JSON.stringify(chain, null, 2));
  return hash;
}

// Recomputes every link: a false `ok` names the first entry that no longer matches its file or its predecessor.
export function verifyChain(folder) {
  const path = join(folder, CHAIN_FILE);
  if (!existsSync(path)) return { ok: false, why: 'no chain file', entries: 0 };
  const chain = JSON.parse(readFileSync(path, 'utf8'));
  let prev = '0'.repeat(64);
  for (const e of chain.entries) {
    const f = join(folder, e.file);
    if (!existsSync(f)) return { ok: false, why: 'missing file ' + e.file, at: e.n, entries: chain.entries.length };
    const fileHash = sha(readFileSync(f));
    if (fileHash !== e.fileHash) return { ok: false, why: 'file changed after the run: ' + e.file, at: e.n, entries: chain.entries.length };
    if (e.prev !== prev) return { ok: false, why: 'broken link before entry ' + e.n, at: e.n, entries: chain.entries.length };
    const hash = sha(prev + '\n' + e.file + '\n' + fileHash);
    if (hash !== e.hash) return { ok: false, why: 'hash mismatch at entry ' + e.n, at: e.n, entries: chain.entries.length };
    prev = hash;
  }
  if (chain.head !== prev) return { ok: false, why: 'head does not match the last entry', entries: chain.entries.length };
  return { ok: true, head: chain.head, entries: chain.entries.length };
}
