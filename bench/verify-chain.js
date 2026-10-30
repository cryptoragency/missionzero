// Recomputes the hashed journal of a repair run: node bench/verify-chain.js evidence/repair-<date> [--head=<hash>] [--count=<n>]
// --head and --count are the values printed at the end of the run: a journal cut after its last record is caught by them.
import { verifyChain } from '../src/chain.js';
const arg = (k) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const folder = process.argv.slice(2).find((x) => !x.startsWith('--'));
if (!folder) { console.error('usage: node bench/verify-chain.js evidence/repair-<date> [--head=<hash>] [--count=<n>]'); process.exit(1); }
const count = arg('count');
if (count !== null && !/^\d+$/.test(count)) { console.error('--count is a number of records'); process.exit(1); }
const head = arg('head') === null ? null : arg('head').toLowerCase();
if (head !== null && !/^[0-9a-f]{12,64}$/.test(head)) { console.error('--head is the hash printed at the end of the run (12 to 64 hex characters)'); process.exit(1); }
// The full head goes to verifyChain; the 12 characters printed at the end of a run are compared as a prefix.
const full = head && head.length === 64 ? head : null;
const v0 = verifyChain(folder, { expectHead: full, expectCount: count === null ? null : Number(count) });
const v = v0.ok && head && !full && !String(v0.head).startsWith(head) ? { ...v0, ok: false, why: 'the head is not the one published at the end of the run (truncated or rewritten)' } : v0;
// A mission's sub-folder (from-zero/, F02/) has no chain of its own: the journal lives in the run folder.
if (!v.ok && v.why === 'no chain file') { console.error(`no chain file here, try the parent run folder (${folder}/..)`); process.exit(2); }
console.log(v.ok ? 'chain intact: ' + v.entries + ' records, head ' + v.head : 'CHAIN BROKEN: ' + v.why);
process.exit(v.ok ? 0 : 2);
