// Repurposing leads for glioblastoma: approved drugs with published, quote-verified evidence against glioblastoma and NO
// registered glioblastoma/glioma trial. A lead is a hypothesis for researchers, never a treatment, never medical advice.
// Stage A (Muse Spark): PubMed abstracts on glioblastoma + repurposing/approved drugs; the model extracts each drug tested,
//   the level of evidence and an exact quote; Mission Zero's quoteProblem rejects any quote not in the abstract.
// Stage B (free): openFDA drug labels: is the drug approved in the US?
// Stage C (free): ClinicalTrials.gov: any trial registered for glioblastoma or glioma with this drug? Leads = zero trials.
// Stage D (Muse Spark): for each lead, the strongest evidence and any blood-brain barrier statement, quote-verified.
// Usage: node --env-file=.env bench/repurposing-gbm.js a|b|c|d|report      Output: examples/repurposing-gbm/
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const OUT = 'examples/repurposing-gbm'; mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = (f, o) => writeFileSync(join(OUT, f), JSON.stringify(o, null, 2));
const load = (f) => JSON.parse(readFileSync(join(OUT, f), 'utf8'));
async function getJson(url, tries = 4) { for (let i = 0; i < tries; i++) { try { const r = await fetch(url, { headers: { 'user-agent': 'MissionZero/0.1 (research)' } }); if (r.ok) return await r.json(); if (r.status === 404) return null; if (r.status === 429) { await sleep(2000 * (i + 1)); continue; } throw new Error('http ' + r.status); } catch (e) { if (i === tries - 1) throw e; await sleep(1000 * (i + 1)); } } }
function parseLoose(txt) { const m = txt.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch { /* cut */ } } return {}; }
async function model() { const { createClient } = await import('../src/meta.js'); const { quoteProblem } = await import('../src/verify.js'); const c = createClient();
  const json = async (p, max = 6000) => { const a = await c.ask([{ role: 'user', content: p }], { max_tokens: max, tag: 'verify', temperature: 0 }); return parseLoose(typeof a === 'string' ? a : (a.text ?? '')); };
  return { c, json, quoteProblem }; }
async function abstracts(pmids) {
  const out = {}; const dec = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  for (let i = 0; i < pmids.length; i += 100) { const r = await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=' + pmids.slice(i, i + 100).join(',')); const x = await r.text(); await sleep(400);
    for (const art of x.split('<PubmedArticle>').slice(1)) { const id = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1]; if (!id) continue;
      out[id] = { title: dec((art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1] || ''), abstract: [...art.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => dec(m[1])).join(' '), year: (art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || '', types: [...art.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)].map((m) => m[1]) }; } }
  return out;
}
const LEVELS = ['in vitro', 'animal', 'human observational', 'human trial'];

async function stageA() {
  const term = 'glioblastoma[tiab] AND (repurpos*[tiab] OR repositioning[tiab] OR "approved drug"[tiab] OR "FDA-approved"[tiab] OR "approved drugs"[tiab])';
  const s = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=2000&term=' + encodeURIComponent(term));
  const ids = s.esearchresult.idlist; const abs = await abstracts(ids); save('a-abstracts.json', { date: new Date().toISOString(), term, count: ids.length, abs });
  const { c, json, quoteProblem } = await model(); const done = existsSync(join(OUT, 'a-items.json')) ? load('a-items.json') : { items: [], batches: 0 };
  const list = Object.entries(abs).filter(([, a]) => a.abstract.length > 200 && !a.types.includes('Review')); console.log('abstracts', ids.length, 'non-review with text', list.length);
  for (let i = done.batches * 6; i < list.length; i += 6) {
    const batch = list.slice(i, i + 6);
    const v = await json(`For each abstract below, list every DRUG that was itself tested against glioblastoma (glioma cells, animals or patients) in THIS study, not drugs only mentioned. Use the generic drug name in English. Give the level of evidence of THIS study (one of: ${LEVELS.join(', ')}), the effect (positive, negative, unclear), and an exact quote copied from the abstract that states the effect. JSON only: {"items": [{"pmid": "...", "drug": "...", "level": "...", "effect": "...", "quote": "..."}]}\n\n${batch.map(([id, a]) => 'PMID ' + id + ' (' + a.year + '): ' + a.title + ' ' + a.abstract.slice(0, 2500)).join('\n\n')}`);
    for (const it of v.items || []) { const a = abs[it.pmid]; if (!a || !it.drug) continue; const p = quoteProblem(it.quote || '', '', [a.title + ' ' + a.abstract]); done.items.push({ ...it, drug: String(it.drug).toLowerCase().trim(), year: a.year, verified: !p, problem: p || null }); }
    done.batches++; done.usd = c.counter.usd; save('a-items.json', done); process.stdout.write('.');
  }
  console.log('\nitems', done.items.length, 'verified', done.items.filter((x) => x.verified).length, 'usd', c.counter.usd);
}

