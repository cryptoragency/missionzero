import { createClient } from './meta.js';

// No key: the one line that says which variable is missing, not a stack trace.
let c;
try { c = createClient(); } catch (e) { console.error(e.message); process.exit(1); }
const r = await c.ask([{ role: 'user', content: 'Answer with one word: ready.' }], { max_tokens: 600 });
console.log('Reply:', r.text.trim());
console.log('Tokens:', r.usage, '- estimated cost:', r.counter.usd.toFixed(5), '$ - model:', c.model);
