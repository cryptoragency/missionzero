// Secret filter: nothing that looks like a credential reaches the model. Every secret in a text is replaced by a
// placeholder («SECRET_1», «SECRET_2»…) before the call, and the placeholders are turned back into the original
// strings in what the model returns (so an exact-string edit on a line that holds a password still applies).
// The map lives in memory for one call only; it is never written to the evidence folder.
const PATTERNS = [
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_]{6,}/g, // Stripe-like keys
  /\bAKIA[0-9A-Z]{12,}\b/g, // AWS access key ids
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub tokens
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /\bAIza[0-9A-Za-z_-]{30,}/g, // Google API keys
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWTs
  /(Bearer\s+)([A-Za-z0-9._~+/=-]{16,})/gi, // bearer tokens (value only)
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, // private keys
  // KEY=value lines (.env style), define('X_PASSWORD', 'value'), password: 'value', password === 'value'
  /((?:^|[\s,;{(]|\\n)[A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|AUTH_KEY)[A-Z0-9_]*\s*=\s*)(["']?)([^\s"'#\\\n]{4,})\2/g, // also inside a JS string ('...\nKEY=value\n...')
  /((?:password|passwd|secret|token|api_key|apikey|auth_key|private_key)["']?\s*[:=]=?=?\s*)(["'])([^"'\n]{4,})\2/gi,
  /(define\(\s*["'][A-Z0-9_]*(?:PASSWORD|SECRET|KEY|SALT)[A-Z0-9_]*["']\s*,\s*)(["'])([^"'\n]{4,})\2/g,
];
const PLACEHOLDER = /^«SECRET_\d+»$/;

export function maskSecrets(text) {
  const map = new Map(); // placeholder -> original
  const byValue = new Map(); // original -> placeholder
  const placeholder = (value) => {
    if (PLACEHOLDER.test(value)) return value; // already masked by an earlier pattern
    if (byValue.has(value)) return byValue.get(value);
    const p = '«SECRET_' + (map.size + 1) + '»'; map.set(p, value); byValue.set(value, p); return p;
  };
  let out = String(text ?? '');
  for (const re of PATTERNS) {
    out = out.replace(re, (m, ...rest) => {
      // Patterns with groups keep the prefix (and quote) and mask the value; others mask the whole match.
      const g = rest.slice(0, -2).filter((x) => x !== undefined);
      if (g.length === 3) return g[0] + g[1] + placeholder(g[2]) + g[1];
      if (g.length === 2) return g[0] + placeholder(g[1]);
      return placeholder(m);
    });
  }
  const restore = (s) => { let r = String(s ?? ''); for (let pass = 0; pass < 3 && r.includes('«SECRET_'); pass += 1) for (const [p, v] of map) r = r.split(p).join(v); return r; }; // nested placeholders need a second pass
  return { text: out, masked: map.size, restore };
}

// Masks every string value of a JSON-able object, deep (findings, code, recommendations), with one shared numbering.
export function maskDeep(value) {
  const texts = [];
  const collect = (v) => { if (typeof v === 'string') texts.push(v); else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') Object.values(v).forEach(collect); };
  collect(value);
  const SEP = '\n\u0000\n';
  const joined = maskSecrets(texts.join(SEP));
  const parts = joined.text.split(SEP); let i = 0;
  const rebuild = (v) => {
    if (typeof v === 'string') return parts[i++];
    if (Array.isArray(v)) return v.map(rebuild);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rebuild(x)]));
    return v;
  };
  return { value: rebuild(value), masked: joined.masked, restore: joined.restore };
}