async function stageB() {
  const { items } = load('a-items.json'); const by = {};
  for (const it of items.filter((x) => x.verified && x.effect === 'positive')) (by[it.drug] ||= []).push(it);
  const drugs = Object.keys(by).sort(); const out = [];
  for (const d of drugs) {
    const q = (f) => 'https://api.fda.gov/drug/label.json?limit=1&search=' + encodeURIComponent(f + ':"' + d + '"');
    let j = await getJson(q('openfda.generic_name')); if (!j) j = await getJson(q('openfda.substance_name')); await sleep(300);
    const lab = j?.results?.[0]; out.push({ drug: d, papers: [...new Set(by[d].map((x) => x.pmid))].length, approvedUS: !!lab, fdaName: lab?.openfda?.generic_name?.[0] || null, indication: (lab?.indications_and_usage?.[0] || '').slice(0, 300) });
    process.stdout.write(lab ? 'A' : '.');
  }
  save('b-approved.json', { date: new Date().toISOString(), drugs: out }); console.log('\npositive drugs', out.length, 'approved US', out.filter((x) => x.approvedUS).length);
}

async function stageC() {
  const { drugs } = load('b-approved.json'); const out = [];
  for (const d of drugs.filter((x) => x.approvedUS)) {
    const n = async (cond) => (await getJson('https://clinicaltrials.gov/api/v2/studies?countTotal=true&pageSize=1&fields=NCTId&query.cond=' + encodeURIComponent(cond) + '&query.intr=' + encodeURIComponent(d.drug)))?.totalCount ?? -1;
    const gbm = await n('glioblastoma'), glioma = await n('glioma'); await sleep(300);
    out.push({ ...d, trialsGlioblastoma: gbm, trialsGlioma: glioma }); process.stdout.write(gbm === 0 && glioma === 0 ? 'L' : '.');
  }
  save('c-trials.json', { date: new Date().toISOString(), drugs: out }); const leads = out.filter((x) => x.trialsGlioblastoma === 0 && x.trialsGlioma === 0);
  console.log('\napproved', out.length, 'with no glioblastoma/glioma trial', leads.length, leads.map((x) => x.drug + '(' + x.papers + ')').join(', '));
}

