// Secret filter: nothing that looks like a credential reaches the model. Every secret in a text is replaced by a
// placeholder («SECRET_1», «SECRET_2»…) before the call, and the placeholders are turned back into the original
// strings in what the model returns (so an exact-string edit on a line that holds a password still applies).
// The map lives in memory for one call only; it is never written to the evidence folder.

// A name is secret when one of its parts (split on _ - . and camelCase) is a secret word, or when it glues one in
// (dbpassword, apikey). Parts, not substrings: "design", "passenger" or "assign" are not secrets.
const SECRET_PARTS = new Set(['pass', 'passwd', 'password', 'passphrase', 'pwd', 'credential', 'credentials', 'creds', 'secret', 'secrets', 'sign', 'signing', 'signature', 'salt', 'token']);
const SECRET_GLUED = /password|passwd|passphrase|apikey|privatekey|authkey|accesskey|secretkey|signingkey|clientsecret|credential/;
export function isSecretName(name) {
  const n = String(name || '').replace(/^["'`]|["'`]$/g, '');
  const parts = n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split(/[_.\-$]+/).filter(Boolean);
  if (parts.some((p) => SECRET_PARTS.has(p))) return true;
  const glued = n.toLowerCase().replace(/[^a-z]/g, '');
  return SECRET_GLUED.test(glued) || /(?:^|_|-)(?:api|private|auth|access)_?key$/i.test(n);
}

const COOKIE_ATTRS = new Set(['path', 'domain', 'expires', 'max-age', 'samesite', 'priority', 'secure', 'httponly', 'partitioned']);

// Each entry: a regex and what to do with a match. `mask(value)` returns the placeholder of a value.
// Order matters: the shapes that are secrets by themselves come first, then the named assignments.
const PATTERNS = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g }, // private keys
  { re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g }, // Anthropic, OpenAI keys
  { re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_]{6,}/g }, // Stripe-like keys
  { re: /\bwhsec_[A-Za-z0-9+/=_]{16,}/g }, // webhook signing secrets
  { re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g }, // SendGrid keys
  { re: /\bnpm_[A-Za-z0-9]{20,}\b/g }, // npm tokens
  { re: /\b(?:AC|SK)[0-9a-f]{32}\b/g }, // Twilio account and API key ids
  { re: /\bAKIA[0-9A-Z]{12,}\b/g }, // AWS access key ids
  { re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g }, // GitHub tokens
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g }, // Slack tokens
  { re: /\bAIza[0-9A-Za-z_-]{30,}/g }, // Google API keys
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g }, // JWTs
  // Credentials inside a URL: scheme://user:password@host (the password only).
  { re: /(\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/"'<>]+:)([^\s@/"'<>]{3,})(@)/gi, fn: (g, mask) => g[0] + mask(g[1]) + g[2] },
  // Authorization headers (Basic, Token, Digest, Bearer) and API key headers: the value only.
  { re: /((?:proxy-)?authorization["']?\s*[:=]\s*["']?(?:Basic|Token|Digest|Bearer)\s+)([^\s"',;]{6,})/gi, fn: (g, mask) => g[0] + mask(g[1]) },
  { re: /(Bearer\s+)([A-Za-z0-9._~+/=-]{16,})/gi, fn: (g, mask) => g[0] + mask(g[1]) },
  { re: /((?:x-api-key|x-auth-token|api-key)["']?\s*[:=]\s*["']?)([^\s"',;]{6,})/gi, fn: (g, mask) => g[0] + mask(g[1]) },
  // Cookie and Set-Cookie: the value of every name=value pair, not the attributes (Path, SameSite…).
  { re: /((?:set-)?cookie["']?\s*:\s*["']?)([^\n\r"']+)/gi, fn: (g, mask) => g[0] + g[1].replace(/([\w.-]+=)([^;,\s]{4,})/g, (m, k, v) => (COOKIE_ATTRS.has(k.slice(0, -1).toLowerCase()) ? m : k + mask(v))) },
  { re: /(aws_secret_access_key["']?\s*[:=]\s*["']?)([A-Za-z0-9/+=]{16,})/gi, fn: (g, mask) => g[0] + mask(g[1]) },
  // PHP defines: define('X_PASSWORD', 'value').
  { re: /(define\(\s*["'][A-Z0-9_]*(?:PASSWORD|SECRET|KEY|SALT|TOKEN)[A-Z0-9_]*["']\s*,\s*)(["'])([^"'\n]{4,})\2/g, fn: (g, mask) => g[0] + g[1] + mask(g[2]) + g[1] },
  // Quoted values of a secret name, in any syntax: JSON "password": "x", JS password: 'x', p.password === 'x', YAML key: "x".
  { re: /((?:^|[^\w$.-])(["']?)([A-Za-z_$][\w$.-]*)\2\s*(?:===?|==|:|=)\s*)(["'`])([^"'`\n]{4,})\4/g, fn: (g, mask) => (isSecretName(g[2]) ? g[0] + g[3] + mask(g[4]) + g[3] : null) },
  // .env lines, also inside a JS string ('...\nKEY=value\n...'): the value runs to the end of the token, # included.
  // UPPER_CASE names anywhere; lower-case names only at the start of a line (an .ini file, not `password = req.body.x`).
  { re: /((?:^|[\s,;{(]|\\n)([A-Za-z0-9_.-]+)\s*=\s*)([^\s"'`\\]{4,})/gm, fn: (g, mask) => {
    const lineStart = g[0].startsWith(g[1]) || g[0].startsWith('\\n') || /^\r?\n/.test(g[0]);
    return isSecretName(g[1]) && (/^[A-Z0-9_]+$/.test(g[1]) || lineStart) && !/^[\w$.]+\(/.test(g[2]) ? g[0] + mask(g[2]) : null;
  } },
  // YAML without quotes: "  password: value" at the start of a line (not a JS object line such as `password: hash(p),`).
  { re: /^([ \t]*-?[ \t]*([A-Za-z0-9_.-]+):[ \t]+)([^\s"'`|>{[][^\n]{3,}?)[ \t]*$/gm, fn: (g, mask) => (isSecretName(g[1]) && !/[(),;]\s*$|\(/.test(g[2]) ? g[0] + mask(g[2]) : null) },
  // Query strings and form bodies: ?key=, &access_token=, &sig=, password=…
  { re: /([?&](?:key|api_key|apikey|access_token|token|sig|signature|secret|password|passwd|pwd)=)([^&\s"'#\\]{4,})/gi, fn: (g, mask) => g[0] + mask(g[1]) },
  { re: /((?:^|[^\w])(?:password|passwd|secret|token|api_key|apikey)=)([^&\s"'\\\n]{4,})/gi, fn: (g, mask) => g[0] + mask(g[1]) },
];
const PLACEHOLDER = /^«SECRET_\d+»$/;

export function maskSecrets(text) {
  const map = new Map(); // placeholder -> original
  const byValue = new Map(); // original -> placeholder
  const mask = (value) => {
    if (PLACEHOLDER.test(value) || value.includes('«SECRET_')) return value; // already masked by an earlier pattern
    if (byValue.has(value)) return byValue.get(value);
    const p = '«SECRET_' + (map.size + 1) + '»'; map.set(p, value); byValue.set(value, p); return p;
  };
  let out = String(text ?? '');
  for (const { re, fn } of PATTERNS) {
    out = out.replace(re, (m, ...rest) => {
      if (!fn) return mask(m);
      const r = fn(rest.slice(0, -2).map((x) => (x === undefined ? '' : x)), mask); // the groups, without offset and input
      return r === null ? m : r; // null: the name is not a secret, the text stays as it is
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
