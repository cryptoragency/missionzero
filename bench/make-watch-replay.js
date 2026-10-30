// Turns a watch folder (snapshots + reports) into one self-contained page, in the three forms researchers read at a glance:
// the curve with its threshold (few series), the heatmap of series by period (many series), the control chart for a
// probe (a value with a limit), and under them the variations reported, with the cited explanation when there is one.
// node bench/make-watch-replay.js watch/<source> [out.html]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isPeriod = (f) => /^\d{4}-(W\d{2}|\d{2}-\d{2})\.json$/.test(f);

export function loadWatch(folder) {
  const files = readdirSync(folder);
  const snapshots = files.filter(isPeriod).sort().map((f) => JSON.parse(readFileSync(join(folder, f), 'utf8')));
  const reports = files.filter((f) => /^report-.*\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(folder, f), 'utf8')));
  const series = new Map();
  for (const s of snapshots) for (const r of s.readings || []) {
    if (!series.has(r.key)) series.set(r.key, { key: r.key, label: r.label, unit: r.unit || '', thresholdValue: r.thresholdValue ?? null, numeric: typeof r.value === 'number', points: [] });
    series.get(r.key).points.push({ period: s.period, value: r.value, low: r.low ?? null, high: r.high ?? null, page: r.page || s.page });
  }
  const flagged = new Map(); // key -> Map(period -> variation)
  for (const rep of reports) for (const v of rep.variations || []) { if (!flagged.has(v.key)) flagged.set(v.key, new Map()); flagged.get(v.key).set(rep.period, v); }
  return { source: snapshots[0]?.source || reports[0]?.source || folder, page: snapshots[0]?.page, periods: snapshots.map((s) => s.period), series: [...series.values()], reports, flagged };
}

const fmt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')) : String(v));
const sign = (v) => (v.pct == null ? '' : (v.pct > 0 ? '+' : '') + (v.pct === Infinity ? '∞' : v.pct) + ' %');

// One curve: the value by period, the confidence band when the source gives one, the threshold as a dashed line,
// the reported variations as red dots. The dot of the film only lights where something moved.
function curve(s, flags, { w = 720, h = 220 } = {}) {
  const pad = { l: 56, r: 64, t: 28, b: 36 };
  const pts = s.points.filter((p) => typeof p.value === 'number');
  if (!pts.length) return '';
  const vals = pts.flatMap((p) => [p.value, p.low ?? p.value, p.high ?? p.value]).concat(s.thresholdValue != null ? [s.thresholdValue] : []);
  // The frame hugs the data (a control chart reads its drift at a glance), never below zero, the threshold always inside.
  const mn = Math.min(...vals), mx = Math.max(...vals), range = mx - mn || Math.abs(mx) * 0.1 || 1;
  const lo = Math.max(0, mn - range * 0.35), hi = mx + range * 0.35;
  const X = (i) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, pts.length - 1);
  const Y = (v) => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.value).toFixed(1)}`).join(' ');
  const band = pts.every((p) => p.low != null && p.high != null) ? pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.high).toFixed(1)}`).join(' ') + ' ' + [...pts].reverse().map((p, i) => `L${X(pts.length - 1 - i).toFixed(1)} ${Y(p.low).toFixed(1)}`).join(' ') + ' Z' : '';
  const ticks = [0, 0.5, 1].map((t) => lo + t * (hi - lo));
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="${esc(s.label)}">
  ${ticks.map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="grid"/><text x="${pad.l - 8}" y="${(Y(v) + 4).toFixed(1)}" class="tick" text-anchor="end">${fmt(Math.round(v * 10) / 10)}</text>`).join('')}
  ${band ? `<path d="${band}" class="band"/>` : ''}
  ${s.thresholdValue != null ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(s.thresholdValue).toFixed(1)}" y2="${Y(s.thresholdValue).toFixed(1)}" class="threshold"/><text x="${w - pad.r}" y="${(Y(s.thresholdValue) - 6).toFixed(1)}" class="tick red" text-anchor="end">seuil ${fmt(s.thresholdValue)}${s.unit ? ' ' + esc(s.unit) : ''}</text>` : ''}
  <path d="${line}" class="line"/>
  ${pts.map((p, i) => { const v = flags?.get(p.period); return `<text x="${X(i).toFixed(1)}" y="${h - 12}" class="tick" text-anchor="middle">${esc(p.period.replace(/^\d{4}-/, ''))}</text>` + (v ? `<g class="flag"><circle cx="${X(i).toFixed(1)}" cy="${Y(p.value).toFixed(1)}" r="7" class="dot"/><text x="${X(i).toFixed(1)}" y="${(Y(p.value) - 14).toFixed(1)}" class="flagtxt" text-anchor="middle">${esc(fmt(p.value))} · ${esc(sign(v))}</text></g>` : `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.value).toFixed(1)}" r="3" class="pt"/>`); }).join('')}
