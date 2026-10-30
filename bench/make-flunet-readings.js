// Turns the WHO FluNet public API (influenza detections by country and ISO week, worldwide) into the generic readings
// format of the watch mode (watch/readings.example.json): one snapshot per week, oldest first, with the world total of
// positive detections, the positivity rate, the number of reporting countries, and the positives by WHO region.
// node bench/make-flunet-readings.js <raw.json from the API> [watch/flunet-monde.json] [--from=30] [--to=42]
// API: https://xmart-api-public.who.int/FLUMART/VIW_FNT?$filter=ISO_YEAR eq 2026 and ISO_WEEK ge 30&$select=COUNTRY_CODE,WHOREGION,ISO_YEAR,ISO_WEEK,ISO_WEEKSTARTDATE,SPEC_PROCESSED_NB,INF_ALL
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const raw = args.find((a) => !a.startsWith('--'));
const out = args.filter((a) => !a.startsWith('--'))[1] || 'watch/flunet-monde.json';
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const from = opt('from', 30), to = opt('to', 42);
const REGION = { AFR: 'Africa', AMR: 'Americas', EMR: 'Eastern Mediterranean', EUR: 'Europe', SEAR: 'South-East Asia', WPR: 'Western Pacific' };
const rows = JSON.parse(readFileSync(raw, 'utf8')).value;
const weeks = new Map();
for (const r of rows) {
  const w = r.ISO_WEEK; if (w < from || w > to) continue;
  if (!weeks.has(w)) weeks.set(w, { year: r.ISO_YEAR, start: r.ISO_WEEKSTARTDATE, pos: 0, spec: 0, countries: 0, reg: {} });
  const b = weeks.get(w), p = r.INF_ALL || 0, s = r.SPEC_PROCESSED_NB || 0;
  if (s > 0 || p > 0) b.countries += 1;
  b.pos += p; b.spec += s;
  const g = r.WHOREGION || 'other'; b.reg[g] = (b.reg[g] || 0) + p;
}
const snapshots = [...weeks.entries()].sort((a, b) => a[0] - b[0]).map(([w, b]) => ({
  source: 'WHO FluNet, influenza detections, world',
  page: 'https://www.who.int/tools/flunet',
  period: `${b.year}-W${String(w).padStart(2, '0')}`,
  readings: [
    { key: 'world.positive', label: 'Influenza-positive specimens, world', value: b.pos, unit: '' },
    { key: 'world.rate', label: 'Positivity rate, world', value: Number(((100 * b.pos) / Math.max(1, b.spec)).toFixed(1)), unit: '%' },
    { key: 'world.countries', label: 'Countries reporting', value: b.countries, unit: '' },
    ...Object.keys(REGION).map((g) => ({ key: `region.${g}`, label: `Influenza-positive specimens, ${REGION[g]}`, value: b.reg[g] || 0, unit: '' })),
  ],
}));
writeFileSync(out, JSON.stringify(snapshots, null, 2));
console.log(out, snapshots.length, 'weeks:', snapshots.map((s) => `${s.period} ${s.readings[0].value}`).join(', '));
