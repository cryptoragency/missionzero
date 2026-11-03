// EU Clinical Trials Register check for the leads still standing after stage E (headless browser, titles kept).
const fs = require('fs'); const path = require('path'); const { chromium } = require(process.env.MZ_PLAYWRIGHT || 'playwright');
const F = path.join('examples/repurposing-gbm', 'e-strict.json');
(async () => {
  const j = JSON.parse(fs.readFileSync(F, 'utf8'));
  const cand = j.leads.filter((x) => x.single && /animal|human/i.test(x.single.level || '') && (!x.trials || x.trials.length === 0) && x.brain?.crosses !== 'no');
  const b = await chromium.launch({ headless: true }); const p = await b.newPage();
  for (const x of cand) {
    const titles = []; let count = null;
    for (const q of [x.drug + ' glioblastoma', x.drug + ' glioma']) {
      await p.goto('https://www.clinicaltrialsregister.eu/ctr-search/search?query=' + encodeURIComponent(q), { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await p.waitForTimeout(3000); const t = await p.evaluate(() => document.body.innerText);
      const m = t.match(/(\d+)\s+result\(s\) found/i); const n = m ? Number(m[1]) : (/Query did not match any clinical trials|No results found/i.test(t) ? 0 : null);
      count = count === null ? n : (n === null ? count : Math.max(count, n));
      for (const mm of t.matchAll(/Full title:\s*([^\n]+)/g)) titles.push(mm[1].trim().slice(0, 200));
    }
    x.euctr = count; x.euctrTitles = [...new Set(titles)].slice(0, 6);
    x.survives = count === 0; x.why = count === 0 ? '' : 'EU register: ' + count + ' result(s)';
    console.log(x.drug, count, x.euctrTitles.map((t) => t.slice(0, 90)).join(' || '));
  }
  fs.writeFileSync(F, JSON.stringify(j, null, 2)); await b.close();
  console.log('candidates', cand.length, 'survive (0 in EU register)', cand.filter((x) => x.survives).length);
})();
