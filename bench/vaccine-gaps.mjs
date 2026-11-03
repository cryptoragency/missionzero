// Cancer vaccines: where are they tested? Free stage (ClinicalTrials.gov): for each cancer type, the number of interventional
// trials of a cancer vaccine, all-time and recruiting now. The second column (tumour mutational burden, quote-verified from
// published studies by Mission Zero) needs the Meta model: until access is restored it stays "API blocked".
// Usage: node bench/vaccine-gaps.mjs      Output: examples/vaccine-gaps/trials.json
import { writeFileSync } from 'node:fs';
const CANCERS = [
  ['Mélanome', 'Melanoma', 'melanoma'], ['Poumon (non à petites cellules)', 'Lung (non-small cell)', 'non-small cell lung cancer'],
  ['Vessie', 'Bladder', 'bladder cancer OR urothelial carcinoma'], ['Peau, carcinome épidermoïde', 'Skin, squamous cell carcinoma', 'cutaneous squamous cell carcinoma'],
  ['Merkel', 'Merkel cell', 'merkel cell carcinoma'], ['Côlon-rectum', 'Colorectal', 'colorectal cancer'], ['Estomac', 'Stomach', 'gastric cancer'],
  ['Œsophage', 'Oesophagus', 'esophageal cancer'], ['Tête et cou', 'Head and neck', 'head and neck squamous cell carcinoma'],
  ['Endomètre', 'Endometrium', 'endometrial cancer'], ['Col de l’utérus', 'Cervix', 'cervical cancer'], ['Foie', 'Liver', 'hepatocellular carcinoma'],
  ['Rein', 'Kidney', 'renal cell carcinoma'], ['Sein', 'Breast', 'breast cancer'], ['Prostate', 'Prostate', 'prostate cancer'],
  ['Ovaire', 'Ovary', 'ovarian cancer'], ['Pancréas', 'Pancreas', 'pancreatic cancer'], ['Glioblastome', 'Glioblastoma', 'glioblastoma'],
  ['Leucémie aiguë myéloïde', 'Acute myeloid leukaemia', 'acute myeloid leukemia'], ['Thyroïde', 'Thyroid', 'thyroid cancer'],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const count = async (cond, extra = '') => { const u = 'https://clinicaltrials.gov/api/v2/studies?countTotal=true&pageSize=1&fields=NCTId&query.cond=' + encodeURIComponent(cond) + '&query.intr=vaccine&filter.advanced=' + encodeURIComponent('AREA[StudyType]INTERVENTIONAL' + extra); const r = await fetch(u); if (!r.ok) throw new Error(r.status); return (await r.json()).totalCount; };
const rows = [];
for (const [fr, en, q] of CANCERS) {
  const all = await count(q), rec = await count(q, ' AND (AREA[OverallStatus]RECRUITING OR AREA[OverallStatus]NOT_YET_RECRUITING)'), p3 = await count(q, ' AND AREA[Phase]PHASE3');
  rows.push({ fr, en, query: q, vaccineTrials: all, recruitingNow: rec, phase3: p3, mutationBurden: 'API blocked' }); console.log(fr.padEnd(32), all, rec, p3); await sleep(300);
}
writeFileSync('examples/vaccine-gaps/trials.json', JSON.stringify({ date: new Date().toISOString(), source: 'ClinicalTrials.gov API v2, query.intr=vaccine, interventional', rows }, null, 2));
