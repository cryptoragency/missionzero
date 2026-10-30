// One evidence folder per run, named to the SECOND, never shared: two missions started in the same
// minute used to write into the same folder (journal mixed, final answer overwritten, 2026-10-30).
// If two runs start in the same second, the second gets a -2 suffix, and so on. The folder is claimed by
// mkdir itself (no recursive, so it fails with EEXIST when taken): checking existsSync first left a window
// in which two processes could both pick the same name.
import { mkdirSync } from 'node:fs';

export function evidenceFolder(prefix = '', { root = 'evidence', now = new Date(), mkdir = mkdirSync } = {}) {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  mkdir(root, { recursive: true }); // the parent may exist already; only the run folder must be new
  for (let n = 1; n < 1000; n += 1) {
    const dir = `${root}/${prefix}${stamp}${n === 1 ? '' : '-' + n}`;
    try { mkdir(dir); return dir; } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  throw new Error(`no free evidence folder for ${prefix}${stamp} in ${root}`);
}
