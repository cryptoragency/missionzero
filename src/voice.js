// Voice: a goal spoken into a WAV file becomes the mission's goal (Meta muse-voice-transcribe-1.0).
// POST /v1/asr/transcribe, multipart: `request` (JSON settings) + `audio` (WAV only, 10 minutes max, 32 MB max).
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createRequire } from 'node:module';
import { metaFetch, META_BASE, META_KEY } from './meta.js';

// Transcription is billed by audio time: $0.18 per hour (Meta price list, 30 October 2026). The answer gives
// audioDurationMs; when it does not, the call counts 0 rather than a guess.
const VOICE_USD_PER_HOUR = 0.18;

// The service wants mono, 16-bit, 16 000 or 24 000 Hz. The header is read here; anything else is resampled with ffmpeg
// (MZ_FFMPEG or `ffmpeg` on the PATH) into a temporary file, so a phone recording or a Windows voice works as is.
export function wavFormat(bytes) {
  if (bytes.length < 36 || bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WAVE') return null;
  let o = 12;
  while (o + 8 <= bytes.length) {
    const id = bytes.subarray(o, o + 4).toString(); const size = bytes.readUInt32LE(o + 4);
    if (id === 'fmt ') return { channels: bytes.readUInt16LE(o + 10), sampleRate: bytes.readUInt32LE(o + 12), bits: bytes.readUInt16LE(o + 22) };
    o += 8 + size + (size % 2);
  }
  return null;
}
export const wavAccepted = (f) => !!f && f.channels === 1 && f.bits === 16 && (f.sampleRate === 16000 || f.sampleRate === 24000);

export function ensureAcceptedWav(path) {
  const bytes = readFileSync(path);
  const f = wavFormat(bytes);
  if (!f) throw new Error('not a WAV file: ' + basename(path));
  if (wavAccepted(f)) return { path, bytes, format: f, converted: false };
  const { spawnSync } = requireSync('node:child_process'); const { tmpdir } = requireSync('node:os'); const { join } = requireSync('node:path');
  const out = join(tmpdir(), 'mz-voice-' + Date.now() + '.wav');
  const r = spawnSync(process.env.MZ_FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', out], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error(`WAV is ${f.channels} ch, ${f.sampleRate} Hz, ${f.bits} bit; mono 16-bit 16/24 kHz expected and ffmpeg could not convert it (${(r.stderr || r.error?.message || '').slice(0, 120)})`);
  const converted = readFileSync(out);
  return { path: out, bytes: converted, format: wavFormat(converted), converted: true, from: f };
}
const requireSync = (m) => createRequire(import.meta.url)(m);

export async function transcribeWav(path, { key, model = 'muse-voice-transcribe-1.0', fetchFn = fetch } = {}) {
  const wav = ensureAcceptedWav(path);
  const bytes = wav.bytes;
  if (bytes.length > 32 * 1024 * 1024) throw new Error('recording over 32 MB');
  const form = new FormData();
  form.append('request', new Blob([JSON.stringify({ model, audioEncoding: 'WAV', mode: 'PUSH_TO_TALK' })], { type: 'application/json' }));
  form.append('audio', new Blob([bytes], { type: 'audio/wav' }), basename(path));
  const t0 = Date.now();
  const { body } = await metaFetch('/asr/transcribe', { method: 'POST', headers: { accept: 'application/json' }, body: form }, { base: META_BASE, key: key || META_KEY, keyName: 'MODEL_API_KEY', fetchFn, cost: (j) => (Number(j?.audioDurationMs) > 0 ? (Number(j.audioDurationMs) / 3.6e6) * VOICE_USD_PER_HOUR : 0) });
  const j = JSON.parse(body);
  return { transcript: String(j.transcript || '').trim(), durationMs: j.audioDurationMs, sessionId: j.sessionId, ms: Date.now() - t0, converted: wav.converted, format: wav.format };
}

// A spoken goal is conversational: trailing politeness and filler are dropped, the first letter is capitalized.
// The wake name ("Mission Zero, …") and a stuttered word ("Report Report") are dropped too.
export function cleanSpokenGoal(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(?:ok|okay|so|alors|bon|euh|hum|um|uh)[,\s]+/i, '');
  t = t.replace(/^(?:hey |ok |okay )?mission zero[,.!:]?\s*(?:zero[,.!:]?\s*)*/i, '');
  t = t.replace(/\b(\w+)(?:[,.]?\s+\1\b)+/gi, '$1'); // "Zero, Zero" -> "Zero", "Report Report" -> "Report"
  t = t.replace(/[,\s]*(?:please|s'il te plaît|s'il vous plaît|merci|thank you|thanks)([.!?])?\s*$/i, '$1');
  return t ? t[0].toUpperCase() + t.slice(1) : '';
}
