import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
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
