import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transcribeWav, cleanSpokenGoal } from './voice.js';
import { lookAtPages } from './vision.js';
import { parseBoxes, segment } from './sam.js';

// A minimal valid WAV header: fmt chunk (PCM, channels, rate, 16 bit) and an empty data chunk.
const wavHeader = ({ channels = 1, rate = 16000, bits = 16 } = {}) => {
  const fmt = Buffer.alloc(16); fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(channels, 2); fmt.writeUInt32LE(rate, 4); fmt.writeUInt32LE(rate * channels * bits / 8, 8); fmt.writeUInt16LE(channels * bits / 8, 12); fmt.writeUInt16LE(bits, 14);
  const size = Buffer.alloc(4); size.writeUInt32LE(16, 0); const zero = Buffer.alloc(4);
  return Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.from('fmt '), size, fmt, Buffer.from('data'), zero]);
};

test('voice: a WAV goes as multipart with the model settings, the transcript comes back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mz-wav-')); const path = join(dir, 'goal.wav'); writeFileSync(path, wavHeader());
  let seen = null;
  const fetchFn = async (url, init) => { seen = { url, init }; return { ok: true, text: async () => JSON.stringify({ transcript: ' Find the human element share in the DBIR 2025. ', audioDurationMs: 4200, sessionId: 's1', turns: [] }) }; };
  const r = await transcribeWav(path, { key: 'k', fetchFn });
  assert.equal(r.transcript, 'Find the human element share in the DBIR 2025.');
  assert.equal(r.durationMs, 4200);
  assert.ok(seen.url.endsWith('/asr/transcribe'));
  assert.equal(seen.init.headers.authorization, 'Bearer k');
  const req = seen.init.body.get('request'); assert.ok(req);
  assert.equal(JSON.parse(await req.text()).model, 'muse-voice-transcribe-1.0');
  assert.ok(seen.init.body.get('audio'));
});

test('voice: a file that is not a WAV is refused before any call', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mz-wav-')); const path = join(dir, 'goal.wav'); writeFileSync(path, Buffer.from('ID3 not a wav'));
  await assert.rejects(() => transcribeWav(path, { key: 'k', fetchFn: async () => { throw new Error('must not be called'); } }), /not a WAV/);
});

test('voice: a spoken goal loses its filler and politeness', () => {
  assert.equal(cleanSpokenGoal('ok, find the NIST password length minimum please.'), 'Find the NIST password length minimum.');
  assert.equal(cleanSpokenGoal('  alors  cite le rapport lui-même merci '), 'Cite le rapport lui-même');
});

test('vision: the screenshots go as image_url parts and the verdict is parsed', async () => {
  let messages = null;
  const ask = async (m) => { messages = m; return { text: '{"ok":false,"problems":["the product grid is empty"],"seen":["header","footer"]}' }; };
  const r = await lookAtPages({ shots: [{ name: 'home', dataUrl: 'data:image/png;base64,AAAA' }], ask });
  assert.equal(r.ok, false); assert.deepEqual(r.problems, ['the product grid is empty']);
  const parts = messages[1].content; assert.equal(parts.filter((p) => p.type === 'image_url').length, 1);
  assert.equal(parts.find((p) => p.type === 'image_url').image_url.url, 'data:image/png;base64,AAAA');
});

test('sam: box tokens are parsed, with confidence when present', () => {
  const text = '<0f>0<|box;x1=181;y1=365;x2=556;y2=486;w=1516;h=1600;c=0.91|><|mask;x=0;y=0;data=!abc|><0f>1<|box;x1=10;y1=20;x2=30;y2=40;w=1516;h=1600|>';
  const b = parseBoxes(text);
  assert.equal(b.length, 2); assert.equal(b[0].x1, 181); assert.equal(b[0].confidence, 0.91); assert.equal(b[1].confidence, undefined);
  assert.deepEqual(parseBoxes(''), []);
});

test('sam: the request names the concept and the image, and an empty answer is zero boxes', async () => {
  let seen = null;
  const fetchFn = async (url, init) => { seen = JSON.parse(init.body); return { ok: true, text: async () => JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: '' }] }] }) }; };
  const r = await segment({ dataUrl: 'data:image/png;base64,AAAA', concept: 'credit card form', key: 'k', fetchFn });
  assert.equal(seen.model, 'sam-3.1'); assert.equal(seen.input[0].content[0].text, 'credit card form'); assert.equal(seen.input[0].content[1].image_url, 'data:image/png;base64,AAAA');
  assert.deepEqual(r.boxes, []);
});

test('voice: a 22 050 Hz WAV is detected as unsupported; wavFormat reads the header', async () => {
  const { wavFormat, wavAccepted } = await import('./voice.js');
  assert.deepEqual(wavFormat(wavHeader({ rate: 22050 })), { channels: 1, sampleRate: 22050, bits: 16 });
  assert.equal(wavAccepted(wavFormat(wavHeader({ rate: 22050 }))), false);
  assert.equal(wavAccepted(wavFormat(wavHeader({ rate: 24000 }))), true);
  assert.equal(wavAccepted(wavFormat(wavHeader({ channels: 2 }))), false);
});
