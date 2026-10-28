// A spoken goal: node --env-file=.env bench/run-voice.js recording.wav [--run] [--turns=4] [--rounds=3]
// Transcribes the WAV with muse-voice-transcribe-1.0, cleans it into a goal, and with --run starts the mission on it.
import { spawnSync } from 'node:child_process';
import { transcribeWav, cleanSpokenGoal } from '../src/voice.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const file = process.argv.find((x, i) => i >= 2 && !x.startsWith('--'));
if (!file) { console.error('usage: node --env-file=.env bench/run-voice.js recording.wav [--run]'); process.exit(1); }

const t = await transcribeWav(file);
const goal = cleanSpokenGoal(t.transcript);
console.log('heard   :', JSON.stringify(t.transcript));
console.log('goal    :', goal);
console.log('audio   :', (t.durationMs / 1000).toFixed(1) + ' s · transcribed in ' + (t.ms / 1000).toFixed(1) + ' s');
if (!goal) { console.error('nothing understood'); process.exit(2); }
if (process.argv.includes('--run')) {
  const r = spawnSync(process.execPath, ['--env-file=.env', 'src/run.js', goal, arg('turns', '4'), arg('rounds', '3')], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