</svg>`;
}

// Many series: a grid, one row per series, one column per period, the colour from the lowest to the highest value,
// a red frame on the cells a report flagged. Reads like the map of a surveillance network.
function heatmap(series, periods, flagged) {
  const nums = series.filter((s) => s.numeric);
  const all = nums.flatMap((s) => s.points.map((p) => p.value));
  const lo = Math.min(...all), hi = Math.max(...all);
  const shade = (v) => { const t = hi === lo ? 0 : (v - lo) / (hi - lo); return `rgba(200, 40, 40, ${(0.08 + 0.82 * t).toFixed(2)})`; };
  const rows = [...nums].sort((a, b) => a.label.localeCompare(b.label)).map((s) => {
    const by = new Map(s.points.map((p) => [p.period, p]));
    return `<tr><th>${esc(s.label.replace(/^[^,]+,\s*/, ''))}</th>${periods.map((per) => { const p = by.get(per); if (!p) return '<td></td>'; const v = flagged.get(s.key)?.get(per); return `<td style="background:${shade(p.value)}" class="${v ? 'flagcell' : ''}" title="${esc(s.label)} ${esc(per)} : ${fmt(p.value)}${v ? ' (' + esc(sign(v)) + ')' : ''}">${fmt(p.value)}</td>`; }).join('')}</tr>`;
  }).join('');
  return `<table class="heat"><thead><tr><th></th>${periods.map((p) => `<th>${esc(p.replace(/^\d{4}-/, ''))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
  <p class="legend">Du clair (${fmt(lo)}) au foncé (${fmt(hi)})${nums[0]?.unit ? ', ' + esc(nums[0].unit) : ''}. Cadre rouge : variation signalée dans le rapport de la semaine.</p>`;
}

function statusRow(s, flags) {
  return `<div class="status"><span class="lbl">${esc(s.label)}</span>${s.points.map((p) => `<span class="chip ${flags?.get(p.period) ? 'flagchip' : ''}" title="${esc(p.period)}">${esc(p.period.replace(/^\d{4}-/, ''))} · ${esc(String(p.value))}</span>`).join('')}</div>`;
}

export function renderWatchReplay(w, { title = 'Mission Zero · veille' } = {}) {
  const nums = w.series.filter((s) => s.numeric), strs = w.series.filter((s) => !s.numeric);
  const many = nums.length > 4;
  const charts = many ? heatmap(w.series, w.periods, w.flagged) : nums.map((s) => `<h3>${esc(s.label)}${s.unit ? ` <span class="unit">${esc(s.unit)}</span>` : ''}</h3>${curve(s, w.flagged.get(s.key))}`).join('');
  const statuses = strs.map((s) => statusRow(s, w.flagged.get(s.key))).join('');
    const reportsHtml = [...w.reports].reverse().map((r) => `<li><b>${esc(r.period)}</b>${r.comparedWith ? ` vs ${esc(r.comparedWith)}` : ''} : ${r.variations.length ? r.variations.map((v) => `<span class="var">${esc(many ? v.label.replace(/^[^,]+,s*/, '') : v.label)} ${v.before != null ? esc(fmt(v.before)) + ' → ' : ''}${esc(fmt(v.after))}${v.unit ? ' ' + esc(v.unit) : ''} ${esc(sign(v))}${v.kind === 'threshold' ? ' · seuil franchi' : ''}</span>`).join(', ') : '<span class="quiet">rien n’a bougé</span>'}</li>`).join('');
  const exHtml = w.reports.filter((r) => r.explanation).map((r) => { const ex = r.explanation; return `<section class="explain"><h2>${esc(r.period)} · pourquoi, selon les sources primaires<span class="score">${ex.judge}/10 · ${ex.green} source${ex.green > 1 ? 's' : ''} vérifiée${ex.green > 1 ? 's' : ''} · ${ex.usd.toFixed(3)} $</span></h2><p>${esc(ex.summary)}</p><ul>${(ex.sources || []).map((s) => `<li>${esc(s.contribution)} <a href="${esc(s.url)}">${esc(s.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a></li>`).join('')}</ul>${ex.unproven?.length ? `<p class="unproven"><b>Non prouvé :</b> ${ex.unproven.map(esc).join(' · ')}</p>` : ''}</section>`; }).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)} · ${esc(w.source)}</title>
<style>
body{font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;color:#1b1b1b;background:#fff;margin:0;padding:32px 40px;max-width:900px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px}h3{font-size:14px;margin:20px 0 4px;font-weight:600}.unit{color:#777;font-weight:400}
.sub{color:#666;margin:0 0 16px}.chart{width:100%;height:auto;display:block}
.grid{stroke:#eee}.tick{font-size:11px;fill:#777}.band{fill:#2a6fdb;fill-opacity:.08}.line{fill:none;stroke:#2a6fdb;stroke-width:2}.pt{fill:#2a6fdb}
.threshold{stroke:#c62828;stroke-dasharray:5 4;stroke-width:1.2}.red{fill:#c62828}
.dot{fill:#c62828;animation:pulse 1.6s ease-in-out infinite}.flagtxt{font-size:11.5px;font-weight:600;fill:#c62828}
@keyframes pulse{0%,100%{r:7;opacity:1}50%{r:10;opacity:.6}}
.heat{border-collapse:collapse;font-size:12px;margin-top:8px}.heat th{text-align:left;padding:4px 8px;font-weight:600;color:#444}.heat thead th{text-align:center}
.heat td{padding:4px 6px;text-align:center;min-width:44px;border:2px solid #fff}.flagcell{outline:2px solid #c62828;outline-offset:-2px;font-weight:700}
.legend{color:#666;font-size:12.5px}.status{margin:8px 0}.status .lbl{font-weight:600;margin-right:8px}.chip{display:inline-block;border:1px solid #ccc;border-radius:12px;padding:1px 8px;margin:2px;font-size:12px}.flagchip{border-color:#c62828;color:#c62828;font-weight:600}
.reports li{margin:4px 0}.var{color:#c62828;font-weight:600}.quiet{color:#888}
.explain{border-left:3px solid #2a6fdb;padding:4px 16px;margin-top:24px;background:#f6f9ff}.score{font-size:13px;color:#2a6fdb;font-weight:500;margin-left:8px}.unproven{color:#7a3b00}
footer{margin-top:32px;color:#777;font-size:12.5px}
</style></head><body>
<h1>${esc(w.source)}</h1>
<p class="sub">${w.periods.length} périodes, ${esc(w.periods[0])} à ${esc(w.periods[w.periods.length - 1])}${w.page ? ` · <a href="${esc(w.page)}">page de la source</a>` : ''}${w.reports.some((r) => r.replayed) ? ' · rejoué depuis l’historique public' : ''}</p>
${charts}${statuses}
<h2>Ce qui a bougé, période par période</h2><ul class="reports">${reportsHtml}</ul>
${exHtml}
<footer>Mission Zero a lu et comparé. Il n’a rien fait sur la source. C’est un humain qui décide. Journal haché : chain.json.</footer>
</body></html>`;
}

if (process.argv[1] && /make-watch-replay\.js$/.test(process.argv[1])) {
  const folder = process.argv[2];
  if (!folder) { console.error('Usage: node bench/make-watch-replay.js watch/<source> [out.html]'); process.exit(1); }
  const out = process.argv[3] || join(folder, 'replay.html');
  writeFileSync(out, renderWatchReplay(loadWatch(folder)));
  console.log('written', out);
}
