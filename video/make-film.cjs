// Fabrique la vidéo du film à partir de video/schemas.html : narration française (voix Windows Hortense, une piste par
// légende), page enregistrée en headless (Playwright), mixage ffmpeg. Brouillon pour valider le format ; la voix du fondateur
// remplacera la synthèse. node video/make-film.cjs [outDir]
// Prérequis : ffmpeg sur le PATH (ou FFMPEG), Playwright dans node_modules de l'agence, Windows System.Speech (fr-FR Hortense).
const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync } = require('node:fs');
const { join, resolve } = require('node:path');

const outDir = resolve(process.argv[2] || 'video/out/film');
mkdirSync(outDir, { recursive: true });
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const VOICE = process.env.MZ_VOICE || 'Microsoft Hortense Desktop';
const RATE = Number(process.env.MZ_VOICE_RATE || 0);
const PAD = 500; // silence après chaque légende dite
const W = 1280, H = 720;
const pageFile = resolve(__dirname, 'schemas.html');
const html = readFileSync(pageFile, 'utf8');

// 1. Les légendes (CAP) et l'ordre des chapitres (CH), lus dans la page elle-même.
const capSrc = html.slice(html.indexOf('var CAP = {') + 'var CAP = '.length, html.indexOf('\n  };', html.indexOf('var CAP = {')) + 4);
const CAP = new Function('return ' + capSrc)();
const chSrc = html.slice(html.indexOf('var CH = [') + 'var CH = '.length, html.indexOf('\n  ];', html.indexOf('var CH = [')) + 4);
const CH = new Function('return ' + chSrc)();
const capsFor = (id, pass) => id !== 'sB' ? CAP[id] : pass === 'securite' ? CAP.sB2 : pass === 'espace' ? CAP.sB3 : CAP.sB;
const plain = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function speak(text, file) {
  const txt = file + '.txt'; writeFileSync(txt, text, 'utf8');
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $s.SelectVoice('${VOICE}') } catch {}; $s.Rate = ${RATE}; $s.SetOutputToWaveFile('${file}'); $s.Speak([IO.File]::ReadAllText('${txt}')); $s.Dispose()`;
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('speech failed: ' + r.stderr);
}
function wavSeconds(file) { const b = readFileSync(file); const byteRate = b.readUInt32LE(28); let i = 12; while (i < b.length - 8) { const id = b.toString('ascii', i, i + 4); const size = b.readUInt32LE(i + 4); if (id === 'data') return size / byteRate; i += 8 + size + (size % 2); } return (b.length - 44) / byteRate; }

(async () => {
  const { chromium } = require('C:/gui/cryptor.agency/agence/node_modules/playwright');
  const b = await chromium.launch({ headless: true });
  // 2. Une première page, sans enregistrement, pour lire les étapes et leurs durées par chapitre et par passe.
  const probe = await b.newPage({ viewport: { width: W, height: H } });
  await probe.goto('file:///' + pageFile.split('\\').join('/') + '?auto=0&record=1');
  const CARD = 2600, DONE = 2200, END = 6000;
  const plan = []; // { id, pass, steps: [{ idx, d, text }] }
  for (const ch of CH) {
    const pass = ch.pass || 'all';
    const steps = await probe.evaluate((a) => { window.MZF.pass[a.id] = a.pass; return window.MZF.steps(a.id).map((s) => ({ d: Number(s.dataset.d) || (s.classList.contains('a') ? 1100 : 1300), own: !!s.dataset.pass, arrow: s.classList.contains('a') })); }, { id: ch.id, pass });
    const quick = ch.id === 'sB' && pass !== 'medecine' && pass !== 'all';
    const caps = capsFor(ch.id, pass);
    plan.push({ ...ch, pass, steps: steps.map((s, k) => ({ idx: k, d: quick && !s.own ? Math.min(s.d, 220) : s.d, text: (quick && !s.own) ? '' : plain(caps[k]), forced: quick && !s.own })) });
  }
  await probe.close();

  // 3. La narration : une piste par carte et par légende ; une légende trop longue allonge son étape.
  const clips = []; // { file, at (ms), dur (ms) }
  const silence = (ms) => ({ file: null, dur: ms });
  let n = 0; const say = (text) => { const f = join(outDir, `clip-${n++}.wav`); speak(text, f); return { file: f, dur: Math.round(wavSeconds(f) * 1000) }; };
  const timeline = []; // [{ at, text }] pour les sous-titres et le journal
  let t = 0; const durationsByChapter = [];
  for (const ch of plan) {
    const cardText = (ch.n ? 'Chapitre ' + ch.n + '. ' : '') + plain(ch.h).toLowerCase().replace(/^./, (c) => c.toUpperCase()) + '. ' + plain(ch.s);
    const cardClip = say(cardText); const cardDur = Math.max(CARD, cardClip.dur + PAD);
    clips.push({ ...cardClip, at: t }); timeline.push({ at: t, text: cardText }); t += cardDur; ch.cardDur = cardDur;
    const ds = [];
    for (const s of ch.steps) {
      let d = s.d;
      if (s.text) { const c = say(s.text); d = Math.max(d, c.dur + PAD); clips.push({ ...c, at: t }); timeline.push({ at: t, text: s.text }); }
      ds.push(d); t += d;
    }
    ch.ds = ds; t += DONE; durationsByChapter.push({ id: ch.id, pass: ch.pass, cardDur, ds });
  }
  const endClip = say('Preuves, pas promesses. CRYPTOR.AGENCY. Mission Zero.');
  clips.push({ ...endClip, at: t + 2200 }); timeline.push({ at: t + 2200, text: endClip.file && 'Preuves, pas promesses. CRYPTOR.AGENCY. Mission Zero.' });
  const total = t + END + 1500;
  writeFileSync(join(outDir, 'timeline.json'), JSON.stringify({ total, durationsByChapter, timeline }, null, 2));
  console.log('narration clips', clips.length, 'total', (total / 1000).toFixed(1) + 's');

  // 4. Enregistrement : la page rejoue le film avec les durées allongées (cartes et étapes), en headless.
  const vidDir = join(outDir, 'rec'); mkdirSync(vidDir, { recursive: true });
  for (const f of readdirSync(vidDir)) if (f.endsWith('.webm')) renameSync(join(vidDir, f), join(vidDir, f + '.old'));
  const t0 = Date.now();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: vidDir, size: { width: W, height: H } } });
  const p = await ctx.newPage();
  await p.goto('file:///' + pageFile.split('\\').join('/') + '?auto=0&record=1');
  await p.waitForTimeout(300);
  const lead = Date.now() - t0;
  await p.evaluate((plan) => {
    // Durées par chapitre : on pose data-d sur chaque étape juste avant son chapitre, via un film() ré-écrit ici.
    const F = window.MZF; let i = 0;
    const card = document.getElementById('card');
    const apply = (ch) => { F.pass[ch.id] = ch.pass; const steps = F.steps(ch.id); steps.forEach((s, k) => { s.dataset.d = String(ch.ds[k]); }); };
    const showCard = (ch, ms, then) => { document.querySelectorAll('.scene').forEach((s) => s.classList.remove('active')); card.classList.toggle('end', !!ch.end); document.getElementById('card-n').textContent = ch.end ? ch.n : (ch.n ? 'Chapitre ' + ch.n : ''); document.getElementById('card-h').textContent = ch.h; document.getElementById('card-s').textContent = ch.s; card.classList.remove('show'); void card.offsetWidth; card.classList.add('show'); setTimeout(() => { card.classList.remove('show'); then(); }, ms); };
    const next = () => {
      if (i >= plan.length) { showCard({ end: true, n: 'Preuves, pas promesses.', h: 'CRYPTOR.AGENCY', s: 'MISSION ZERO' }, 6000, () => card.classList.add('show')); return; }
      const ch = plan[i++]; apply(ch);
      showCard(ch, ch.cardDur, () => { document.getElementById(ch.id).classList.add('active'); document.querySelector('.wrap').classList.add('film'); F.play(ch.id, () => next(), ch.pass); });
    };
    next();
  }, plan.map((c) => ({ id: c.id, pass: c.pass, n: c.n, h: c.h, s: c.s, cardDur: c.cardDur, ds: c.ds })));
  await p.waitForTimeout(total + 500);
  await ctx.close(); await b.close();
  const webm = readdirSync(vidDir).filter((f) => f.endsWith('.webm')).map((f) => join(vidDir, f))[0];
  const silent = join(outDir, 'silent.webm'); if (existsSync(silent)) renameSync(silent, silent + '.old');
  renameSync(webm, silent);
  console.log('recorded', silent, 'lead', lead + 'ms');

  // 5. Piste de narration : chaque clip à son instant (adelay), mixés, puis le mp4.
  const inputs = clips.flatMap((c) => ['-i', c.file]);
  const delays = clips.map((c, i) => `[${i}:a]adelay=${lead + c.at}|${lead + c.at}[a${i}]`).join(';');
  const mix = clips.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${clips.length}:normalize=0:dropout_transition=0[out]`;
  const track = join(outDir, 'narration.wav');
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', delays + ';' + mix, '-map', '[out]', track], { stdio: 'inherit' });
  const mp4 = join(outDir, 'mission-zero-film.mp4');
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent, '-i', track, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-shortest', mp4], { stdio: 'inherit' });
  console.log('video', mp4, (total / 1000).toFixed(0) + 's');
})().catch((e) => { console.error(e); process.exit(1); });
