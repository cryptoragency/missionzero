// One evidence folder per run, named to the SECOND, never shared: two missions started in the same
// minute used to write into the same folder (journal mixed, final answer overwritten, 2026-10-30).
// If two runs start in the same second, the second gets a -2 suffix, and so on.
import { existsSync, mkdirSync } from 'node:fs';

export function evidenceFolder(prefix = '', { root = 'evidence', now = new Date(), exists = existsSync } = {}) {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  let dir = `${root}/${prefix}${stamp}`;
  for (let n = 2; exists(dir); n += 1) dir = `${root}/${prefix}${stamp}-${n}`;
  mkdirSync(dir, { recursive: true });
  return dir;
}
