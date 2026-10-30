import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evidenceFolder } from './evidenceDir.js';

test('two runs started in the same second get two different folders', () => {
  const root = mkdtempSync(join(tmpdir(), 'mz-evidence-'));
  try {
    const now = new Date('2026-10-30T18:59:07.000Z');
    const a = evidenceFolder('', { root, now });
    const b = evidenceFolder('', { root, now });
    const c = evidenceFolder('repair-', { root, now });
    assert.equal(a, `${root}/2026-10-30-18-59-07`);
    assert.equal(b, `${root}/2026-10-30-18-59-07-2`);
    assert.equal(c, `${root}/repair-2026-10-30-18-59-07`);
    assert.ok(existsSync(a) && existsSync(b) && existsSync(c));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a folder taken by another process between the check and the creation goes to the next suffix', () => {
  const root = mkdtempSync(join(tmpdir(), 'mz-evidence-'));
  try {
    const now = new Date('2026-10-30T18:59:07.000Z');
    // The other process wins the race: the folder appears right before our mkdir, which must then fail with EEXIST.
    const racing = (dir, opts) => { if (!opts && dir.endsWith('18-59-07')) mkdirSync(dir); return mkdirSync(dir, opts); };
    assert.equal(evidenceFolder('', { root, now, mkdir: racing }), `${root}/2026-10-30-18-59-07-2`);
    const denied = () => { const e = new Error('EACCES'); e.code = 'EACCES'; throw e; };
    assert.throws(() => evidenceFolder('', { root, now, mkdir: (d, o) => (o ? mkdirSync(d, o) : denied()) }), /EACCES/); // another error is not hidden
  } finally { rmSync(root, { recursive: true, force: true }); }
});
