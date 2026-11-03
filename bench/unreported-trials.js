// Unreported trials: which completed phase 3 cancer trials funded by industry have no results anywhere?
// Stage 1 (free, no model): ClinicalTrials.gov lists completed industry phase 3 cancer trials, finished more than two years
// ago, with no results posted on the registry. A fixed random sample is checked against the registry's own references,
// PubMed and Europe PMC by trial number. Stage 2 (Meta model, Mission Zero): only the trials still not found go to a
// Mission Zero mission that searches by drug, sponsor and acronym, reads the pages, and must quote the page that names the trial.
// Usage: node bench/unreported-trials.js stage1 [--sample=300] [--seed=20261102]
//        node --env-file=.env bench/unreported-trials.js stage2 [--max=60] [--parallel=3]
//        node bench/unreported-trials.js report
// Output: examples/unreported-trials/ (sample.json, stage1.json, missions/, report.md). Nothing is ever posted anywhere.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const OUT = 'examples/unreported-trials';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const FILTER = 'AREA[OverallStatus]COMPLETED AND AREA[StudyType]INTERVENTIONAL AND AREA[Phase]PHASE3 AND AREA[LeadSponsorClass]INDUSTRY AND AREA[HasResults]false AND AREA[CompletionDate]RANGE[MIN,2024-10-31]';
const FIELDS = 'NCTId,BriefTitle,OfficialTitle,Acronym,LeadSponsorName,EnrollmentCount,CompletionDate,InterventionName,Condition,ReferencePMID,ReferenceType,SecondaryId';

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'MissionZero/0.1 (research transparency bench)' } }); if (r.ok) return await r.json(); if (r.status === 429) { await sleep(2000 * (i + 1)); continue; } throw new Error('http ' + r.status); }
    catch (e) { if (i === tries - 1) throw e; await sleep(1000 * (i + 1)); }
  }
}

// A model answer cut short (finish_reason length) still yields the fields it wrote in full.
function parseLoose(txt) {
  const m = txt.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch { /* cut short */ } }
  const out = {};
  for (const k of ['results', 'quote', 'why', 'pmid', 'index', 'queries']) {
    const r = txt.match(new RegExp('"' + k + '"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|true|false|null|-?\\d+|\\[[^\\]]*\\])'));
    if (r) { try { out[k] = JSON.parse(r[1]); } catch { /* skip */ } }
  }
  return out;
}

