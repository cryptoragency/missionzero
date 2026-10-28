// Turns one repaired finding into a self-contained animated page: the repair replayed control by control, from its evidence.
// node bench/make-repair-replay.js evidence/repair-<date> F14 [out.html] [--scenes=ms,ms,...]
// Scenes: title, the finding, the researched fix (sources), the patch, the journeys, the rescan, the look (vision), the
// agent's own review, the refused attempts (when any), the result. Screenshots are embedded, nothing is fetched.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const dataUrl = (p) => (p && existsSync(p) ? 'data:image/png;base64,' + readFileSync(p).toString('base64') : null);

export function loadRepair(folder, id) {
  const r = JSON.parse(readFileSync(join(folder, id, 'repair.json'), 'utf8'));
  const shots = (list) => (list || []).map((s) => ({ name: s.name, src: dataUrl(s.path) || dataUrl(join(folder, id, s.path.split(/[\\/]/).slice(-2).join('/'))) }));
  const vision = r.vision ? { look: r.vision.look, sam: r.vision.sam, before: shots(r.vision.shots?.before), after: shots(r.vision.shots?.after) } : null;
  const byUrl = new Map((r.recommendation?.verification || []).map((v) => [v.url, v]));
  const sources = (r.recommendation?.sources || []).map((s) => ({ url: s.url, host: host(s.url), claim: s.contribution, verdict: byUrl.get(s.url)?.verdict || null, quote: byUrl.get(s.url)?.detail || '' }));
  const patch = String(r.patch || '').split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l)).slice(0, 18);
  const journeys = (() => { try { return [...readFileSync(join(folder, '..', '..', 'demo-site', 'journeys.test.js'), 'utf8').matchAll(/name: '([^']+)'/g)].map((m) => m[1]); } catch { return []; } })();
  return { id, finding: r.finding, status: r.status, why: r.why, rec: { answer: r.recommendation?.answer, score: r.recommendation?.score, green: r.recommendation?.green, red: r.recommendation?.red, sources }, fix: { summary: r.fix?.summary, risk: r.fix?.risk, masked: r.fix?.secretsMasked, edits: (r.fix?.applied || []).length }, patch, journeys, journeysAfter: r.journeysAfter, rescan: r.rescan ? { gone: !(r.rescan.findings || []).length } : null, vision, review: r.review || null, attempts: (r.attempts || []).map((a) => ({ status: a.status, why: a.why, broken: a.brokenJourneys || [] })), reservations: r.reservations || [], ms: r.ms };
}

export function renderRepairReplay(run, { scenes = null, title = 'Mission Zero' } = {}) {
  const hasVision = !!(run.vision && run.vision.look);
  const hasAttempts = run.attempts.length > 0;
  const defaults = [5000, 8000, 9000, 9000, 9000, 6000, ...(hasVision ? [10000] : []), 8000, ...(hasAttempts ? [9000] : []), 9000, 6000];
  const durations = scenes && scenes.length ? scenes : defaults;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · repair replay ${esc(run.id)}</title>
<style>
:root{--bg:#0a0e18;--panel:#111a2c;--line:#263552;--tx:#f3f6fc;--mut:#9fb0d3;--gold:#e5bd52;--ok:#5fe09a;--red:#ff6b7a;--blue:#6fb3ff;--warn:#ffb454}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--tx);font:20px/1.45 "Segoe UI",Inter,Arial,sans-serif;overflow:hidden}
#stage{position:relative;width:100vw;height:100vh;padding:34px 56px;display:flex;flex-direction:column;gap:18px}
header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:12px}
header .brand{font-weight:700;font-size:26px;letter-spacing:.02em}header .brand span{color:var(--gold)}
header .meters{display:flex;gap:26px;font-size:17px;color:var(--mut)}header .meters b{color:var(--tx)}
#sub{font-size:21px;color:var(--mut)}#sub b{color:var(--tx)}
#scene{flex:1;position:relative}
.card{position:absolute;inset:0;display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(18px);transition:opacity .5s,transform .5s}
.card.on{opacity:1;transform:none}
.title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px}
.title h1{font-size:64px;margin:0}.title h1 span{color:var(--gold)}.title p{font-size:28px;color:var(--mut);margin:0;max-width:900px}.title small{font-size:18px;color:var(--mut)}
.head{display:flex;align-items:baseline;gap:16px}.head h2{margin:0;font-size:30px}.head span{color:var(--mut)}
.step{display:grid;grid-template-columns:170px 1fr;gap:16px;align-items:start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 20px;opacity:0;transform:translateX(-14px);transition:opacity .45s,transform .45s}
.step.on{opacity:1;transform:none}.step .k{color:var(--gold);font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:15px;padding-top:4px}.step .v{min-width:0}
.mono{font-family:Consolas,monospace;font-size:17px;color:var(--blue);word-break:break-all}
.sev{display:inline-block;border-radius:999px;padding:2px 12px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--line);margin-right:10px}
.sev.critical{color:#ff9aa6;border-color:#ff9aa6}.sev.high{color:#ffc48a;border-color:#ffc48a}.sev.medium{color:#f0dc8a;border-color:#f0dc8a}.sev.low{color:#9fd0ff;border-color:#9fd0ff}
.src{display:grid;grid-template-columns:36px 1fr;gap:14px;align-items:start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 18px;opacity:0;transition:opacity .5s}
.src.on{opacity:1}.dot{width:26px;height:26px;border-radius:50%;background:#2a3858;margin-top:4px;transition:background .4s}.dot.g{background:var(--ok);box-shadow:0 0 18px var(--ok)}.dot.r{background:var(--red)}
.src .u{color:var(--blue);font-family:Consolas,monospace;font-size:16px}.src q{display:block;color:var(--mut);font-style:italic;margin-top:4px;font-size:17px}
.diff{background:#0d1322;border:1px solid var(--line);border-radius:14px;padding:14px 18px;font-family:Consolas,monospace;font-size:16px;line-height:1.5;overflow:hidden;flex:1}
.diff div{opacity:0;transition:opacity .3s;white-space:pre-wrap;word-break:break-all}.diff div.on{opacity:1}.diff .add{color:#b8f0cf;background:#102a1c}.diff .del{color:#ffb3bb;background:#2a1419}
.jl{display:grid;grid-template-columns:1fr 1fr;gap:10px}.j{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px;opacity:0;transition:opacity .4s}.j.on{opacity:1}
.j i{width:16px;height:16px;border-radius:50%;background:#2a3858;flex:none;transition:background .4s}.j.ok i{background:var(--ok);box-shadow:0 0 12px var(--ok)}.j.bad i{background:var(--red);box-shadow:0 0 12px var(--red)}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:18px;flex:1;min-height:0}.shot{display:flex;flex-direction:column;gap:8px;min-height:0}.shot img{width:100%;height:100%;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:12px;min-height:0}
.shot small{color:var(--mut);font-size:16px}
.verdict{font-size:24px;background:var(--panel);border:1px solid var(--line);border-left:5px solid var(--gold);border-radius:14px;padding:16px 22px}.verdict.ok{border-left-color:var(--ok)}.verdict.bad{border-left-color:var(--red)}.verdict.warn{border-left-color:var(--warn)}
.big{display:flex;gap:40px;align-items:center;justify-content:center;flex:1}.big .n{text-align:center;display:flex;flex-direction:column;gap:18px;max-width:1100px}.big .n b{display:block;font-size:72px;line-height:1.05}.big .n span{color:var(--mut);font-size:20px;line-height:1.4}
.big .ok b{color:var(--ok)}.big .gold b{color:var(--gold)}.big .warn b{color:var(--warn)}.big .red b{color:var(--red)}
footer{display:flex;justify-content:space-between;color:var(--mut);font-size:15px;border-top:1px solid var(--line);padding-top:10px}
#prog{position:absolute;left:0;bottom:0;height:4px;background:var(--gold);width:0}#ctrl{position:absolute;right:16px;bottom:10px;color:var(--mut);font-size:13px}
</style></head><body>
<div id="stage">
<header><div class="brand">MISSION <span>ZERO</span> · repair</div><div class="meters"><div>finding <b>${esc(run.id)}</b></div><div>controls passed <b id="m-ctl">0</b></div><div>status <b id="m-st">…</b></div></div></header>
<div id="sub"></div>
<div id="scene"></div>
<footer><div>Nothing here is staged: every verdict comes from the evidence folder of this repair.</div><div>CRYPTOR.AGENCY · Meta Global AI Developer Hackathon 2026</div></footer>
<div id="prog"></div><div id="ctrl">space: pause · ←/→: scene</div>
</div>
<script>
const R = ${JSON.stringify(run)};
const DUR = ${JSON.stringify(durations)};
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let paused = false, cur = -1, token = 0, passed = 0;
const ctl = (n) => { passed = n; $('#m-ctl').textContent = n; };
function reveal(el, delay) { return new Promise((r) => setTimeout(() => { el.classList.add('on'); r(); }, delay)); }
const step = (k, v) => '<div class="step"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
const head = (h, s) => '<div class="head"><h2>' + h + '</h2><span>' + s + '</span></div>';
const title = (h, p, s) => '<div class="title"><h1>' + h + '</h1><p>' + p + '</p>' + (s ? '<small>' + s + '</small>' : '') + '</div>';
async function steps(card, dur) { const list = card.querySelectorAll('.step, .src, .j, .diff div'); const gap = Math.min(1400, dur / (list.length + 1)); for (const s of list) await reveal(s, gap); }
const f = R.finding;
const SCENES = [
  { html: title('A flaw comes in.<br>A <span>proven</span> fix comes out.', 'Mission Zero repairs a website from a scanner\\'s finding, on a copy, with every control replayed.', 'Maison Verde, a fictional shop built with 15 common flaws'), run: async () => { $('#sub').innerHTML = ''; } },
  { html: head('The finding', 'from the scanner, as any scanner writes it') + step('flaw', '<span class="sev ' + esc(f.severity) + '">' + esc(f.severity) + '</span><b>' + esc(f.id) + '</b> · <span class="mono">' + esc(f.type) + '</span>') + step('where', '<span class="mono">' + esc(f.url) + '</span>') + step('evidence', esc(f.evidence)) + step('risk', esc(f.description)), run: async (c, d) => { $('#sub').innerHTML = '<b>' + esc(f.id) + '</b> · ' + esc(f.type) + ' · ' + esc(f.severity); await steps(c, d); } },
  { html: head('The fix, researched', 'primary sources, each one re-read and quoted') + '<div class="verdict">' + esc(R.rec.answer || '').slice(0, 320) + '</div>' + R.rec.sources.slice(0, 4).map((s) => '<div class="src" data-v="' + (s.verdict === 'supported' ? 'g' : s.verdict ? 'r' : '') + '"><div class="dot"></div><div><div>' + esc(s.claim) + '</div><div class="u">' + esc(s.host) + '</div>' + (s.quote ? '<q>' + esc(s.quote).slice(0, 160) + '</q>' : '') + '</div></div>').join(''), run: async (c, d) => { const items = c.querySelectorAll('.src'); const gap = Math.min(1800, d / (items.length + 1)); for (const it of items) { await reveal(it, gap * 0.5); await sleep(gap * 0.5); if (it.dataset.v) it.querySelector('.dot').classList.add(it.dataset.v); } $('#sub').innerHTML = '<b>judge ' + esc(R.rec.score) + ' / 10</b> · ' + esc(R.rec.green) + ' verified source' + (R.rec.green === 1 ? '' : 's'); } },
  { html: head('The patch', 'exact-string edits on a COPY of the site, never on the site itself') + '<div class="verdict">' + esc(R.fix.summary) + '</div><div class="diff">' + R.patch.map((l) => '<div class="' + (l[0] === '+' ? 'add' : 'del') + '">' + esc(l) + '</div>').join('') + '</div>', run: async (c, d) => { $('#sub').innerHTML = '<b>' + R.fix.edits + ' edit' + (R.fix.edits === 1 ? '' : 's') + '</b> applied to the copy · ' + R.fix.masked + ' secret' + (R.fix.masked === 1 ? '' : 's') + ' masked before the model call'; await steps(c, d); } },
  { html: head('The vital journeys', 'the customer\\'s own tests, replayed on the repaired copy') + '<div class="jl">' + R.journeys.map((j) => '<div class="j" data-ok="' + ((R.journeysAfter && R.journeysAfter.broken || []).includes(j) ? 'bad' : 'ok') + '"><i></i><span>' + esc(j) + '</span></div>').join('') + '</div>', run: async (c, d) => { const items = c.querySelectorAll('.j'); const gap = Math.min(1100, d / (items.length + 1)); for (const it of items) { await reveal(it, gap * 0.6); await sleep(gap * 0.4); it.classList.add(it.dataset.ok); } const ja = R.journeysAfter; $('#sub').innerHTML = ja ? '<b>' + ja.pass + ' / ' + (ja.pass + ja.fail) + '</b> journeys green' : ''; if (ja && ja.ok) ctl(passed + 1); } },
  { html: head('The rescan', 'the scanner runs again on the copy, for this flaw only') + '<div class="big"><div class="n ' + (R.rescan && R.rescan.gone ? 'ok' : 'red') + '"><b>' + (R.rescan && R.rescan.gone ? 'gone' : 'still there') + '</b><span>' + esc(f.id) + ' on the repaired copy</span></div></div>', run: async () => { if (R.rescan && R.rescan.gone) ctl(passed + 1); } },
  ...(hasVisionScene() ? [{ html: head('The look', 'Muse Spark looks at the repaired pages as a customer; SAM 3.1 counts the fields') + '<div class="shots">' + shotHtml(R.vision.before[1] || R.vision.before[0], 'before the fix') + shotHtml(R.vision.after[1] || R.vision.after[0], 'after the fix') + '</div><div class="verdict ' + (R.vision.look.ok ? 'ok' : 'bad') + '">' + (R.vision.look.ok ? 'Still a working shop page for a customer.' : esc((R.vision.look.problems || []).join('; '))) + (R.vision.sam && R.vision.sam.before !== null ? ' <span style="color:var(--mut)">· SAM 3.1, ' + esc(R.vision.sam.concept) + ': ' + R.vision.sam.before + ' before → ' + R.vision.sam.after + ' after</span>' : '') + '</div>', run: async () => { if (R.vision.look.ok) ctl(passed + 1); } }] : []),
  { html: head('The agent reviews its own patch', 'cause removed, or symptom hidden?') + (R.review ? '<div class="verdict ' + (R.review.verdict === 'cause' ? 'ok' : R.review.verdict === 'hides' ? 'bad' : 'warn') + '"><b>' + esc(R.review.verdict) + '</b> · ' + esc(R.review.reason) + (R.review.missing ? '<div style="color:var(--mut);font-size:19px;margin-top:8px">Missing for a complete fix: ' + esc(R.review.missing) + '</div>' : '') + '</div>' : '<div class="verdict">No review on this run.</div>'), run: async () => { if (R.review && R.review.verdict === 'cause') ctl(passed + 1); } },
  ...(R.attempts.length ? [{ html: head('Refused by itself', R.attempts.length + ' earlier attempt' + (R.attempts.length > 1 ? 's' : '') + ', each with the reason fed back') + R.attempts.map((a, i) => step('attempt ' + (i + 1), '<b style="color:var(--red)">' + esc(a.status) + '</b> · ' + esc(a.why).slice(0, 260) + (a.broken.length ? '<div class="mono">broke: ' + esc(a.broken.join(', ')) + '</div>' : ''))).join(''), run: async (c, d) => { await steps(c, d); } }] : []),
  { html: head('Result', 'what a human receives') + '<div class="big"><div class="n ' + (R.status === 'proposed' ? 'ok' : R.status === 'reserved' ? 'warn' : 'red') + '"><b>' + esc(R.status === 'reserved' ? 'proposed, with reservation' : R.status) + '</b><span>' + esc(R.why).slice(0, 200) + '</span></div></div>' + (R.reservations.length ? '<div class="verdict warn">' + esc(R.reservations.join(' · ')) + '</div>' : '') + '<div style="color:var(--mut)">A patch for review, the sources, every control\\'s verdict, and a hashed journal of it all. The site itself was never touched.</div>', run: async () => { $('#m-st').textContent = R.status; } },
  { html: title('Proof, <span>not promises</span>', 'Mission Zero proposes. The customer\\'s tests decide. A human applies.', 'github.com/cryptoragency/mission0 · Muse Spark, Muse Voice, SAM 3.1, open weights'), run: async () => {} },
];
function hasVisionScene() { return !!(R.vision && R.vision.look && (R.vision.after || []).length); }
function shotHtml(s, label) { return s && s.src ? '<div class="shot"><img src="' + s.src + '" alt=""><small>' + label + ' · ' + esc(s.name) + '</small></div>' : '<div class="shot"><small>' + label + ' · no screenshot</small></div>'; }
async function play(i) {
  if (i < 0 || i >= SCENES.length) return;
  token += 1; const my = token; cur = i;
  const scene = $('#scene'); scene.innerHTML = '<div class="card">' + SCENES[i].html + '</div>'; const card = scene.firstChild;
  await sleep(30); card.classList.add('on');
  const dur = DUR[i] || 8000; const t0 = Date.now();
  SCENES[i].run(card, dur);
  while (Date.now() - t0 < dur) { if (token !== my) return; if (!paused) $('#prog').style.width = (100 * (Date.now() - t0) / dur) + '%'; await sleep(50); if (paused) { const p = Date.now(); while (paused && token === my) await sleep(50); } }
  if (token === my && i + 1 < SCENES.length) play(i + 1);
}
document.addEventListener('keydown', (e) => { if (e.code === 'Space') { paused = !paused; e.preventDefault(); } if (e.code === 'ArrowRight') play(cur + 1); if (e.code === 'ArrowLeft') play(cur - 1); });
window.MZ = { play, scenes: SCENES.length, durations: DUR };
play(0);
</script></body></html>`;
}

if (process.argv[1] && process.argv[1].endsWith('make-repair-replay.js')) {
  const [folder, id] = process.argv.slice(2);
  if (!folder || !id) { console.error('usage: node bench/make-repair-replay.js evidence/repair-<date> F14 [out.html] [--scenes=ms,...]'); process.exit(1); }
  const out = process.argv.slice(4).find((a) => a.endsWith('.html')) || join(folder, id, 'replay.html');
  const sc = (process.argv.find((a) => a.startsWith('--scenes=')) || '').slice(9);
  const html = renderRepairReplay(loadRepair(folder, id), { scenes: sc ? sc.split(',').map(Number).filter((n) => n > 0) : null });
  writeFileSync(out, html);
  console.log('Replay written:', out, Math.round(html.length / 1024) + ' KB');
}