async function stageD() {
  const { drugs } = load('c-trials.json'); const leads = drugs.filter((x) => x.trialsGlioblastoma === 0 && x.trialsGlioma === 0);
  const { c, json, quoteProblem } = await model(); const out = existsSync(join(OUT, 'd-leads.json')) ? load('d-leads.json').leads : []; const seen = new Set(out.map((x) => x.drug));
  for (const d of leads.filter((x) => !seen.has(x.drug))) {
    const s1 = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=12&sort=relevance&term=' + encodeURIComponent('"' + d.drug + '"[tiab] AND (glioblastoma[tiab] OR glioma[tiab])')); await sleep(400);
    const s2 = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=4&sort=relevance&term=' + encodeURIComponent('"' + d.drug + '"[tiab] AND ("blood-brain barrier"[tiab] OR "brain penetration"[tiab] OR "cerebrospinal fluid"[tiab])')); await sleep(400);
    const ids = [...new Set([...(s1.esearchresult.idlist || []), ...(s2.esearchresult.idlist || [])])]; const abs = await abstracts(ids);
    const v = await json(`Drug: ${d.drug} (approved in the US; label indication: ${d.indication.slice(0, 200)}). Abstracts:\n${Object.entries(abs).map(([id, a]) => 'PMID ' + id + ' (' + a.year + ', ' + a.types.join('/') + '): ' + a.title + ' ' + a.abstract.slice(0, 1800)).join('\n\n')}\n\nAnswer from these abstracts only. 1) The STRONGEST evidence that this drug acts against glioblastoma (level: ${LEVELS.join(', ')}) with an exact quote and its PMID. 2) Any evidence against (no effect, toxicity) with an exact quote, or null. 3) Whether the drug reaches the brain (crosses the blood-brain barrier), with an exact quote and PMID, or null if not stated. JSON only: {"best": {"pmid": "...", "level": "...", "quote": "..."}, "against": {"pmid": "...", "quote": "..."} | null, "brain": {"pmid": "...", "quote": "..."} | null, "summary": "<one neutral sentence>"}`);
    const chk = (x) => x && x.pmid && abs[x.pmid] ? !quoteProblem(x.quote || '', '', [abs[x.pmid].title + ' ' + abs[x.pmid].abstract]) : false;
    out.push({ ...d, papersAll: Number(s1.esearchresult.count || 0), best: v.best || null, bestVerified: chk(v.best), against: v.against || null, againstVerified: chk(v.against), brain: v.brain || null, brainVerified: chk(v.brain), summary: v.summary || '' });
    save('d-leads.json', { date: new Date().toISOString(), usd: c.counter.usd, leads: out }); process.stdout.write('.');
  }
  console.log('\nleads', out.length, 'usd', c.counter.usd);
}

