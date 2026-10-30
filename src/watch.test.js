import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diffReadings, describeVariation, sentinellesSnapshots, clinicalTrialsSnapshot, fileSnapshots, buildReport, watch } from './watch.js';
import { verifyChain } from './chain.js';

const snap = (period, readings) => ({ source: 'S', page: 'https://example.org/bulletin', period, readings });
const r = (key, value, extra = {}) => ({ key, label: key, value, ...extra });

test('a change under the threshold is not a variation', () => {
  const v = diffReadings(snap('W1', [r('a', 100)]), snap('W2', [r('a', 110)]), { threshold: 20 });
  assert.equal(v.length, 0);
});

test('a change over the threshold is reported with its percent and page', () => {
  const v = diffReadings(snap('W1', [r('a', 100, { unit: 'per 100 000' })]), snap('W2', [r('a', 140, { unit: 'per 100 000' })]), { threshold: 20 });
  assert.equal(v.length, 1); assert.equal(v[0].kind, 'change'); assert.equal(v[0].pct, 40); assert.equal(v[0].page, 'https://example.org/bulletin');
  assert.equal(describeVariation(v[0]), 'a: 100 -> 140 per 100 000 (+40 %)');
});

test('crossing a threshold value counts even for a small change, and ranks first', () => {
  const v = diffReadings(snap('W1', [r('t', 37.4, { thresholdValue: 37.5 }), r('b', 1, {}), r('c', 10)]), snap('W2', [r('t', 37.6, { thresholdValue: 37.5 }), r('b', 3), r('c', 10)]), { threshold: 20 });
  assert.equal(v[0].key, 't'); assert.equal(v[0].kind, 'threshold'); assert.match(describeVariation(v[0]), /crossed upward/);
  assert.equal(v[1].key, 'b'); assert.equal(v[1].pct, 200);
});

test('a status that changes, a new key and a gone key are variations', () => {
  const v = diffReadings(snap('D1', [r('s', 'growing'), r('old', 1)]), snap('D2', [r('s', 'declining'), r('new', 5)]));
  assert.deepEqual(v.map((x) => x.kind).sort(), ['gone', 'new', 'status']);
  assert.equal(describeVariation(v.find((x) => x.kind === 'status')), 's: growing -> declining');
});

test('Sentinelles rows become weekly snapshots, oldest first, with the region in the key', () => {
  const api = { data: [
    { week: 202643, indicator: 3, inc100: 94, inc100_low: 78, inc100_up: 110, geo_insee: 'FR', geo_name: 'France' },
    { week: 202642, indicator: 3, inc100: 85, inc100_low: 74, inc100_up: 96, geo_insee: 'FR', geo_name: 'France' },
  ] };
  const s = sentinellesSnapshots(api, { name: 'Sentinelles', page: 'https://www.sentiweb.fr/', indicatorLabel: 'ILI', thresholdValue: 150 });
  assert.deepEqual(s.map((x) => x.period), ['2026-W42', '2026-W43']);
  assert.equal(s[1].readings[0].key, 'ILI.FR'); assert.equal(s[1].readings[0].value, 94); assert.equal(s[1].readings[0].unit, 'per 100 000'); assert.equal(s[1].readings[0].thresholdValue, 150);
});

test('ClinicalTrials.gov studies become status readings with the study page', () => {
  const api = { studies: [{ protocolSection: { identificationModule: { nctId: 'NCT1', briefTitle: 'A vaccine' }, statusModule: { overallStatus: 'RECRUITING', lastUpdatePostDateStruct: { date: '2026-10-22' } }, designModule: { phases: ['PHASE2'] } } }] };
  const [s] = clinicalTrialsSnapshot(api, { name: 'CT', page: 'https://clinicaltrials.gov/' });
  assert.equal(s.readings[0].key, 'NCT1'); assert.equal(s.readings[0].value, 'RECRUITING'); assert.equal(s.readings[0].page, 'https://clinicaltrials.gov/study/NCT1');
});

test('the example probe export replays day by day and flags the incubator drift and the culture decline', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mz-watch-'));
  const source = { name: 'Probe', kind: 'file', path: 'watch/readings.example.json', threshold: 10 };
  const reports = await watch({ source, replay: 3, root });
  assert.equal(reports.length, 3);
  assert.equal(reports[0].period, '2026-10-28'); assert.equal(reports[0].variations.length, 1); assert.equal(reports[0].variations[0].key, 'culture.B.density');
  assert.equal(reports[1].variations[0].key, 'incubator.temp'); assert.equal(reports[1].variations[0].kind, 'threshold');
  const last = reports[2];
  assert.deepEqual(last.variations.map((v) => v.key), ['culture.B.status', 'culture.B.density']);
  assert.ok(existsSync(join(root, 'probe', 'report-2026-10-30.md')));
  assert.match(readFileSync(join(root, 'probe', 'report-2026-10-30.md'), 'utf8'), /replayed from the public history/);
  assert.equal(verifyChain(join(root, 'probe')).ok, true);
});

test('the report says Mission Zero did not act', () => {
  const md = buildReport({ source: { name: 'S', threshold: 20 }, previous: snap('W1', []), current: snap('W2', []), variations: [] });
  assert.match(md, /did not act on the source/);
});

test('file snapshots accept a single snapshot or an array', () => {
  assert.equal(fileSnapshots({ period: 'a', readings: [] }).length, 1);
  assert.equal(fileSnapshots([{ period: 'a' }, { period: 'b' }]).length, 2);
});