// Seeded shuffle, so the sample can be drawn again by anyone.
function shuffle(a, seed) { let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

async function stage1() {
  const all = []; let token = '';
  do {
    const u = 'https://clinicaltrials.gov/api/v2/studies?pageSize=1000&countTotal=true&query.cond=cancer&fields=' + FIELDS + '&filter.advanced=' + encodeURIComponent(FILTER) + (token ? '&pageToken=' + token : '');
    const j = await getJson(u); all.push(...j.studies); token = j.nextPageToken || '';
  } while (token);
  const trials = all.map((x) => { const p = x.protocolSection; return {
    nct: p.identificationModule.nctId, title: p.identificationModule.briefTitle, official: p.identificationModule.officialTitle || '', acronym: p.identificationModule.acronym || '',
    secondaryIds: (p.identificationModule.secondaryIdInfos || []).map((s) => s.id), sponsor: p.sponsorCollaboratorsModule.leadSponsor.name,
    enrollment: p.designModule?.enrollmentInfo?.count ?? null, completion: p.statusModule.completionDateStruct?.date || '',
    interventions: (p.armsInterventionsModule?.interventions || []).map((i) => i.name), conditions: p.conditionsModule?.conditions || [],
    registryRefs: (p.referencesModule?.references || []).filter((r) => r.type === 'RESULT').map((r) => r.pmid).filter(Boolean) }; });
  const seed = Number(arg('seed', 20261102)), n = Number(arg('sample', 300));
  const sample = shuffle(trials.slice().sort((a, b) => a.nct.localeCompare(b.nct)), seed).slice(0, n);
  writeFileSync(join(OUT, 'sample.json'), JSON.stringify({ date: new Date().toISOString(), filter: FILTER, condition: 'cancer', population: trials.length, seed, sample }, null, 2));
  console.log('population', trials.length, 'sample', sample.length);
  const rows = [];
  for (const t of sample) {
    const pm = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=20&term=' + encodeURIComponent(t.nct + '[si] OR ' + t.nct + '[tiab]'));
    await sleep(380);
    const ep = await getJson('https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=20&query=' + encodeURIComponent('"' + t.nct + '"'));
    const pmids = pm.esearchresult?.idlist || [], epHits = (ep.resultList?.result || []).map((r) => ({ id: r.pmid || r.pmcid || r.id, title: r.title, year: r.pubYear, source: r.source }));
    const found = t.registryRefs.length > 0 || pmids.length > 0 || epHits.length > 0;
    rows.push({ nct: t.nct, found, registryRefs: t.registryRefs, pubmed: pmids, europepmc: epHits.slice(0, 5), europepmcCount: ep.hitCount || 0 });
    process.stdout.write(found ? '.' : 'o');
  }
  writeFileSync(join(OUT, 'stage1.json'), JSON.stringify({ date: new Date().toISOString(), rows }, null, 2));
  const miss = rows.filter((r) => !r.found);
  console.log('\nfound by trial number', rows.length - miss.length, '/', rows.length, '· not found', miss.length);
}


// Stage 1b (free): for each trial not found by number, PubMed by drug + condition + phase 3 / randomized, the 5 best records.
const STOP = /^(placebo|standard|best supportive care|observation|chemotherapy|radiation|radiotherapy|surgery)$/i;
async function stage1b() {
  const s = JSON.parse(readFileSync(join(OUT, 'sample.json'), 'utf8')), r = JSON.parse(readFileSync(join(OUT, 'stage1.json'), 'utf8'));
  const byId = new Map(s.sample.map((t) => [t.nct, t])); const out = {};
  for (const row of r.rows.filter((x) => !x.found)) {
    const t = byId.get(row.nct);
    const drugs = t.interventions.map((d) => d.replace(/[[\]()"]/g, ' ').trim()).filter((d) => d && !STOP.test(d)).slice(0, 3);
    const cond = (t.conditions[0] || 'cancer').replace(/[[\]()"]/g, ' ').split(/\s+/).filter((w) => w.length > 3).slice(0, 2).join(' ');
    // the first word of each drug name ("Esomeprazole magnesium Nexium" -> esomeprazole), codes kept whole (HS022, ZD6474)
    const words = [...new Set(drugs.map((d) => d.split(/\s+/)[0]).filter((w) => w.length > 3))];
    const base = '(' + words.map((w) => w + '[tiab]').join(' OR ') + ') AND (' + cond + ')';
    const ask = (term) => getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=relevance&term=' + encodeURIComponent(term));
    let term = base + ' AND (phase III[tiab] OR phase 3[tiab] OR randomized[tiab] OR randomised[tiab] OR open-label[tiab])';
    let j = words.length ? await ask(term) : { esearchresult: { idlist: [] } }; await sleep(380);
    if (words.length && !(j.esearchresult?.idlist || []).length) { term = base; j = await ask(term); await sleep(380); }
    const ids = j.esearchresult?.idlist || []; let recs = [];
    if (ids.length) { const sm = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=' + ids.join(',')); await sleep(380);
      recs = ids.map((id) => ({ pmid: id, title: sm.result?.[id]?.title || '', year: (sm.result?.[id]?.pubdate || '').slice(0, 4), journal: sm.result?.[id]?.source || '', url: 'https://pubmed.ncbi.nlm.nih.gov/' + id + '/' })); }
    out[t.nct] = { term, count: Number(j.esearchresult?.count || 0), candidates: recs }; process.stdout.write(String(recs.length));
  }
  writeFileSync(join(OUT, 'stage1b.json'), JSON.stringify({ date: new Date().toISOString(), out }, null, 2)); console.log('\nstage1b done', Object.keys(out).length);
}

const goalFor = (t, cands = []) => `Has the completed phase 3 cancer trial ${t.nct} published its results anywhere? Trial: "${t.title}"${t.acronym ? ' (acronym ' + t.acronym + ')' : ''}; sponsor ${t.sponsor}; drugs: ${t.interventions.slice(0, 4).join(', ')}; completed ${t.completion}; ${t.enrollment ?? '?'} participants${t.secondaryIds.length ? '; other ids: ' + t.secondaryIds.slice(0, 3).join(', ') : ''}. Search beyond the trial number: the acronym, the drug with the sponsor and "phase 3" or "phase III", PubMed (pubmed.ncbi.nlm.nih.gov, readable, search by drug + condition + phase III + sponsor), the EU Clinical Trials Register, the sponsor's results site, conference abstracts (ASCO, ESMO). ${cands.length ? "PubMed records that MAY be this trial (read each one; most will be other trials): " + cands.map((c) => c.url + " (" + c.year + ", " + c.title.slice(0, 90) + ")").join("; ") + ". " : ""}Answer with ONE of three words first. FOUND: results are public; give the URL and an exact quote that identifies THIS trial (its number, acronym, sponsor code, or exact design and size). PROBABLE: you saw a publication or results page that seems to be this trial but could not read or confirm it (blocked, paywalled); give its URL and title. NOT FOUND: no publication or results page at all after searching; list what you searched. Never guess.`;

function runMission(t) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['--env-file=.env', 'src/run.js', goalFor(t, t.cands || []), '3', '1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => { const m = out.match(/Evidence folder: (\S+)/); resolve({ code, folder: m ? m[1] : null, tail: out.slice(-600) }); });
  });
}

async function stage2() {
  const s = JSON.parse(readFileSync(join(OUT, 'sample.json'), 'utf8')), r = JSON.parse(readFileSync(join(OUT, 'stage1.json'), 'utf8'));
  const byId = new Map(s.sample.map((t) => [t.nct, t])); mkdirSync(join(OUT, 'missions'), { recursive: true });
  const c1b = existsSync(join(OUT, 'stage1b.json')) ? JSON.parse(readFileSync(join(OUT, 'stage1b.json'), 'utf8')).out : {}; for (const [k, v] of Object.entries(c1b)) if (byId.has(k)) byId.get(k).cands = v.candidates;
  const done = new Set(readdirSync(join(OUT, 'missions')).map((f) => f.replace('.json', '')));
  const todo = r.rows.filter((x) => !x.found && !done.has(x.nct)).slice(0, Number(arg('max', 60))).map((x) => byId.get(x.nct));
  const par = Number(arg('parallel', 3)); let i = 0;
  console.log('missions to run', todo.length);
  const worker = async () => { while (i < todo.length) { const t = todo[i++]; const res = await runMission(t); let summary = null, answer = null;
    if (res.folder) { try { summary = JSON.parse(readFileSync(join(res.folder, 'summary.json'), 'utf8')); answer = JSON.parse(readFileSync(join(res.folder, 'final-answer.json'), 'utf8')); } catch { /* run stopped */ } }
    writeFileSync(join(OUT, 'missions', t.nct + '.json'), JSON.stringify({ nct: t.nct, folder: res.folder, code: res.code, answer: answer?.answer ?? null, sources: answer?.sources ?? [], judge: answer?.judge ? { score: answer.judge.score, green: answer.judge.green, red: answer.judge.red } : null, usd: summary?.cost?.usd ?? null, tail: summary ? undefined : res.tail }, null, 2));
    console.log(t.nct, res.code, summary ? '$' + summary.cost.usd.toFixed(3) : 'no summary', (answer?.answer || res.tail).replace(/\s+/g, ' ').slice(0, 140));
    if (/Daily cap|Spending cap/.test(res.tail)) { i = todo.length; } } };
  await Promise.all(Array.from({ length: par }, worker));
}

// Stage 2 (Meta model, Mission Zero's rule): for each trial still not found, the model reads the registry record and the PubMed
// candidates (title + abstract) and must name the record that reports THIS trial with an exact quote. The quote is then checked
// by Mission Zero's own quoteProblem against the abstract: no quote in the text, no match. One call per trial.
async function abstracts(pmids) {
  if (!pmids.length) return {};
  const r = await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=' + pmids.join(',')); const x = await r.text(); await sleep(380);
  const out = {}; const dec = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  for (const art of x.split('<PubmedArticle>').slice(1)) {
    const id = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1]; if (!id) continue;
    const title = dec((art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1] || '');
    const abs = [...art.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => dec(m[1])).join(' ');
    const ids = [...art.matchAll(/<AccessionNumber>([^<]+)<\/AccessionNumber>/g)].map((m) => m[1]);
    out[id] = { title, abstract: abs, accession: ids };
  }
  return out;
}
async function match() {
  const { createClient } = await import('../src/meta.js'); const { quoteProblem } = await import('../src/verify.js');
  const client = createClient(); const ask = (m, o) => client.ask(m, { max_tokens: 1500, tag: 'verify', ...o });
  const s = JSON.parse(readFileSync(join(OUT, 'sample.json'), 'utf8')), r = JSON.parse(readFileSync(join(OUT, 'stage1.json'), 'utf8'));
  const c1b = JSON.parse(readFileSync(join(OUT, 'stage1b.json'), 'utf8')).out; const byId = new Map(s.sample.map((t) => [t.nct, t]));
  const file = join(OUT, 'stage2.json'); const done = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).rows : [];
  const seen = new Set(done.map((x) => x.nct)); const rows = done.slice();
  for (const row of r.rows.filter((x) => !x.found && !seen.has(x.nct))) {
    const t = byId.get(row.nct), cands = (c1b[row.nct]?.candidates || []); const abs = await abstracts(cands.map((c) => c.pmid));
    let verdict = 'NOT FOUND', pmid = null, quote = '', why = '', problem = null;
    if (cands.length) {
      const recs = cands.map((c) => ({ pmid: c.pmid, year: c.year, journal: c.journal, title: abs[c.pmid]?.title || c.title, abstract: (abs[c.pmid]?.abstract || '').slice(0, 2500) }));
      const prompt = `Registry record of a completed phase 3 trial:\n${JSON.stringify({ nct: t.nct, title: t.title, official: t.official, acronym: t.acronym, sponsor: t.sponsor, sponsorIds: t.secondaryIds, drugs: t.interventions, conditions: t.conditions, participants: t.enrollment, completed: t.completion })}\n\nPubMed records:\n${recs.map((x) => JSON.stringify(x)).join('\n')}\n\nDoes one of these PubMed records report the results of THIS trial (same drug and comparator, same disease, same design, a matching size or the trial number or acronym)? A review, another trial of the same drug, or a pooled analysis that does not single out this trial is NOT a match. Answer JSON only: {"pmid": "<id or null>", "quote": "<exact words copied from that record's title or abstract that identify this trial: its size, design, comparator or number>", "why": "<one sentence>"}`;
      try {
        const a = await ask([{ role: 'user', content: prompt }]); const txt = typeof a === 'string' ? a : (a.text ?? a.content ?? ''); const j = JSON.parse((txt.match(/\{[\s\S]*\}/) || ['{}'])[0]);
        if (j.pmid && j.pmid !== 'null' && abs[j.pmid]) { problem = quoteProblem(j.quote || '', '', [abs[j.pmid].title + ' ' + abs[j.pmid].abstract]); pmid = String(j.pmid); quote = j.quote || ''; why = j.why || ''; verdict = problem ? 'REJECTED QUOTE' : 'FOUND'; }
        else { why = j.why || ''; }
      } catch (e) { verdict = 'ERROR'; why = e.message.slice(0, 160); if (/cap/i.test(e.message)) { rows.push({ nct: t.nct, verdict, why }); break; } }
    }
    rows.push({ nct: t.nct, sponsor: t.sponsor, enrollment: t.enrollment, completion: t.completion, title: t.title, verdict, pmid, url: pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + pmid + '/' : null, quote, why, problem, candidates: cands.length });
    writeFileSync(file, JSON.stringify({ date: new Date().toISOString(), usd: client.counter?.usd, rows }, null, 2));
    process.stdout.write(verdict === 'FOUND' ? 'F' : verdict === 'NOT FOUND' ? 'n' : verdict === 'REJECTED QUOTE' ? 'r' : 'E');
  }
  console.log('\nmatch done', rows.length, 'usd this run', client.counter?.usd);
}

// Stage 3 (Meta model + the web, Mission Zero's rule): for each trial still NOT FOUND, two web searches (the trial number,
// then the acronym or drug + sponsor + phase 3). Registry copies are set aside. The model picks the result that may report
// THIS trial; Mission Zero reads that page and the model must copy an exact quote from it; quoteProblem checks the quote.
// A failed search is recorded as such, never as "not found". A page that blocks reading is PROBABLE, never "not found".
const MIRRORS = /clinicaltrials\.gov|clinicaltrials\.gg|medpath|veeva|trialbulletin|centerwatch|withpower|ichgcp|clinicaltrials\.eu\/trial|findmecure|clinicaltrialsregister\.eu\/ctr-search\/search|trialx|cancer\.gov\/research\/participate|trials\.cancer\.gov|smartpatients|clinicaltrial\.be|policylab|drugpatentwatch|pharmacompass|globaldata|cortellis|ctri\.nic|isrctn\.com\/search|who\.int\/trialsearch|trialsearch\.who\.int|anzctr|chictr|jrct|umin\.ac\.jp\/ctr|pubmed\.ncbi|larvol|synapse\.patsnap|trialsummaries/i;
// A journal that blocks robots: its abstract is read in Europe PMC (open), found by the DOI or PMC id in the address.
async function viaEuropePmc(u) {
  const doi = (decodeURIComponent(u).match(/10\.\d{4,9}\/[^?#\s]+/) || [])[0]; const pmc = (u.match(/PMC\d+/i) || [])[0];
  if (!doi && !pmc) return null;
  const clean = doi ? doi.replace(/\/(full|abstract|pdf|epdf|fulltext)$/i, '').replace(/[.,;)]$/, '') : '';
  const q = pmc ? 'PMCID:' + pmc.toUpperCase() : 'DOI:"' + clean + '"';
  try {
    const j = await getJson('https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&query=' + encodeURIComponent(q));
    const r = (j.resultList?.result || [])[0]; if (!r || !r.abstractText) return null;
    const text = (r.title + ' ' + r.abstractText).replace(/<[^>]+>/g, ' ');
    return { ok: true, url: u, text, readVia: 'https://europepmc.org/article/' + (r.source || 'MED') + '/' + (r.id || '') };
  } catch { return null; }
}
async function web() {
  const { createClient } = await import('../src/meta.js'); const { quoteProblem } = await import('../src/verify.js'); const { webSearch, readPage } = await import('../src/tools.js');
  const client = createClient(); const ask = (m) => client.ask(m, { max_tokens: 4000, tag: 'verify' });
  const json = async (prompt) => { const a = await ask([{ role: 'user', content: prompt }]); return parseLoose(typeof a === 'string' ? a : (a.text ?? '')); };
  const s = JSON.parse(readFileSync(join(OUT, 'sample.json'), 'utf8')), byId = new Map(s.sample.map((t) => [t.nct, t]));
  // round 2 (--round=2): the trials still NOT FOUND after round 1, searched by sponsor code and by exact official title
  const ROUND = Number(arg('round', 1));
  const st2 = JSON.parse(readFileSync(join(OUT, ROUND === 2 ? 'stage3.json' : 'stage2.json'), 'utf8')).rows;
  const file = join(OUT, ROUND === 2 ? 'stage3b.json' : 'stage3.json'); const rows = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).rows : []; const seen = new Set(rows.map((x) => x.nct));
  for (const r2 of st2.filter((x) => x.verdict === 'NOT FOUND' && !seen.has(x.nct))) {
    const t = byId.get(r2.nct); const drug = (t.interventions.find((d) => !/placebo/i.test(d)) || t.interventions[0] || '').split(/\s+/)[0];
    const sponsor = t.sponsor.split(/[\s,]+/)[0]; const cond = (t.conditions[0] || '').split(/\s+/).slice(0, 3).join(' ');
    const titleWords = (t.official || t.title).replace(/["()[\]]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 14).join(' ');
    const code = t.secondaryIds.find((x) => !/^NCT/i.test(x) && x.length >= 5);
    const queries = ROUND === 2
      ? [code ? '"' + code + '" results' : `${drug} ${cond} phase III ${t.completion.slice(0, 4)} ${sponsor}`, titleWords]
      : ['"' + t.nct + '"', t.acronym ? `"${t.acronym}" ${drug} phase 3 results` : `${drug} ${sponsor} phase 3 ${cond} results`];
    let searchFailed = 0; const results = [];
    for (const q of queries) { const r = await webSearch(q); await sleep(2500); if (!r.ok && r.error) { searchFailed++; continue; } for (const x of r.results || []) if (x.url && !MIRRORS.test(x.url) && !results.some((y) => y.url === x.url)) results.push(x); }
    const row = { nct: t.nct, queries, searchFailed, kept: results.length, verdict: 'NOT FOUND', url: null, quote: '', why: '' };
    if (searchFailed === queries.length) row.verdict = 'SEARCH FAILED';
    else if (results.length) {
      try {
        const pick = await json(`Registry record of a completed phase 3 trial: ${JSON.stringify({ nct: t.nct, title: t.title, acronym: t.acronym, sponsor: t.sponsor, sponsorIds: t.secondaryIds, drugs: t.interventions, conditions: t.conditions, participants: t.enrollment, completed: t.completion })}\nWeb results:\n${results.slice(0, 12).map((x, i) => i + '. ' + x.url + ' | ' + x.title + ' | ' + x.snippet).join('\n')}\nWhich result most likely REPORTS THE RESULTS of THIS trial (a journal article, a conference abstract, a sponsor results synopsis, a results page)? A page that only describes or lists the trial is not results. JSON only: {"index": <number or null>, "why": "<one sentence>"}`);
        if (pick.index != null && results[pick.index]) {
          const u = results[pick.index].url; row.url = u; let page = await readPage(u, { maxChars: 60000 });
          if (!page.ok) { const alt = await viaEuropePmc(u); if (alt) { page = alt; row.readVia = alt.readVia; } }
          if (!page.ok) { row.verdict = 'PROBABLE'; row.why = 'page not readable: ' + (page.error || '') + ' · ' + (pick.why || ''); }
          else {
            const v = await json(`Registry record: ${JSON.stringify({ nct: t.nct, title: t.title, acronym: t.acronym, sponsor: t.sponsor, drugs: t.interventions, participants: t.enrollment })}\nPage ${u}:\n${page.text.slice(0, 40000)}\nDoes this page report RESULTS of THIS trial? JSON only: {"results": true|false, "quote": "<exact words copied from the page that identify this trial AND state a result>", "why": "<one sentence>"}`);
            const problem = v.results ? quoteProblem(v.quote || '', '', [page.text]) : 'no results on the page';
            row.quote = v.quote || ''; row.why = v.why || ''; row.problem = problem; row.verdict = v.results && !problem ? 'FOUND' : 'NOT FOUND';
          }
        } else row.why = pick.why || '';
      } catch (e) { row.verdict = 'ERROR'; row.why = e.message.slice(0, 160); if (/cap/i.test(e.message)) { rows.push(row); writeFileSync(file, JSON.stringify({ date: new Date().toISOString(), rows }, null, 2)); console.log('\nCAP REACHED'); return; } }
    }
    rows.push(row); writeFileSync(file, JSON.stringify({ date: new Date().toISOString(), usd: client.counter?.usd, rows }, null, 2));
    process.stdout.write({ 'FOUND': 'F', 'NOT FOUND': 'n', 'PROBABLE': 'p', 'SEARCH FAILED': 's', 'ERROR': 'E' }[row.verdict] || '?');
  }
  console.log('\nweb done', rows.length, 'usd this run', client.counter?.usd);
}

// Stage 5 (deep, after the independent audit of 2 November): the four ways the audit showed Mission Zero missing results.
// A. the model writes two PubMed queries with synonyms (brand -> generic, "mistletoe extract" for "Abnoba Viscum"), limited
//    to the trial's years; up to 12 candidates, then the same match + quoteProblem rule;
// B. the EU Clinical Trials Register read in a headless browser (it refuses plain fetches), by EudraCT number or NCT search;
// C. sponsor results sites: links to a study synopsis or clinical study report (PDF) are followed and read;
// D. every quote is still checked by quoteProblem against the text actually read.
async function deep() {
  const { createClient } = await import('../src/meta.js'); const { quoteProblem } = await import('../src/verify.js'); const { webSearch, readPage } = await import('../src/tools.js');
  const { createRequire } = await import('node:module'); const { chromium } = createRequire(import.meta.url)(process.env.MZ_PLAYWRIGHT || 'playwright');
  // temperature 0: the same trial must get the same answer from one run to the next
  const client = createClient(); const ask = (m) => client.ask(m, { max_tokens: 4000, tag: 'verify', temperature: 0 });
  const json = async (prompt) => { const a = await ask([{ role: 'user', content: prompt }]); return parseLoose(typeof a === 'string' ? a : (a.text ?? '')); };
  // A rejected quote gets ONE second chance: the model must copy a sentence character for character; quoteProblem judges again.
  const requote = async (text) => { const v = await json(`Copy, CHARACTER FOR CHARACTER, one passage of 8 to 30 words from the text below that states a result of the trial (a number, a P value, a rate). Do not change a single character, do not join separate lines. JSON only: {"quote": "..."}\n\nText:\n${text.slice(0, 40000)}`); const p = quoteProblem(v.quote || '', '', [text]); return p ? null : v.quote; };
  const browser = await chromium.launch({ headless: true }); const page = await browser.newPage();
  const browse = async (u) => { try { await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.body ? document.body.innerText : ''); const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, t: (a.innerText || '').trim().slice(0, 80) })));
    return { ok: text.length > 300, text, links }; } catch (e) { return { ok: false, text: '', links: [], error: e.message.slice(0, 80) }; } };
  const s = JSON.parse(readFileSync(join(OUT, 'sample.json'), 'utf8')), byId = new Map(s.sample.map((t) => [t.nct, t]));
  const prev = JSON.parse(readFileSync(join(OUT, 'stage3b.json'), 'utf8')).rows.filter((x) => x.verdict === 'NOT FOUND');
  const only = arg('only', ''); const file = join(OUT, only ? 'stage5-check.json' : 'stage5.json');
  const rows = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).rows : []; const seen = new Set(rows.map((x) => x.nct));
  const list = only ? only.split(',') : prev.map((x) => x.nct);
  const rec = (t) => JSON.stringify({ nct: t.nct, title: t.title, official: t.official, acronym: t.acronym, sponsor: t.sponsor, sponsorIds: t.secondaryIds, drugs: t.interventions, conditions: t.conditions, participants: t.enrollment, completed: t.completion });
  const confirm = async (t, text, where) => {
    const v = await json(`Registry record: ${rec(t)}\nText read at ${where}:\n${text.slice(0, 40000)}\nDoes this text report RESULTS of THIS trial (same drug and comparator, disease, design, matching size, or its number/acronym/sponsor code)? JSON only: {"results": true|false, "quote": "<exact words copied from the text that identify this trial AND state a result>", "why": "<one sentence>"}`);
    let quote = v.quote || ''; let problem = v.results ? quoteProblem(quote, '', [text]) : 'no results';
    if (v.results && problem) { const q2 = await requote(text); if (q2) { quote = q2; problem = null; } }
    return { ok: !!v.results && !problem, quote, why: v.why || '', problem };
  };
  for (const nct of list.filter((n) => !seen.has(n))) {
    const t = byId.get(nct); const row = { nct, verdict: 'NOT FOUND', via: null, url: null, quote: '', why: '', tried: [] };
    try {
      // A. PubMed with model-written queries, limited to the trial's years
      const y = Number((t.completion || '2010').slice(0, 4)); const q = await json(`Registry record of a completed phase 3 trial: ${rec(t)}\nWrite two PubMed queries most likely to retrieve the paper or abstract reporting THIS trial's results. Use generic drug names and synonyms (brand -> generic, product code -> substance), the disease and the comparator; use [tiab] fields; no date filter (added later). JSON only: {"queries": ["...", "..."]}`);
      const pmids = [];
      for (const qq of (q.queries || []).slice(0, 2)) { const j = await getJson('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=8&sort=relevance&term=' + encodeURIComponent('(' + qq + ') AND ' + (y - 4) + ':' + (y + 7) + '[pdat]')); await sleep(380); for (const id of j.esearchresult?.idlist || []) if (!pmids.includes(id)) pmids.push(id); row.tried.push('pubmed: ' + qq); }
      if (pmids.length) { const abs = await abstracts(pmids.slice(0, 12));
        const pick = await json(`Registry record: ${rec(t)}\nPubMed records:\n${Object.entries(abs).map(([id, a]) => JSON.stringify({ pmid: id, title: a.title, abstract: a.abstract.slice(0, 1800) })).join('\n')}\nDoes one report the results of THIS trial (same drug and comparator, disease, design, a matching size, or its number)? A review or another trial is NOT a match. JSON only: {"pmid": "<id or null>", "quote": "<exact words copied from that record that identify this trial>", "why": "<one sentence>"}`);
        if (pick.pmid && abs[pick.pmid]) { const src = abs[pick.pmid].title + ' ' + abs[pick.pmid].abstract; let p = quoteProblem(pick.quote || '', '', [src]);
          if (p) { const q2 = await requote(src); if (q2) { pick.quote = q2; p = null; } }
          if (!p) { Object.assign(row, { verdict: 'FOUND', via: 'pubmed (model queries)', url: 'https://pubmed.ncbi.nlm.nih.gov/' + pick.pmid + '/', quote: pick.quote, why: pick.why }); } else row.why = 'pubmed quote rejected: ' + p; } }
      // B. EU Clinical Trials Register in a headless browser
      if (row.verdict !== 'FOUND') {
        let eud = t.secondaryIds.find((x) => /^\d{4}-\d{6}-\d{2}$/.test(x));
        if (!eud) { const sr = await browse('https://www.clinicaltrialsregister.eu/ctr-search/search?query=' + nct); const m = sr.text.match(/EudraCT Number:\s*(\d{4}-\d{6}-\d{2})/); if (m) eud = m[1]; row.tried.push('euctr search ' + (sr.ok ? 'read' : 'unreadable')); }
        if (eud) { const u = 'https://www.clinicaltrialsregister.eu/ctr-search/trial/' + eud + '/results'; const r = await browse(u); row.tried.push('euctr ' + eud + (r.ok ? ' read' : ' unreadable'));
          if (r.ok && /Results information|Primary: |End points/i.test(r.text)) { const c = await confirm(t, r.text, u); if (c.ok) Object.assign(row, { verdict: 'FOUND', via: 'EU CTR (browser)', url: u, quote: c.quote, why: c.why }); } }
      }
      // C. sponsor results sites: synopsis / CSR links
      if (row.verdict !== 'FOUND') {
        const ws = await webSearch(`"${nct}" synopsis OR "clinical study report" OR "results summary"`); await sleep(2500); row.tried.push('web: synopsis/CSR');
        const hits = (ws.results || []).filter((x) => x.url && !MIRRORS.test(x.url)).slice(0, 3);
        for (const h of hits) { if (row.verdict === 'FOUND') break;
          const r = /\.pdf(\?|$)/i.test(h.url) ? { ok: true, links: [{ href: h.url }], text: '' } : await browse(h.url);
          const docs = [...new Set([h.url, ...(r.links || []).map((l) => l.href).filter((x) => /\.pdf(\?|$)|synops|csr|result/i.test(x))])].slice(0, 4);
          for (const d of docs) { const pg = /\.pdf(\?|$)/i.test(d) ? await readPage(d, { maxChars: 80000 }) : (d === h.url ? { ok: r.ok, text: r.text } : await browse(d));
            if (!pg.ok || !pg.text) continue; const c = await confirm(t, pg.text, d); if (c.ok) { Object.assign(row, { verdict: 'FOUND', via: 'sponsor / web document', url: d, quote: c.quote, why: c.why }); break; } }
        }
      }
    } catch (e) { row.verdict = 'ERROR'; row.why = e.message.slice(0, 160); if (/cap/i.test(e.message)) { rows.push(row); writeFileSync(file, JSON.stringify({ date: new Date().toISOString(), rows }, null, 2)); console.log('\nCAP REACHED'); break; } }
    rows.push(row); writeFileSync(file, JSON.stringify({ date: new Date().toISOString(), usd: client.counter?.usd, rows }, null, 2));
    process.stdout.write(row.verdict === 'FOUND' ? 'F' : row.verdict === 'ERROR' ? 'E' : 'n');
  }
  await browser.close(); console.log('\ndeep done', rows.length, 'usd this run', client.counter?.usd);
}

if (process.argv[2] === 'stage1') await stage1();
else if (process.argv[2] === 'deep') await deep();
else if (process.argv[2] === 'web') await web();
else if (process.argv[2] === 'match') await match();
else if (process.argv[2] === 'stage1b') await stage1b();
else if (process.argv[2] === 'stage2') await stage2();
else console.log('usage: stage1 | stage2');
