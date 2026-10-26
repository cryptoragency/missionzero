import { createClient } from './meta.js';

const c = createClient();
const r = await c.ask([{ role: 'user', content: 'Answer with one word: ready.' }], { max_tokens: 600 });
console.log('Reply:', r.text.trim());
console.log('Tokens:', r.usage, '- estimated cost:', r.counter.usd.toFixed(5), '$ - model:', c.model);
