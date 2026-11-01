// npm run certificate -- [certificate.json] [--site=example.org]
// Says whether this installation is certified by CRYPTOR.AGENCY. Exit code 0 when certified, 1 otherwise.
// npm run certificate -- --fingerprint prints the fingerprint of the code here (what an installer signs).
import { verifyCertificate, fingerprint, statusLine, ROOT, DEFAULT_CERTIFICATE } from './certificate.js';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--fingerprint')) { console.log(fingerprint()); process.exit(0); }
const file = args.find((a) => !a.startsWith('--')) || process.env.MZ_CERTIFICATE || join(ROOT, DEFAULT_CERTIFICATE);
const site = (args.find((a) => a.startsWith('--site=')) || '').slice(7) || undefined;
let r; try { r = verifyCertificate(file, { site: site || process.env.MZ_SITE || undefined }); } catch (e) { r = { status: 'error', why: e.message }; }
console.log(statusLine({ file, ...(site ? { site } : {}) }));
if (r.certificate) console.log(JSON.stringify({ status: r.status, ...r.certificate }, null, 2));
process.exit(r.status === 'certified' ? 0 : 1);
