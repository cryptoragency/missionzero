// Turns an evidence folder into one self-contained animated page: the mission replayed step by step.
// node bench/make-replay.js evidence/2026-10-27-18-32 [out.html] [--scenes=ms,ms,...]
// The page plays by itself (space pauses, arrows move). Scene durations can be imposed, so a narration can drive it.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function loadRun(folder) {
  const read = (f, fb) => (existsSync(join(folder, f)) ? JSON.parse(readFileSync(join(folder, f), 'utf8')) : fb);
  const journal = existsSync(join(folder, 'journal.jsonl'))
    ? readFileSync(join(folder, 'journal.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const final = read('final-answer.json', {});
  const summary = read('summary.json', {});
  const turns = [];
  for (const e of journal) {
    if (!e.turn || e.step === 'research') continue;
    const t = turns[e.turn - 1] || (turns[e.turn - 1] = { turn: e.turn });
    if (e.step === 'plan') { t.hypotheses = e.hypotheses || []; t.action = e.action; }
    if (e.step === 'observation') {
      const o = e.obs || {};
      t.observation = o.results ? { kind: 'search', count: o.results.length, top: o.results.slice(0, 3).map((r) => ({ title: r.title, url: r.url })) }
        : o.pdf ? { kind: 'pdf', pages: o.pdf.pages, chars: o.fullLength || (o.text || '').length, find: o.find, ok: o.ok }
          : o.ok ? { kind: 'page', chars: o.fullLength || (o.text || '').length, find: o.find, via: o.readVia }
            : { kind: 'error', error: o.error || 'failed' };
    }
    if (e.step === 'evaluation') t.evaluation = { score: e.score, reached: e.reached, lesson: e.lesson, pivot: e.pivot };
  }
  const research = journal.filter((e) => e.step === 'research');
  return { folder, goal: summary.goal || '', turns: turns.filter(Boolean), final, summary, research, zero: read('zero.json', null) };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const money = (n) => '$' + (Number(n) || 0).toFixed(3);

export function renderReplay(run, { scenes = null, title = 'Mission Zero' } = {}) {
  const j = run.final.judge || {};
  const versions = j.versions || [];
  const cost = run.summary.cost || {};
  const data = { goal: run.goal, turns: run.turns, final: { answer: run.final.answer, sources: run.final.sources || [], uncertainties: run.final.uncertainties || [] }, judge: { score: j.score, green: j.green, red: j.red, rounds: j.rounds, versions }, cost: { usd: cost.usd, calls: cost.calls, ms: cost.totalMs }, lessons: run.summary.lessonsLearned, reached: run.summary.reached, zero: run.zero || null };
  // Scenes: intro, goal, one per turn, draft, verification, contradiction, result, outro. Durations in ms.
  const defaults = [5000, 7000, ...run.turns.map(() => 9000), 7000, 9000, 9000, ...(run.zero ? [10000] : []), 9000, 7000]; // + back to zero, when the agent did it
  const durations = scenes && scenes.length ? scenes : defaults;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · replay</title>
<style>
:root{--bg:#0a0e18;--panel:#111a2c;--line:#263552;--tx:#f3f6fc;--mut:#9fb0d3;--gold:#e5bd52;--ok:#5fe09a;--red:#ff6b7a;--blue:#6fb3ff}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--tx);font:20px/1.45 "Segoe UI",Inter,Arial,sans-serif;overflow:hidden}
#stage{position:relative;width:100vw;height:100vh;padding:34px 56px;display:flex;flex-direction:column;gap:18px}
header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:12px}
header .brand{font-weight:700;font-size:26px;letter-spacing:.02em}header .brand span{color:var(--gold)}
header .meters{display:flex;gap:26px;font-size:17px;color:var(--mut)}header .meters b{color:var(--tx);font-variant-numeric:tabular-nums}
#goal{font-size:21px;color:var(--mut)}#goal b{color:var(--tx)}
#scene{flex:1;position:relative}
.card{position:absolute;inset:0;display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(18px);transition:opacity .5s,transform .5s;pointer-events:none}
.card.on{opacity:1;transform:none;pointer-events:auto}
.title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px}
.title h1{font-size:68px;margin:0;letter-spacing:-.01em}.title h1 span{color:var(--gold)}.title p{font-size:28px;color:var(--mut);margin:0}
.title small{font-size:18px;color:var(--mut)}
.step{display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 20px;opacity:0;transform:translateX(-14px);transition:opacity .45s,transform .45s}
.step.on{opacity:1;transform:none}.step .k{color:var(--gold);font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:15px;padding-top:4px}
.step .v{min-width:0}.step .v .mono{font-family:Consolas,monospace;font-size:17px;color:var(--blue);word-break:break-all}
.pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 12px;font-size:16px;color:var(--mut);margin-right:8px}
.score{display:inline-flex;align-items:center;gap:10px}.bar{width:220px;height:10px;background:#1b2740;border-radius:6px;overflow:hidden}.bar i{display:block;height:100%;background:var(--gold);width:0;transition:width 1.2s ease}
.turnhead{display:flex;align-items:baseline;gap:16px}.turnhead h2{margin:0;font-size:30px}.turnhead span{color:var(--mut)}
.src{display:grid;grid-template-columns:36px 1fr;gap:14px;align-items:start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 18px;opacity:0;transition:opacity .5s}
.src.on{opacity:1}.dot{width:26px;height:26px;border-radius:50%;background:#2a3858;margin-top:4px;transition:background .4s}.dot.g{background:var(--ok);box-shadow:0 0 18px var(--ok)}.dot.r{background:var(--red);box-shadow:0 0 18px var(--red)}
.src .u{color:var(--blue);font-family:Consolas,monospace;font-size:16px;word-break:break-all}.src q{display:block;color:var(--mut);font-style:italic;margin-top:4px;font-size:18px}
.answer{font-size:26px;line-height:1.4;background:var(--panel);border:1px solid var(--line);border-left:5px solid var(--gold);border-radius:14px;padding:18px 22px;min-height:96px}
.big{display:flex;gap:40px;align-items:center;justify-content:center;flex:1}.big .n{text-align:center}.big .n b{display:block;font-size:92px;line-height:1;font-variant-numeric:tabular-nums}.big .n span{color:var(--mut);font-size:18px;text-transform:uppercase;letter-spacing:.1em}
.big .ok b{color:var(--ok)}.big .gold b{color:var(--gold)}
.obj{border-left:3px solid var(--red);padding-left:12px;color:var(--mut);font-size:19px}
.rounds{display:flex;gap:14px}.round{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;opacity:0;transition:opacity .5s,border-color .5s}.round.on{opacity:1}.round.best{border-color:var(--gold)}.round b{font-size:34px}.round small{display:block;color:var(--mut);font-size:15px}
footer{display:flex;justify-content:space-between;color:var(--mut);font-size:15px;border-top:1px solid var(--line);padding-top:10px}
#prog{position:absolute;left:0;bottom:0;height:4px;background:var(--gold);width:0}
#ctrl{position:absolute;right:16px;bottom:10px;color:var(--mut);font-size:13px}
.type::after{content:"▍";color:var(--gold);animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
</style></head><body>
<div id="stage">
<header><div class="brand">MISSION <span>ZERO</span></div><div class="meters"><div>turn <b id="m-turn">0</b></div><div>model calls <b id="m-calls">0</b></div><div>cost <b id="m-cost">$0.000</b></div><div>proof <b id="m-proof">0 green</b></div></div></header>
<div id="goal"></div>
<div id="scene"></div>
<footer><div>Every step is written to the evidence folder: journal, memory, final answer, verdicts.</div><div>CRYPTOR.AGENCY · Meta Global AI Developer Hackathon 2026</div></footer>
<div id="prog"></div><div id="ctrl">space: pause · ←/→: scene</div>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const DUR = ${JSON.stringify(durations)};
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\\./, ''); } catch (e) { return u; } };
const money = (n) => '$' + (Number(n) || 0).toFixed(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let paused = false, cur = -1, token = 0;
const meters = { turn: 0, calls: 0, cost: 0, green: 0 };
// The counters follow the real totals of the run: a share of the calls per turn, the rest for the answer stage.
const TOTAL = { calls: DATA.cost.calls || 0, usd: DATA.cost.usd || 0 };
function meter(add) { Object.assign(meters, add); $('#m-turn').textContent = meters.turn; $('#m-calls').textContent = meters.calls; $('#m-cost').textContent = money(meters.cost); $('#m-proof').textContent = meters.green + ' green'; }
function meterAt(fraction) { meter({ calls: Math.round(TOTAL.calls * fraction), cost: TOTAL.usd * fraction }); }
const turnShare = (k, half) => (0.6 * (k - 1 + (half ? 0.5 : 1))) / Math.max(1, DATA.turns.length);
function reveal(el, delay) { return new Promise((r) => setTimeout(() => { el.classList.add('on'); r(); }, delay)); }
async function typeInto(el, text, ms) { el.classList.add('type'); const per = Math.max(8, Math.min(40, ms / Math.max(1, text.length))); for (let i = 1; i <= text.length; i += 1) { if (token !== typeInto.token) return; el.textContent = text.slice(0, i); await sleep(per); } el.classList.remove('type'); }
const step = (k, v) => '<div class="step"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';

function titleScene(h, p, small) { return '<div class="title"><h1>' + h + '</h1><p>' + p + '</p>' + (small ? '<small>' + small + '</small>' : '') + '</div>'; }
function turnScene(t) {
  const a = t.action || {}; const o = t.observation || {}; const e = t.evaluation || {};
  let act = '';
  if (/search/.test(a.type || '')) act = '<span class="pill">web_search</span><span class="mono">' + esc(a.query) + '</span>';
  else if (/read/.test(a.type || '')) act = '<span class="pill">read_page</span><span class="mono">' + esc(a.url) + '</span>' + (a.find ? '<div style="color:var(--mut);font-size:17px;margin-top:4px">looking for: “' + esc(a.find) + '”</div>' : '');
  else act = '<span class="pill">' + esc(a.type) + '</span>' + esc(a.detail || a.name || '');
  let obs = '';
  if (o.kind === 'search') obs = '<b>' + o.count + ' results</b><div style="font-size:17px;color:var(--mut)">' + (o.top || []).map((r) => esc(host(r.url)) + ' · ' + esc(r.title).slice(0, 70)).join('<br>') + '</div>';
  else if (o.kind === 'pdf') obs = '<b>PDF read: ' + o.pages + ' pages, ' + Number(o.chars).toLocaleString('en') + ' characters</b><div style="font-size:17px;color:var(--mut)">reduced to the passages that match the search, then the goal</div>';
  else if (o.kind === 'page') obs = '<b>page read: ' + Number(o.chars).toLocaleString('en') + ' characters</b>' + (o.via ? '<div style="font-size:17px;color:var(--mut)">read via official mirror ' + esc(host(o.via)) + '</div>' : '');
  else obs = '<b style="color:var(--red)">' + esc(o.error || 'no observation') + '</b>';
  const score = Number(e.score) || 0;
  const ev = '<div class="score"><div class="bar"><i data-w="' + score * 10 + '"></i></div><b>' + score + ' / 10</b>' + (e.reached ? '<span class="pill" style="color:var(--ok);border-color:var(--ok)">goal reached</span>' : '') + '</div>'
    + '<div style="margin-top:6px"><span style="color:var(--mut)">lesson:</span> ' + esc(e.lesson) + '</div>' + (e.pivot && !e.reached ? '<div><span style="color:var(--mut)">pivot:</span> ' + esc(e.pivot) + '</div>' : '');
  return '<div class="turnhead"><h2>Turn ' + t.turn + '</h2><span>hypothesis → action → observation → evaluation</span></div>'
    + step('hypothesis', esc((t.hypotheses || [])[0] || 'n/a')) + step('action', act) + step('observation', obs) + step('evaluation', ev);
}
function draftScene() { return '<div class="turnhead"><h2>Draft answer</h2><span>written only from what was seen</span></div><div class="answer" id="ans"></div><div style="color:var(--mut)">' + DATA.final.sources.length + ' source' + (DATA.final.sources.length > 1 ? 's' : '') + ' cited · a URL that was never read cannot be cited</div>'; }
function verifyScene() {
  const v0 = (DATA.judge.versions[0] || {}).verification || [];
  const items = DATA.final.sources.map((s) => v0.find((x) => x.url === s.url && x.claim === s.contribution) || { url: s.url, claim: s.contribution, verdict: 'unsupported', detail: '' });
  // The final version's own verdicts win when they exist (the best version may be a later one).
  const best = DATA.judge.versions.find((v) => v.score === DATA.judge.score && v.green === DATA.judge.green) || DATA.judge.versions[0] || {};
  const list = (best.verification && best.verification.length ? best.verification : items);
  return '<div class="turnhead"><h2>Verification</h2><span>each cited page is re-read; an exact quote is required</span></div>'
    + list.map((x) => '<div class="src" data-v="' + (x.verdict === 'supported' ? 'g' : 'r') + '"><div class="dot"></div><div><div>' + esc(x.claim) + '</div><div class="u">' + esc(x.url) + '</div><q>' + esc(x.verdict === 'supported' ? x.detail : (x.detail || 'no passage matches')) + '</q></div></div>').join('');
}
function contradictScene() {
  const vs = DATA.judge.versions; const bestScore = DATA.judge.score;
  const objs = vs.flatMap((v) => (v.objections || []).slice(0, 2)).slice(0, 3);
  return '<div class="turnhead"><h2>Contradictor and judge</h2><span>' + (vs.length - 1) + ' round' + (vs.length - 1 === 1 ? '' : 's') + ' · the best version is kept</span></div>'
    + (objs.length ? objs.map((o) => '<div class="obj step">' + esc(o) + '</div>').join('') : '<div class="step" style="display:block"><span style="color:var(--ok)">The contradictor found no real flaw.</span> Every figure is confirmed by its page: nothing to rewrite, nothing to pay for.</div>')
    + '<div class="rounds">' + vs.map((v, i) => '<div class="round' + (v.score === bestScore && vs.indexOf(vs.find((x) => x.score === bestScore)) === i ? ' best' : '') + '"><small>version ' + i + '</small><b>' + v.score + '</b><small>' + v.green + ' green · ' + v.red + ' red</small><small>' + esc(v.reason || '').slice(0, 90) + '</small></div>').join('') + '</div>';
}
function resultScene() {
  return '<div class="turnhead"><h2>Result</h2><span>proof, not promises</span></div><div class="answer">' + esc(DATA.final.answer) + '</div>'
    + '<div class="big"><div class="n gold"><b>' + DATA.judge.score + '</b><span>judge / 10</span></div><div class="n ok"><b>' + DATA.judge.green + '</b><span>green proofs</span></div><div class="n"><b>' + (DATA.judge.red || 0) + '</b><span>red</span></div><div class="n"><b>' + money(DATA.cost.usd) + '</b><span>cost</span></div><div class="n"><b>' + Math.round((DATA.cost.ms || 0) / 1000) + 's</b><span>model time</span></div></div>';
}
function zeroScene() {
  const z = DATA.zero; const d = z.decision || {};
  return '<div class="turnhead"><h2>Back to zero</h2><span>the agent judged its own memory and started again knowing nothing</span></div>'
    + step('decision', '<b>rule ' + esc(d.rule) + '</b> · ' + esc(d.reason))
    + step('archived', esc(String((z.archive || {}).count)) + ' lessons put aside by the agent itself, never deleted')
    + step('with memory', '<b>' + esc(z.withMemory.score) + ' / 10</b> · ' + esc(z.withMemory.green) + ' green · ' + money(z.withMemory.usd))
    + step('from zero', '<b>' + esc(z.fromZero.score) + ' / 10</b> · ' + esc(z.fromZero.green) + ' green · ' + money(z.fromZero.usd))
    + step('kept', '<b>' + esc(z.kept) + '</b> · ' + esc(z.why));
}
const SCENES = [
  { html: titleScene('MISSION <span>ZERO</span>', 'Give it a goal. Let it discover the path. Demand proof.', 'CRYPTOR.AGENCY · Meta Global AI Developer Hackathon 2026 · built on Muse Spark'), run: async () => {} },
  { html: titleScene('The goal', esc(DATA.goal), 'no plan, no tool list, public sources only, no spending'), run: async () => { $('#goal').innerHTML = '<b>Goal</b> · ' + esc(DATA.goal); } },
  ...DATA.turns.map((t) => ({ html: turnScene(t), run: async (card, dur) => {
    meter({ turn: t.turn });
    const steps = card.querySelectorAll('.step'); const gap = Math.min(1400, dur / 6);
    for (let i = 0; i < steps.length; i += 1) { await reveal(steps[i], gap); if (i === 1) meterAt(turnShare(t.turn, true)); if (i === 3) meterAt(turnShare(t.turn, false)); }
    const bar = card.querySelector('.bar i'); if (bar) bar.style.width = bar.dataset.w + '%';
  } })),
  { html: draftScene(), run: async (card, dur) => { meterAt(0.68); typeInto.token = token; await typeInto(card.querySelector('#ans'), DATA.final.answer, dur * 0.7); } },
  { html: verifyScene(), run: async (card, dur) => {
    const items = card.querySelectorAll('.src'); const gap = Math.min(1800, dur / (items.length + 1)); let g = 0;
    for (let i = 0; i < items.length; i += 1) { const it = items[i]; await reveal(it, gap * 0.5); await sleep(gap * 0.5); it.querySelector('.dot').classList.add(it.dataset.v); if (it.dataset.v === 'g') g += 1; meterAt(0.68 + 0.14 * (i + 1) / items.length); meter({ green: g }); }
  } },
  { html: contradictScene(), run: async (card, dur) => {
    const objs = card.querySelectorAll('.step'); const rounds = card.querySelectorAll('.round'); const gap = Math.min(1500, dur / (objs.length + rounds.length + 1));
    for (const o of objs) await reveal(o, gap);
    for (let i = 0; i < rounds.length; i += 1) { await reveal(rounds[i], gap); meterAt(0.82 + 0.18 * (i + 1) / rounds.length); }
  } },
  ...(DATA.zero ? [{ html: zeroScene(), run: async (card, dur) => { const steps = card.querySelectorAll('.step'); const gap = Math.min(1600, dur / (steps.length + 1)); for (const s of steps) await reveal(s, gap); } }] : []),
  { html: resultScene(), run: async () => { meterAt(1); meter({ green: DATA.judge.green || meters.green }); } },
  { html: titleScene('Proof, <span>not promises</span>', 'Everything in this repository was written during the hackathon.', 'github.com/cryptoragency/mission0 · Meta Model API · muse-spark-1.3 · reasoning effort tuned per role'), run: async () => {} },
];
async function play(i) {
  if (i < 0 || i >= SCENES.length) return;
  token += 1; const my = token; cur = i;
  const scene = $('#scene'); scene.innerHTML = '<div class="card">' + SCENES[i].html + '</div>'; const card = scene.firstChild;
  await sleep(30); card.classList.add('on');
  const dur = DUR[i] || 8000; const start = performance.now();
  $('#prog').style.transition = 'none'; $('#prog').style.width = '0'; await sleep(20); $('#prog').style.transition = 'width ' + dur + 'ms linear'; $('#prog').style.width = '100%';
  SCENES[i].run(card, dur).catch(() => {});
  while (performance.now() - start < dur || paused) { if (my !== token) return; await sleep(100); if (paused) { /* hold */ } }
  if (my === token) play(i + 1);
}
document.addEventListener('keydown', (e) => { if (e.key === ' ') { paused = !paused; e.preventDefault(); } if (e.key === 'ArrowRight') play(cur + 1); if (e.key === 'ArrowLeft') play(cur - 1); });
window.MZ = { play, scenes: SCENES.length, durations: DUR };
const q = new URLSearchParams(location.search);
if (q.get('auto') !== '0') setTimeout(() => play(Number(q.get('from')) || 0), 400);
</script></body></html>`;
}

const isMain = process.argv[1] && /make-replay\.js$/.test(process.argv[1]);
if (isMain) {
  const folder = process.argv[2];
  if (!folder) { console.error('Usage: node bench/make-replay.js <evidence folder> [out.html] [--scenes=ms,ms,...]'); process.exit(1); }
  const out = process.argv.slice(3).find((a) => !a.startsWith('--')) || join(folder, 'replay.html');
  const sc = (process.argv.find((a) => a.startsWith('--scenes=')) || '').slice(9);
  const scenes = sc ? sc.split(',').map(Number).filter((n) => n > 0) : null;
  const html = renderReplay(loadRun(folder), { scenes });
  writeFileSync(out, html);
  console.log('Replay written:', out, Math.round(html.length / 1024) + ' KB');
}
