// Recomputes the hashed journal of a repair run: node bench/verify-chain.js evidence/repair-<date>
import { verifyChain } from '../src/chain.js';
const folder = process.argv[2];
if (!folder) { console.error('usage: node bench/verify-chain.js evidence/repair-<date>'); process.exit(1); }
const v = verifyChain(folder);
// A mission's sub-folder (from-zero/, F02/) has no chain of its own: the journal lives in the run folder.
if (!v.ok && v.why === 'no chain file') { console.error(`no chain file here, try the parent run folder (${folder}/..)`); process.exit(2); }
console.log(v.ok ? 'chain intact: ' + v.entries + ' records, head ' + v.head : 'CHAIN BROKEN: ' + v.why);
process.exit(v.ok ? 0 : 2);
