// SAM 3.1: finds one concept in a screenshot (a "credit card form", a "login form") and returns its boxes.
// Used as visual evidence of a repair: the card form is boxed on the flawed checkout and absent after the fix.
// POST /v1/responses with model sam-3.1, an input_text concept and an input_image; the answer is text made of tokens:
// <0f>0<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..|><|mask;...|>  (one box token + one mask token per match).
import { readJson } from './loop.js';

const BASE = 'https://api.meta.ai/v1';

export function parseBoxes(text) {
  const boxes = [];
  for (const m of String(text || '').matchAll(/<\|box;([^|]*)\|>/g)) {
    const f = Object.fromEntries(m[1].split(';').map((kv) => kv.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k, Number(v)]));
    if ([f.x1, f.y1, f.x2, f.y2].every(Number.isFinite)) boxes.push({ x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, w: f.w, h: f.h, confidence: Number.isFinite(f.c) ? f.c : undefined });
  }
  return boxes;
}

export async function segment({ dataUrl, concept, key = process.env.MODEL_API_KEY, fetchFn = fetch }) {
  if (!key) throw new Error('MODEL_API_KEY is missing (.env file)');
  const t0 = Date.now();
  const r = await fetchFn(`${BASE}/responses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'sam-3.1', input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: concept }, { type: 'input_image', image_url: dataUrl }] }], metadata: { include_confidence: 'true', mask_encoding: 'one_bit' } }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Meta SAM ${r.status}: ${body.slice(0, 300)}`);
  const j = readJson(body) || {};
  // The Responses API returns output items; the segmentation text is the output_text of the message item.
  const text = j.output_text || (j.output || []).flatMap((o) => (o.content || [])).map((c) => c.text || '').join('') || '';
  return { concept, boxes: parseBoxes(text), raw: text.slice(0, 200), usage: j.usage, ms: Date.now() - t0 };
}
