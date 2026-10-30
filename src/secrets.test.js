import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskSecrets, maskDeep } from './secrets.js';

test('env lines, PHP defines, JS passwords and Stripe keys are masked, nothing else', () => {
  const code = "DB_PASSWORD=Verde2019!\nSMTP_PASSWORD=jardin\nSTRIPE_SECRET=sk_live_EXAMPLE_NOT_REAL\ndefine('DB_PASSWORD', 'Verde2019!');\nif (p.password === 'maisonverde2019') ok();\nconst port = 8098;";
  const { text, masked } = maskSecrets(code);
  for (const s of ['Verde2019!', 'jardin', 'sk_live_', 'maisonverde2019']) assert.ok(!text.includes(s), s + ' still in: ' + text);
  const env = text.match(/DB_PASSWORD=(«SECRET_\d+»)/); assert.ok(env, text);
  assert.ok(text.includes("define('DB_PASSWORD', '" + env[1] + "')"), text); // same value, same placeholder
  assert.ok(text.includes('const port = 8098;'));
  assert.equal(masked, 4);
});

test('restore turns the placeholders back into the originals, so an exact edit still applies', () => {
  const code = "if (p.user === 'admin' && p.password === 'maisonverde2019') return admin();";
  const { text, restore } = maskSecrets(code);
  const modelFind = text.slice(text.indexOf('p.password'), text.indexOf(') return'));
  assert.match(modelFind, /«SECRET_\d+»/);
  assert.equal(restore(modelFind), "p.password === 'maisonverde2019'");
});

test('maskDeep masks every string of an object with one numbering and restores', () => {
  const { value, masked, restore } = maskDeep({ finding: { evidence: 'STRIPE_SECRET=sk_live_abc123456' }, code: { 'server.js': "token: 'sk_live_abc123456'" }, n: 3 });
  assert.equal(masked, 1);
  assert.equal(value.n, 3);
  assert.ok(!JSON.stringify(value).includes('sk_live_abc'));
  assert.equal(restore(value.finding.evidence), 'STRIPE_SECRET=sk_live_abc123456');
});

test('a text without secrets is returned unchanged', () => {
  const t = 'Content-Security-Policy: default-src self; the password field must be of type password.';
  assert.equal(maskSecrets(t).text, t);
  assert.equal(maskSecrets(t).masked, 0);
});

