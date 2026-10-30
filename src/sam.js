// SAM 3.1: finds one concept in a screenshot (a "credit card form", a "login form") and returns its boxes.
// Used as visual evidence of a repair: the card form is boxed on the flawed checkout and absent after the fix.
// POST /v1/responses with model sam-3.1, an input_text concept and an input_image; the answer is text made of tokens:
// <0f>0<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..|><|mask;...|>  (one box token + one mask token per match).
import { readJson } from './loop.js';
import { metaFetch, META_BASE, META_KEY } from './meta.js';

// SAM 3.1 is billed per image: $2.50 per 1,000 images (Meta price list, 30 October 2026).
const SAM_USD_PER_IMAGE = 2.5 / 1000;

export function parseBoxes(text) {
  const boxes = [];
  for (const m of String(text || '').matchAll(/<\|box;([^|]*)\|>/g)) {
    const f = Object.fromEntries(m[1].split(';').map((kv) => kv.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k, Number(v)]));
    if ([f.x1, f.y1, f.x2, f.y2].every(Number.isFinite)) boxes.push({ x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, w: f.w, h: f.h, confidence: Number.isFinite(f.c) ? f.c : undefined });
  }
  return boxes;
}

export async function segment({ dataUrl, concept, key, fetchFn = fetch }) {
  const t0 = Date.now();
  const { body } = await metaFetch('/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'sam-3.1', input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: concept }, { type: 'input_image', image_url: dataUrl }] }], metadata: { include_confidence: 'true', mask_encoding: 'one_bit' } }),
  }, { base: META_BASE, key: key || META_KEY, keyName: 'MODEL_API_KEY', fetchFn, cost: () => SAM_USD_PER_IMAGE });
  const j = readJson(body) || {};
  // The Responses API returns output items; the segmentation text is the output_text of the message item.
  const text = j.output_text || (j.output || []).flatMap((o) => (o.content || [])).map((c) => c.text || '').join('') || '';
  return { concept, boxes: parseBoxes(text), raw: text.slice(0, 200), usage: j.usage, ms: Date.now() - t0 };
}
