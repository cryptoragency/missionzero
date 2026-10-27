// Builds the 3-minute demo video from an evidence folder: narration (Windows speech), animated replay recorded
// headless (Playwright), then muxed with ffmpeg. node video/make-video.cjs <evidence folder> [outDir]
// Needs: ffmpeg on PATH (or FFMPEG env), Playwright from the agency's node_modules, Windows System.Speech.
const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');

const folder = process.argv[2];
if (!folder) { console.error('Usage: node video/make-video.cjs <evidence folder> [outDir]'); process.exit(1); }
const outDir = resolve(process.argv[3] || 'video/out');
mkdirSync(outDir, { recursive: true });
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const N = JSON.parse(readFileSync(join(__dirname, 'narration.json'), 'utf8'));

// 1. Narration, one WAV per scene (Windows built-in voice, no network).
function speak(text, file) {
  const txt = file + '.txt'; writeFileSync(txt, text, 'utf8');
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $s.SelectVoice('${N.voice}') } catch {}; $s.Rate = ${Number(N.rate) || 0}; $s.SetOutputToWaveFile('${file}'); $s.Speak([IO.File]::ReadAllText('${txt}')); $s.Dispose()`;
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('speech failed: ' + r.stderr);
}
function wavSeconds(file) { const b = readFileSync(file); const byteRate = b.readUInt32LE(28); let i = 12; while (i < b.length - 8) { const id = b.toString('ascii', i, i + 4); const size = b.readUInt32LE(i + 4); if (id === 'data') return size / byteRate; i += 8 + size + (size % 2); } return (b.length - 44) / byteRate; }

const turns = readFileSync(join(folder, 'journal.jsonl'), 'utf8').trim().split('\n').filter((l) => /"step":"plan"/.test(l)).length;
const texts = [N.intro, N.goal, ...Array.from({ length: turns }, (_, i) => N.turns[i] || `Turn ${i + 1}. A hypothesis, one action, an observation, and a strict self-evaluation.`), N.draft, N.verify, N.contradict, N.result, N.outro];
const minimum = [5000, 6000, ...Array.from({ length: turns }, () => 9000), 6000, 8000, 7000, 7000, 6000];
const PAD = 1600; // silence after each narration, so the eye finishes before the next scene
const wavs = []; const durations = [];
texts.forEach((t, i) => { const f = join(outDir, `scene-${i}.wav`); speak(t, f); wavs.push(f); durations.push(Math.max(minimum[i], Math.round(wavSeconds(f) * 1000) + PAD)); });
const total = durations.reduce((a, b) => a + b, 0);
console.log('scenes', texts.length, 'durations', durations.join(','), 'total', (total / 1000).toFixed(1) + 's');

// 2. The replay page with those scene durations.
const replay = join(outDir, 'replay.html');
execFileSync(process.execPath, [join(__dirname, '..', 'bench', 'make-replay.js'), folder, replay, '--scenes=' + durations.join(',')], { stdio: 'inherit' });

// 3. Record it headless.
(async () => {
  const { chromium } = require('C:/gui/cryptor.agency/agence/node_modules/playwright');
  const b = await chromium.launch({ headless: true });
  const vidDir = join(outDir, 'rec'); mkdirSync(vidDir, { recursive: true });
  const t0 = Date.now();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: vidDir, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage();
  await p.goto('file:///' + resolve(replay).split('\\').join('/') + '?auto=0');
  await p.waitForTimeout(300);
  const lead = Date.now() - t0; // recording started at context creation: the narration waits this long
  await p.evaluate(() => window.MZ.play(0));
  await p.waitForTimeout(total + 1200);
  await ctx.close(); await b.close();
  const webm = readdirSync(vidDir).filter((f) => f.endsWith('.webm')).map((f) => join(vidDir, f))[0];
  const silent = join(outDir, 'silent.webm'); if (existsSync(silent)) { try { renameSync(silent, silent + '.old'); } catch { /* ignore */ } }
  renameSync(webm, silent);
  console.log('recorded', silent, 'lead', lead + 'ms');

  // 4. One narration track: each WAV padded to its scene, then the lead silence in front.
  const parts = wavs.map((w, i) => `[${i}:a]apad,atrim=0:${(durations[i] / 1000).toFixed(3)}[a${i}]`).join(';');
  const concat = wavs.map((_, i) => `[a${i}]`).join('') + `concat=n=${wavs.length}:v=0:a=1,adelay=${lead}|${lead}[out]`;
  const track = join(outDir, 'narration.wav');
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...wavs.flatMap((w) => ['-i', w]), '-filter_complex', parts + ';' + concat, '-map', '[out]', track], { stdio: 'inherit' });

  // 5. Mux: H.264 + AAC, the format every upload form accepts.
  const mp4 = join(outDir, 'mission-zero-demo.mp4');
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent, '-i', track, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '160k', '-shortest', mp4], { stdio: 'inherit' });
  console.log('video', mp4);
})().catch((e) => { console.error(e); process.exit(1); });