// One case per shape: the secret value must be gone from the masked text, and restore must give the original back.
const CASES = [
  ['PASS name in an env line', 'DB_PASS=hunter22x', 'hunter22x'],
  ['PWD name', 'MYSQL_PWD=s3cr3tvalue', 's3cr3tvalue'],
  ['CREDENTIAL name in JSON', '{"gcpCredential": "abcd-efgh-ijkl"}', 'abcd-efgh-ijkl'],
  ['SECRET name in YAML without quotes', 'app:\n  client_secret: Zx81-qq-unquoted', 'Zx81-qq-unquoted'],
  ['SIGN name, colon and quotes', "signing_key: 'k3y-for-signing'", 'k3y-for-signing'],
  ['SALT name', "AUTH_SALT='p8&salty#salt'", 'p8&salty#salt'],
  ['camelCase password in JS', "const dbPassword = 'opensesame1';", 'opensesame1'],
  ['the value does not stop at #', 'PASSWORD=ab#cdef', 'ab#cdef'],
  ['Authorization: Basic', 'Authorization: Basic YWRtaW46c2VjcmV0MTIz', 'YWRtaW46c2VjcmV0MTIz'],
  ['Authorization: Token', 'authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b', '9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b'],
  ['x-api-key header', 'x-api-key: q8w7e6r5t4y3u2i1', 'q8w7e6r5t4y3u2i1'],
  ['Cookie header', 'Cookie: theme=dark; sessionid=abc123def456', 'abc123def456'],
  ['Set-Cookie header, attributes kept', 'Set-Cookie: sid=Zq9xLm2Pv8; Path=/; SameSite=Lax', 'Zq9xLm2Pv8'],
  ['URL with credentials', 'postgres://shop:Verde2019db@db.internal:5432/shop', 'Verde2019db'],
  ['?key= parameter', 'https://maps.example/api?key=abcd1234efgh&z=3', 'abcd1234efgh'],
  ['&access_token= parameter', 'https://graph.example/me?fields=id&access_token=EAAB12345xyz', 'EAAB12345xyz'],
  ['&sig= parameter', 'https://cdn.example/f.png?exp=1&sig=a1b2c3d4e5', 'a1b2c3d4e5'],
  ['&signature= parameter', 'https://s3.example/o?X-Amz-Date=1&signature=ffee00112233', 'ffee00112233'],
  ['sk- key', 'key is sk-abcdefghijklmnop1234 here', 'sk-abcdefghijklmnop1234'],
  ['sk-ant- key', 'sk-ant-api03-AbCdEfGhIjKlMnOpQrSt', 'sk-ant-api03-AbCdEfGhIjKlMnOpQrSt'],
  ['sk-proj- key', 'sk-proj-ZYXWVUTSRQPONMLKJIHG', 'sk-proj-ZYXWVUTSRQPONMLKJIHG'],
  ['SendGrid SG. key', 'SG.abcdefghijklmnopqrstuv.ABCDEFGHIJKLMNOPQRSTUVWX0123', 'SG.abcdefghijklmnopqrstuv.ABCDEFGHIJKLMNOPQRSTUVWX0123'],
  ['npm_ token', 'npm_abcdefghijklmnopqrstuvwxyz0123456789', 'npm_abcdefghijklmnopqrstuvwxyz0123456789'],
  ['whsec_ secret', 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'],
  ['Twilio AC id', 'account AC0123456789abcdef0123456789abcdef', 'AC0123456789abcdef0123456789abcdef'],
  ['Twilio SK id', 'key SKfedcba9876543210fedcba9876543210', 'SKfedcba9876543210fedcba9876543210'],
  ['aws_secret_access_key', 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'],
  ['JWT', 'token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'],
];
for (const [name, text, secret] of CASES) {
  test('masked: ' + name, () => {
    const { text: out, masked, restore } = maskSecrets(text);
    assert.ok(!out.includes(secret), out);
    assert.ok(masked >= 1);
    assert.equal(restore(out), text);
  });
}

test('names that only look like secret words, and code that is not a value, stay as they are', () => {
  const t = "const design = 'modern-look';\nconst passenger = 'Marie Curie';\nif (password === req.body.password) ok();\nreturn { password: hash(p), signup: '/register' };";
  assert.equal(maskSecrets(t).text, t);
});

// Second review: one case per new shape.
const MORE = [
  ['PW name', 'DB_PW=hunter22xyz', 'hunter22xyz'],
  ['pwd in JSON', '{"pwd": "s3cr3t-value"}', 's3cr3t-value'],
  ['ENCRYPTION_KEY with a long value', 'ENCRYPTION_KEY=9f8e7d6c5b4a39281706f5e4', '9f8e7d6c5b4a39281706f5e4'],
  ['JWT_KEY with a long value', "JWT_KEY='a1b2c3d4e5f6g7h8i9j0'", 'a1b2c3d4e5f6g7h8i9j0'],
  ['stripeKey in JS', "const cfg = { stripeKey: 'k7Zq2LmP9xR4tV8wY3bN' };", 'k7Zq2LmP9xR4tV8wY3bN'],
  ['accountKey in JSON', '{"accountKey": "c2VjcmV0LWtleQ"}', 'c2VjcmV0LWtleQ'],
  ['AccountKey in a connection string', 'DefaultEndpointsProtocol=https;AccountName=shop;AccountKey=Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MA==;EndpointSuffix=core.windows.net', 'Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MA=='],
  ['GitLab glpat- token', 'token glpat-AbCdEfGhIjKlMnOpQrSt12 here', 'glpat-AbCdEfGhIjKlMnOpQrSt12'],
  ['Hugging Face hf_ token', 'HF hf_AbCdEfGhIjKlMnOpQrStUvWxYz012345', 'hf_AbCdEfGhIjKlMnOpQrStUvWxYz012345'],
  ['Slack webhook URL', 'post to https://hooks.slack.com/services/T0000AAAA/B1111BBBB/abcdefghijklmnopqrstuvwx', 'T0000AAAA/B1111BBBB/abcdefghijklmnopqrstuvwx'],
];
for (const [name, text, secret] of MORE) {
  test('masked: ' + name, () => {
    const { text: out, masked, restore } = maskSecrets(text);
    assert.ok(!out.includes(secret), out);
    assert.ok(masked >= 1);
    assert.equal(restore(out), text);
  });
}

test('a name ending in key with a short or plain value, and key alone, stay as they are', () => {
  const t = "const k = { key: 'a1b2c3d4e5f6g7h8i9j0', primary_key: 'id', sort_key: 'created_at_desc_order' };\nCACHE_KEY=users";
  assert.equal(maskSecrets(t).text, t);
});

test('maskDeep: a private key cut between two strings does not shift the other fields, and both halves are masked', () => {
  const v = { a: 'before -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA1234', b: 'abcdXYZ\n-----END RSA PRIVATE KEY----- after', c: 'plain text', d: ['DB_PASSWORD=Verde2019!'] };
  const { value, restore } = maskDeep(v);
  assert.equal(value.c, 'plain text');
  assert.ok(value.a.startsWith('before ') && !value.a.includes('MIIE'), value.a);
  assert.ok(value.b.endsWith(' after') && !value.b.includes('abcdXYZ'), value.b);
  assert.ok(!value.d[0].includes('Verde2019!'), value.d[0]);
  assert.equal(restore(value.a), v.a); assert.equal(restore(value.b), v.b); assert.equal(restore(value.d[0]), v.d[0]);
});