// Stage E (strict, after reading stage D with a critical eye on 2 November): a lead only survives if
// 1. the evidence is about THIS drug (not a derivative) and the drug was tested ALONE or alone + standard care (not in a cocktail);
// 2. the drug's passage into the brain is stated as YES or NO (a quote saying it does NOT cross counts as NO);
// 3. no trial exists under ANY of its names (generic, brand, company codes) on ClinicalTrials.gov (full-text search) or the
//    EU Clinical Trials Register (headless browser);
// 4. its strongest single-drug evidence is in animals or humans.
async function stageE() {
  const { c, json, quoteProblem } = await model();
  const { createRequire } = await import('node:module'); const { chromium } = createRequire(import.meta.url)(process.env.MZ_PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch({ headless: true }); const page = await browser.newPage();
  const L = load('d-leads.json').leads.filter((x) => x.bestVerified && !/turmeric|piperine|arbutin|emodin|thimerosal|diindolylmethane|bisacodyl|phenazopyridine|indocyanine/i.test(x.drug));
  const out = existsSync(join(OUT, 'e-strict.json')) ? load('e-strict.json').leads : []; const seen = new Set(out.map((x) => x.drug));
  for (const d of L.filter((x) => !seen.has(x.drug))) {
    const s1 = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=14&sort=relevance&term=' + encodeURIComponent('"' + d.drug + '"[tiab] AND (glioblastoma[tiab] OR glioma[tiab])')); await sleep(400);
    const s2 = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=relevance&term=' + encodeURIComponent('"' + d.drug + '"[tiab] AND ("blood-brain barrier"[tiab] OR "brain penetration"[tiab] OR "cerebrospinal fluid"[tiab] OR "brain-to-plasma"[tiab])')); await sleep(400);
    const abs = await abstracts([...new Set([...(s1.esearchresult.idlist || []), ...(s2.esearchresult.idlist || [])])]);
    const v = await json(`Drug: ${d.drug}. Abstracts:\n${Object.entries(abs).map(([id, a]) => 'PMID ' + id + ' (' + a.year + ', ' + a.types.join('/') + '): ' + a.title + ' ' + a.abstract.slice(0, 1600)).join('\n\n')}\n\nAnswer strictly from these abstracts.\n1) "single": the STRONGEST evidence where ${d.drug} ITSELF (not a derivative or analogue) was tested ALONE or alone added to standard care (temozolomide/radiotherapy) against glioblastoma. Not a multi-drug cocktail. Give level (${LEVELS.join(', ')}), PMID and an exact quote; or null if none.\n2) "brain": does ${d.drug} cross the blood-brain barrier? crosses = "yes", "no" or "unknown", with PMID and exact quote (or null).\n3) "names": every other name of this drug (brand names, company development codes like ABC-123, salt names).\nJSON only: {"single": {"level": "...", "pmid": "...", "quote": "..."} | null, "brain": {"crosses": "yes|no|unknown", "pmid": "...", "quote": "..."} | null, "names": ["..."]}`);
    const chk = (x) => x && x.pmid && abs[x.pmid] ? !quoteProblem(x.quote || '', '', [abs[x.pmid].title + ' ' + abs[x.pmid].abstract]) : false;
    const names = [...new Set([d.drug, ...(v.names || []).map((n) => String(n).trim()).filter((n) => n.length > 2)])].slice(0, 8);
    const trials = [];
    for (const n of names) { const j = await getJson('https://clinicaltrials.gov/api/v2/studies?pageSize=20&fields=NCTId,BriefTitle&query.term=' + encodeURIComponent('"' + n + '" AND (glioblastoma OR glioma OR "brain tumor")')); await sleep(300);
      for (const st of j?.studies || []) trials.push({ name: n, nct: st.protocolSection.identificationModule.nctId, title: st.protocolSection.identificationModule.briefTitle }); }
    let euctr = null; try { await page.goto('https://www.clinicaltrialsregister.eu/ctr-search/search?query=' + encodeURIComponent(d.drug + ' glioblastoma'), { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(2000);
      const t = await page.evaluate(() => document.body.innerText); const m = t.match(/(\d+)\s+result\(s\) found/i); euctr = m ? Number(m[1]) : (/No results found/i.test(t) ? 0 : null); } catch { euctr = null; }
    const single = v.single && chk(v.single) ? v.single : null; const brain = v.brain && chk(v.brain) ? v.brain : null;
    const lvl = (single?.level || '').toLowerCase(); const strong = /animal|human/.test(lvl);
    const uniqTrials = [...new Map(trials.map((t) => [t.nct, t])).values()];
    out.push({ drug: d.drug, indication: d.indication.replace(/\s+/g, ' ').slice(0, 160), names, single, brain, trials: uniqTrials, euctr,
      survives: !!single && strong && uniqTrials.length === 0 && (euctr === 0) && brain?.crosses !== 'no', why: [!single ? 'no verified single-drug evidence' : '', single && !strong ? 'in vitro only' : '', uniqTrials.length ? uniqTrials.length + ' trial(s) under ' + [...new Set(uniqTrials.map((t) => t.name))].join('/') : '', euctr !== 0 ? 'EU register: ' + euctr : '', brain?.crosses === 'no' ? 'does not cross the blood-brain barrier' : ''].filter(Boolean).join('; ') });
    save('e-strict.json', { date: new Date().toISOString(), usd: c.counter.usd, leads: out }); process.stdout.write(out[out.length - 1].survives ? 'S' : '.');
  }
  await browser.close(); console.log('\nstrict', out.length, 'survive', out.filter((x) => x.survives).length, 'usd', c.counter.usd);
}

const step = process.argv[2];
if (step === 'e') await stageE();
if (step === 'a') await stageA(); else if (step === 'b') await stageB(); else if (step === 'c') await stageC(); else if (step === 'd') await stageD();
else console.log('usage: a | b | c | d');
