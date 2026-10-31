<p align="center"><img src="assets/logo.png" alt="CRYPTOR.AGENCY" width="160"></p>

# Mission Zero

**Give it a goal. Let it discover the path. Demand proof.**

Mission Zero is an autonomous research agent that refuses to take its own word for it. You give it an objective. It has no plan and no answer. It forms hypotheses, searches, reads whole primary documents (117-page PDFs included), evaluates itself after every move, pivots when it fails, and writes an answer **only from what it actually read**. Then a verifier re-reads every cited page and demands an exact quote, a contradictor attacks the answer, a judge scores each version, and only the best one survives.

It also has a repair mode: give it a scanner's findings on a website and it returns, for each flaw, a patch tested on a copy of the site, never applied by the agent.

Every step is written to an evidence folder you can open: journal, memory, final answer, verdicts, quotes.

Startup track · CRYPTOR.AGENCY · Meta Global AI Developer Hackathon 2026 · built on the Meta Model API (`muse-spark-1.3`)

**Problem statement: Build for Your World.** Our world is the websites of small businesses: the agency scans and repairs them every day, and most stay exposed because nobody proposes a fix with proof that it breaks nothing. Mission Zero does, and the same loop answers a researcher's question from the primary documents.

**Live demo** (replays of the committed runs, no model called): https://cryptoragency.github.io/missionzero/ (online when the repository is public, 4 November 2026). Mission Zero reads and cites research for researchers; it never gives medical advice.

## Meta tools in ten seconds

- **Muse Spark 1.3** runs every role, with `reasoning_effort` set per role: the effort sweep below shows the same goal at 10/10 for $0.028 (minimal) and 5/10 at the highest efforts.
- **Muse Spark vision** rejected a fix that HTTP tests had accepted: the payment form had lost its fields (F05, 28 October).
- **SAM 3.1** counted the text fields of that page before and after: 5, then 2.
- **muse-voice-transcribe** turned an 11-second spoken goal into a mission in 3.0 s.
- **Muse Spark open weights on Baseten**: the same DBIR mission, same code, 10/10 for $0.073.

## What is judged

- **Research.** A goal answered only from primary documents the agent read, with an exact quote for every figure. 5 demo goals at 10/10, from $0.037 to $0.085 each (table below).
- **Repair.** A patch per flaw, tested on a copy of the site. 15 findings on the demo shop: 10 proposed, 5 proposed with reservation. 7 findings on a real site read by another scanner: 5 proposed, 2 unverified by design, $0.22. (Proposed with reservation = checks green, the agent wrote a caveat; unverified = no probe can confirm it.)
- **Back to zero.** The agent returns to zero by itself when its memory hurts. Shown with three natural resets in `examples/film-2026-10-29`: rule A on `apex-solaire-premier-essai`, rule C on `galaxie` and `laniakea`, each with its `zero.json`.
- **Meta tools.** Muse Spark text (`src/meta.js`) and vision (`src/vision.js`), SAM 3.1 (Meta's Segment Anything, `src/sam.js`), `muse-voice-transcribe` (`src/voice.js`), and the open weights on Baseten (`src/meta.js`, `examples/open-weights`).
- **Watch.** Watch mode reads public series (influenza, trial registries, instrument exports) and reports only what moved, with a cited explanation.

Repository: `github.com/cryptoragency/missionzero` (public from 4 November 2026).

## What is new in this repository

Everything here was written during the hackathon, from 26 October 2026. The git history is dated and will be public on 4 November. No code or prompt comes from the agency's existing products; two data files (`examples/argus-aggregate.json`, `examples/real-site/findings.json`) are outputs of ARGUS, used as input only.

Transparency: before building officially started (kickoff on 26 October 2026, building from 12:24 PM ET, i.e. 17:24 Paris time), a 50-line skeleton existed (the Meta API client with its spending cap, package.json, a key check), with a note on the official rules and an MIT license file. As the organizers asked, those early commits are kept out of this repository: its history starts after the kickoff, and only 13 trivial lines of that skeleton remain (braces, "type": "module", an empty MODEL_API_KEY= line). Everything else, every feature shown in the demo, was built during the event.

## How to read the scores

The judge scores 0 to 10. One red claim (a quote the cited page does not support) caps the score at 5, whatever the judge thought. A low score means "not proven", not "wrong". Green = the exact quote was found on the cited page. Red = quote not found, page unreachable, or the page contradicts the claim.

## The loop

```
goal ──► plan (hypotheses + ONE free action) ──► action ──► observation ──► evaluation (0 to 10, lesson, pivot)
             ▲                                                                      │
             └────────────────── next turn, with the lesson ◄───────────────────────┘
                                                                                    │ after the last turn
                                   draft answer (only URLs that were seen) ◄────────┘
                                                 │
                        verifier: re-reads each cited page, exact quote required
                                                 │  green = the page says it · red caps the score at 5
           red claim ──► the cited page is read AGAIN with the claim as target
                                                 │
                      contradictor ──► targeted research ──► rewrite ──► verifier ──► judge
                                                 │  up to 5 rounds, stops on stagnation
                                       best version kept ──► evidence folder
```

- **Actions** are free and harmless: `web_search` (DuckDuckGo HTML), `read_page` (HTML or PDF, with a `find` hint that selects the passages that matter), `create_page` (a file in the evidence folder). Anything paid or with a real-world effect is refused and logged.
- **Everything comes from freely accessible data.** A paid source (a journal behind a paywall, a dataset) is refused and logged; paying on a budget the customer sets is the next step, not in this version. It never spends on its own.
- **Reading a 250,000-character report** is cheap: the page is read once per run, cached, and reduced to its opening plus the passages relevant to what the planner asked for. Numbers written in words ("eight characters") count as numbers.
- **A claim is green only with a quote** that really appears in the cited page. "Supported" without a quote is not trusted.
- **A red claim is not left to the rewrite alone.** The cited page is read again with the claim itself as the target. The rewrite then sees the passages that carry the figure. It restates the claim in the page's words, cites another page it saw, or drops it. A red claim is an objection by itself, even when the contradictor finds no flaw.
- **Memory that only learns from proof**: each mission ends with generic lessons (never about a company or a person), 30 at most, reused by the next mission. Winning objections of the contradictor become lessons too. What the agent says it learned is a claim, not a fact: a lesson reaches the planner only if the mission it came from is proven (judge 7/10 or more, at least one source verified by an exact quote, none contradicted). Otherwise it waits in quarantine, with the reason. Failures still teach, on trial: the next mission tries ONE quarantined lesson; if that mission is proven and its note is higher than the note the lesson came from, the lesson is approved, and after two failed trials it leaves the memory (`MZ_TRIAL=off` disables it). A lesson also leaves quarantine when a proven mission teaches it again, or when a human approves it (`node src/lessons.js`, `approve <n>`, `reject <n>`; a rejected lesson is kept in `memory/rejected.json`).
- **Hard budget caps**: per run (`MZ_CAP_USD`) and per day (`MZ_DAILY_CAP_USD`). The run stops when either is reached.

## Results on the demo goals (27 October 2026, up to 4 turns, up to 3 contradiction rounds)

| # | Goal | Judge | Green proofs | Cost |
|---|------|-------|--------------|------|
| 1 | Verizon DBIR 2025: breaches analyzed, human element (117-page PDF) | **10 / 10** | 2 | $0.059 |
| 2 | GDPR maximum fine, article (official text via the EU Publications Office) | **10 / 10** | 3 | $0.061 |
| 3 | NIST SP 800-63B-4 password lengths: 15 single-factor, eight multi-factor, 64 allowed | **10 / 10** | 3 | $0.085 |
| 4 | Latest CVSS version, year, Critical range (first.org) | **10 / 10** | 2 | $0.037 |
| 5 | ANSSI *Guide d'hygiène informatique*: 42 measures, "Version 2.0 - Septembre 2017" from the PDF footer | **10 / 10** | 4 | $0.047 |

Every figure is green: confirmed by an exact quote from the primary page. Scores vary between runs because web search does. In one run of goal 1 the search returned the public-sector snapshot instead of the full report, and the judge gave 5/10 for citing the wrong document (that run is not versioned). Reproduce with `npm run demo`; each run writes its own evidence folder.

## Real missions of 29 October

Real missions played on 29 October are versioned in `examples/film-2026-10-29/` (journal, memory, final answer, verdicts). The first asked about tuberculosis (WHO Global TB Report 2024: 10.8 million fell ill, 1.25 million died, 88% treatment success for drug-susceptible TB). It scored 10/10 with 5 quotes verified, for $0.10 in 2 minutes. Medicine here means reading for researchers: a research question on a public WHO report, with the quote for every figure. It is not advice to patients or clinicians; the researcher reads the quotes and decides. The others asked "Is the solar system heading somewhere?" as four targeted missions: solar apex toward Hercules, 230 km/s around the Galactic center, 369 km/s against the CMB, 631 km/s of the Local Group in Tully et al. 2014. The judge gave 3 to 5/10 because the sources it could read were not always the paper itself.

The sum of the seven missions is $1.49 for the day. A first attempt that asked all four space questions in one mission scored 3/10: one precise question per mission is what works. Three of these missions ended in a natural return to zero, described below.

## What makes it cheap

Muse Spark reasons before answering and the reasoning is billed as output. Mission Zero sets `reasoning_effort` per role (minimal for the verifier, low for judge and contradictor, medium for planning and writing). The effort sweep in `examples/effort-sweep` shows the effect. A mission costs about **$0.04** for a simple goal and up to **$0.30** for the hardest space questions of 29 October (`examples/film-2026-10-29`).

Measured by others too: at the Fireworks workshop of this hackathon (30 October 2026, Sinan Ozdemir, [notebooks](https://github.com/sinanuozdemir/ai-experiments/tree/main/experiments/meta-hackathon-muse)), Muse Spark Open on 400 short-answer items scored 88.5 at `low` and 81.8 at `high`. At `max`, 19 answers of 400 came back empty because the reasoning used up the output limit. Mission Zero measures it on its own missions: `npm run effort-sweep` plays one goal at every effort level, then with the per-role setting, with the same memory for every run (`bench/run-effort-sweep.js`).

Measured on Mission Zero (30 October 2026, the Verizon DBIR goal, 3 turns at most, 1 contradiction round, same memory for every run, Meta API, versioned in `examples/effort-sweep/` with each run's summary, answer and journal):

| effort | judge | green | red | turns | calls | output tokens | reasoning tokens | truncated | cost | seconds |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| minimal | 10 | 2 | 0 | 2 | 12 | 3857 | 2904 | 0 | $0.028 | 37 |
| low | 10 | 2 | 0 | 2 | 10 | 6272 | 5584 | 0 | $0.036 | 39 |
| medium | 10 | 2 | 0 | 2 | 10 | 9950 | 9156 | 1 | $0.052 | 59 |
| high | 5 | 2 | 1 | 2 | 11 | 12576 | 11796 | 2 | $0.064 | 74 |
| xhigh | 5 | 1 | 1 | 2 | 10 | 10982 | 10315 | 3 | $0.056 | 51 |
| max | 5 | 1 | 1 | 3 | 13 | 19373 | 18240 | 5 | $0.096 | 155 |
| per-role | 10 | 2 | 0 | 2 | 13 | 10533 | 9376 | 0 | $0.057 | 75 |

The table is generated from `examples/effort-sweep/sweep.json`; seconds are wall-clock. The evidence folder of the "low" run was overwritten by the "medium" run (both started in the same minute, when folders were named to the minute; fixed on 30 October, folders are now named to the second), so `low/summary.json` shows the medium figures. The low row comes from `sweep.json` only.

Reading it: `minimal`, `low` and `medium` all reach 10/10 with both figures quoted from the report. From `high` up the judge falls to 5/10 and a cited source is contradicted. From `high` up, 2 to 5 answers per run are cut by the output cap because the reasoning ate it (the same truncation the workshop saw at `max`). Cost generally grows with the effort, and `max` took 155 seconds for a 5/10 answer. On this goal `minimal` alone would have been enough, at half the cost of the per-role setting. The per-role setting keeps `medium` for planning and writing because harder goals (the NIST revisions, the ANSSI PDF) needed it on 27 October. The point is measured, not assumed: on this goal, more thinking did not mean more truth.

## Words used below

- **Finding**: one problem reported by a scanner, on a given URL, with its evidence.
- **Flaw**: the weakness in the site that a finding points at.
- **Fix**: the change Mission Zero proposes for a finding.
- **Patch**: the fix written as a file that a human reviews and applies. The agent never applies it to the live site.

Statuses of a fix:

- **proposed**: every check is green. It may carry a "partial" self-review (the cause is removed for the reported case, a related case stays open): shown in the report, not a reservation.
- **proposed with reservation**: every mechanical check is green, but the agent wrote a reservation (a weakly supported recommendation, or a patch that hides the symptom).
- **unverified**: no probe can confirm it. It is never proposed.
- **rejected**: a vital journey breaks, or the page is broken. The fix is refused.
- **ineffective**: the rescan still finds the flaw. The fix is refused.

Words in the "Checks" and "What it did" columns:

- **hides**: the agent's review of its own patch says it hides the symptom instead of removing the cause.
- **no edit**: the model proposed no edit, or every edit it proposed was refused. Nothing is tested.
- **refused by itself**: an attempt that Mission Zero's own checks rejected (rejected, ineffective, no edit or hides), retried with the reason fed back.

## Repair mode: from a scanner's finding to a proven fix, never applied by the agent

The same loop, pointed at code. A scanner (any scanner: the input is a generic JSON file, or a URL) reports the flaws of a website. The finding is the unit, not the website: a CVE from a dependency scanner, a server misconfiguration from an infrastructure scanner carry the same six fields and go through the same controls. The rescan is Mission Zero's own probe when one exists for the type; otherwise the fix stays unverified and the originating scanner rescans. For each finding, Mission Zero:

1. **researches the fix** from primary sources (OWASP, MDN, NIST, PCI DSS, IETF) with the verifier and the judge, and caches the recommendation by flaw type (the second site with the same flaw pays no research again: about a third of the cost, see the real-site runs below);
2. **proposes exact edits** to the code (find/replace, each `find` must occur exactly once or the edit is refused);
3. **applies them to a copy** of the site, never to the site itself;
4. **replays the vital journeys** on the copy (browse, search, add to cart, check out, log in, follow my own order, legal page). One broken journey means the fix is **rejected**. A policy that would block the page's own inline scripts is a broken page too (a control added after the first real site, below);
5. **rescans the copy** with the probe that matches the finding by id or by type (so a finding from another scanner is rescanned here): the flaw must be gone, or the fix is **ineffective**. With no probe for its type, or a probe that does not reproduce the flaw on the untouched copy, the fix is **unverified**, never proposed;
6. **reviews its own patch** against the recommendation it researched: cause removed, or symptom hidden? A hiding patch is refused by the agent and retried with that reason; if no better patch comes, the fix is **proposed with reservation**, the reservation written. A recommendation the judge scored under 7 is a reservation too, never a silent "proposed";
7. writes the fix as a **patch** for a human to review and apply, plus a readable report.

**Locked zones.** A fixed rule in the code, not the model, marks some fixes as a human decision whatever their status: payment, authentication, session, access rights, secrets, personal data, deletion. It fires on the type of the finding (`LOCKED_TYPES`) or on the code the patch touches (`LOCKED_CODE`), and is written on the record (`locked`), in the hashed journal and in the report table. Neither the agent's review nor the judge's note can lift it (`src/repair.js`, `lockedZone`).

The target in this repository is Maison Verde (`demo-site/`), a fictional shop built with the 15 flaws scanners find on most e-commerce sites (`demo-site/FLAWS.md`). It runs locally only.

**The scanner probes only a host you control.** A local address (localhost) is treated as yours. Any other host must serve a token of your choice (`MZ_OWNER_TOKEN`, 16 characters or more) at `/.well-known/mission-zero.txt`, the same kind of proof a certificate authority asks (ACME HTTP-01). Otherwise `scan()` refuses before a single probe runs (`src/scanner.js`, `src/scanner.test.js`). The check works on the origin only (no path, no query), requires https for any non-local host, resolves the name once and refuses a host that points to a private or local address; the token file is read up to 200 bytes. The CLI itself only scans the local copy; `scan()` is a library function.

Mission Zero is a repair tool, not a reconnaissance one. The scanner is published for defensive security research and for the repair of sites you own or are authorized to test. The token proves control of the host, not the right to test it; that right comes from the site's owner. The ownership check is a safeguard against mistakes, not a wall against a determined attacker. Some probes are active: one POST to the cart, two login attempts, a request for /.env, a 40-request burst.

The repair mode runs the site's own `server.js`, patched by the model, on your machine: run it in a container or a VM. The repaired `server.js` is imported by the journeys test in the same process: a malicious edit could try to neutralize the test runner. Edits that mention `node:assert`, `node:test` or `process.exit` are refused; the rescan and the self-review are the second line.

```bash
npm run repair -- demo-site/findings.example.json          # the 15 findings, one proposed fix each
npm run repair -- --scan                                   # scan the demo shop first, then repair
npm run repair -- --from=https://scanner.example/findings  # any scanner's URL (MZ_SCANNER_URL / MZ_SCANNER_KEY in .env)
npm run repair-report -- evidence/repair-<date>            # one readable page per run
npm run verify-chain -- evidence/repair-<date>             # recompute the hashed evidence journal
npm run repair-replay -- evidence/repair-<date> F14        # animated replay of one repair, control by control (one HTML file)
```

### Legal notice: test only what you are authorized to test

Running these probes against a system without its owner's authorization is an offense in most countries. In France, see articles 323-1 to 323-3-1 of the Code pénal; in the United States, the Computer Fraud and Abuse Act; in the United Kingdom, the Computer Misuse Act. Serving the token proves that you control the host. It does not replace the written authorization of the site's owner when you are not that owner (a host, an agency or a freelancer working for a client). Removing the check does not make a scan lawful. Probes also reach whatever sits in front of the host (CDN, firewall, shared hosting); check their terms, and use `burst: false` on production. The software comes with no warranty (LICENSE, "No Liability"). You are responsible for the scans you run.

### Results on Maison Verde (28 October 2026, merged from two runs: 15 findings, then 7 re-run; 2 research turns, 1 contradiction round, 1 retry, vision on, self-review on)

Every status below was decided by the system, not edited by hand: the table is generated from the evidence folders (`node bench/make-results-table.js <run> [<run>]`). "Proposed with reservation" means every mechanical check is green but the agent wrote a reservation: a cited recommendation the judge scored under 7, or a patch the agent itself judges to hide the symptom.

The "Source score (judge)" column rates the recommendation the fix cites, not the mission.

| # | Flaw | Status | What the agent did (its own words) | Source score (judge) | Checks |
|---|------|--------|------------------------------------|-------|--------|
| F05 | card data over HTTP | **proposed with reservation** | Descope shop to SAQ-A: remove card form, ignore PAN and never store/echo it. Reservation: weak justification: the judge scored the cited recommendation 3/10 (3 verified sources); read the sources before applying | 3/10, 3 green | journeys 7/7, rescan clean, look ok, fields 5→0, self-review: cause |
| F09 | admin trusts a guessable cookie | **proposed with reservation** | Replace static admin cookie with random server-managed session checked by equality, denying by default. Reservation: weak justification: the judge scored the cited recommendation 3/10 (1 verified source); read the sources before applying | 3/10, 1 green | journeys 7/7, rescan clean, look ok, fields 2→2, self-review: cause |
| F11 | .env served with secrets | proposed | Blocked /.env to return 404 instead of secrets. | 7/10, 3 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F13 | customer export without auth | proposed | Require valid admin session before serving customers.csv, redirecting unauthenticated requests to login. | 10/10, 2 green | journeys 7/7, rescan clean, self-review: cause |
| F03 | reflected XSS | proposed | Escape search query with esc() before echoing into HTML to prevent reflected XSS. | 10/10, 1 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F04 | price trusted from the client | proposed | Ignore client-supplied price and re-derive cart line price from server-side PRODUCTS catalogue by id. | 10/10, 2 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F06 | IDOR on /order | proposed | Enforce ownership check on /order: only the customer cookie matching the order email (or admin) can view it, otherwise 403. | 10/10, 2 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F07 | weak authentication | proposed | Return generic login error and enforce 5-failures-per-minute lockout with failure logging. | 8/10, 3 green | journeys 7/7, rescan clean, look ok, fields 2→2, self-review: cause |
| F12 | backups listed | **proposed with reservation** | Blocked all /backup/ routes with 404 to remove listing and backup file disclosure. Reservation: weak justification: the judge scored the cited recommendation 3/10 (1 verified source); read the sources before applying | 3/10, 1 green, 1 red | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F01 | no security headers | proposed | Wrap handle to add HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and CSP frame-ancestors headers to every response. | 9/10, 5 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F08 | insecure session cookie | proposed | Add HttpOnly, Secure and SameSite=Strict to the session cookie. | 8/10, 3 green | journeys 7/7, rescan clean, look ok, fields 2→2, self-review: cause |
| F14 | jQuery 1.8.3 | **proposed with reservation** | 1 attempt refused by itself (rejected), then: Remove the vulnerable jQuery 1.8.3 endpoint by redirecting it to the catalogue. Reservation: the agent judges its own patch hides the symptom instead of removing the cause: Patch redirects /js/jquery-1.8.3.min.js to '/' instead of updating to a non-vulnerable jQuery version | 8/10, 2 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: hides |
| F15 | no privacy policy | proposed | Add privacy notice at checkout and privacy policy on legal notice explaining purpose and use of collected data. | 7/10, 2 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: partial |
| F02 | versions disclosed | **proposed with reservation** | 1 attempt refused by itself (ineffective), then: Remove Server and X-Powered-By version disclosure headers from HTML responses. Reservation: weak justification: the judge scored the cited recommendation 4/10 (1 verified source); read the sources before applying | 4/10, 1 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F10 | robots.txt lists sensitive paths | proposed | 1 attempt refused by itself (rejected), then: Serve the normal catalogue page at /robots.txt so no sensitive Disallow entries are disclosed. | 9/10, 3 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |

5 with reservation, 10 proposed · 15 findings · 237 model calls · $1.49 (about 10 cents per finding, vision and self-review included). The 237 calls and $1.49 are the sum of the two runs.

Reading the "Checks" column. "journeys 7/7": the customer's tests pass when replayed on the repaired copy. "rescan clean": the scanner no longer fires on the copy. "look ok": Muse Spark judged that the repaired pages still work for a customer. "fields a→b": SAM 3.1's count of text fields on the finding's page before and after. "self-review: cause / hides / partial": the agent's verdict on its own patch. "green": a cited source whose exact quote the verifier found on the page. "red": quote not found or source contradicts.

The two runs behind this table, with every patch and their hashed journals (32 and 16 records, intact), are in `examples/repair-maison-verde/`, with the merged report page `report.html`. Earlier in the day, before the self-review existed and while a token cap could cut the judge's answer, the same 15 findings had come out "15 proposed". That run is not the one shown. A 0/10 from a cut answer is not a judgment.

### A real site, read by another scanner (28 October 2026)

The second target is real: 6stem.com, CRYPTOR.AGENCY's own showcase site, a static page served by nginx. Its files are the agency's and stay out of this repository; what is here is the run's evidence (`examples/real-site/`: findings, patches, report, replays, hashed journal). The copy Mission Zero works on is the site's folder plus a 40-line `server.js` that reproduces the hosting's headers. It stands for the nginx configuration: a patch on it is a change of that configuration, which a human applies. The copy also has 5 vital journeys (home page, scripts load, legal notice present, unknown paths show the site, a visitor is never blocked).

The findings did not come from Mission Zero's scanner. ARGUS, the surface scanner of MYTHOZOR, the agency's security platform, read the live site. It runs 35 passive checks on the public home page and its headers, and it predates the hackathon. Its result went through the generic URL input (`--from=URL`, a bearer key in `.env`): score 81/100, grade A, 7 findings. Mission Zero knows nothing about ARGUS: it reads `{ id, severity, type, url, evidence, description }`.

| Finding (ARGUS) | Mission Zero's answer | What it did | Checks |
|---|---|---|---|
| A-csp-strength · CSP without script-src (medium) | **proposed**, 1 attempt refused by itself | first attempt `script-src 'self'`: **rejected, the fix breaks the page** (the policy forbids inline scripts and the page runs 6 of them); second attempt: a per-response nonce with `strict-dynamic`, injected into every script tag | journeys 5/5, rescan clean (F17), look ok, self-review: cause |
| A-csp-connect · CSP without connect-src (medium) | **proposed** | `connect-src 'self'` added to the policy | journeys 5/5, rescan clean (F22), look ok, self-review: cause |
| A-corp · no Cross-Origin-Resource-Policy (low) | **proposed** | header `same-origin` on every response | journeys 5/5, rescan clean (F18), look ok, self-review: cause |
| A-coep · no Cross-Origin-Embedder-Policy (low) | **proposed** | header `credentialless` (the recommendation's choice, so that embedded resources keep working) | journeys 5/5, rescan clean (F19), look ok, self-review: cause |
| A-auto-throttle · no rate limiting (low) | **proposed**, 1 attempt ineffective | per-IP sliding window, 30 requests a minute, 429 with Retry-After and rate-limit headers; the first attempt left the burst probe unanswered | journeys 5/5 (12 pages in a row still pass), rescan clean (F21), look ok, self-review: cause |
| A-comments · sensitive HTML comments (medium, heuristic) | **unverified** | strips HTML comments from served pages; Mission Zero has no probe for this type, so it refuses to call the fix proven: "the scanner that found it must rescan once the patch is applied" | journeys 5/5, no rescan, look ok, self-review: cause |
| A-hsts-sub · HSTS without includeSubDomains (low) | **unverified** | adds `includeSubDomains`; Mission Zero's own HSTS probe accepts a one-year max-age and did not see the finding on the untouched copy: the scanners disagree, so the rescan cannot confirm anything | journeys 5/5, no rescan, look ok, self-review: cause |

5 proposed, 2 unverified · 7 findings · 23 model calls · $0.216 · the look (Muse Spark vision) accepted every repaired page, SAM 3.1 counted 0 text fields before and after (a showcase page has none: evidence, not a gate). The hosting omits `includeSubDomains` on purpose (customers' other subdomains); the unverified status reflects that disagreement. The seven findings are hardening headers and heuristics, not exploitable vulnerabilities; the "sensitive" HTML comments turned out to be section labels of the page.

What this run taught us, in the order it happened (the three runs are the same evening; the first two are not versioned, their lessons are):

1. **First run, $0.634, 114 calls.** Vision did not run (the Playwright path was missing from `.env`, recorded as an error in each record, never as a verdict) and one of our new probes had lost a backslash: fixed, two commits.
2. **Second run, $0.185.** `script-src 'self'` came out "proposed": 5 journeys green, probe silent, screenshot fine, self-review "cause". The page runs 6 inline scripts; that policy would have blocked them all. Neither the HTTP journeys nor the look can see a blocked script. We added the control: a policy that forbids the page's own inline scripts is a broken page, **rejected** (`inlineScriptsBlocked` in `src/repair.js`, tested).
3. **Third run, $0.216.** The same fix was rejected by that control at the first attempt, the reason fed back, and the second attempt proposed the nonce-based policy. The research was paid once: the knowledge of each flaw type was cached by the first run, which is why the third run cost a third of the first.

```bash
npm run repair -- --site=../my-site --files=server.js,index.html --login=none   # another site: its folder (server.js + journeys.test.js) and the files the model may edit
npm run repair-replay -- examples/real-site A-csp-strength                     # the refused-then-proposed CSP, control by control
```

## Meta tools, each where it earns its place

| Tool | Where | Why there and not elsewhere |
|---|---|---|
| `muse-spark-1.3` (text, reasoning) | every role: planner, evaluator, writer, verifier, contradictor, judge, repairer | one model, one effort level per role (`reasoning_effort`): the cost finding of this project |
| `muse-voice-transcribe-1.0` (speech to text) | `npm run voice -- recording.wav --run`: a goal spoken into a microphone becomes the mission's goal (`src/voice.js`) | the first thing a founder does with an agent is talk to it; the WAV is resampled to mono 16 kHz with ffmpeg when needed, the wake name and stutters are dropped (the committed sample is a synthetic Windows voice, not a person) |
| `muse-spark-1.3` (vision) | `--vision` in repair mode: after a fix passes the journeys and the rescan, the repaired pages are screenshotted headless and shown to the model as a customer sees them (`src/vision.js`) | an HTTP assertion is blind: a blank page or a vanished product grid returns 200. The model answers "ok / problems / seen" and a "not ok" rejects the fix |
| `sam-3.1` (segmentation) | same `--vision` step: SAM boxes the text fields of the finding's page before and after (`src/sam.js`) | visual evidence a reviewer understands in one glance: the card form had 5 fields, the fixed page has 2. Concepts must be visual ("form", "text input field", "button"): "credit card form" finds nothing |
| Muse Spark open weights (Baseten) | `MZ_BASE_URL` + `BASETEN_API_KEY` switch the whole system to `meta-models/muse-spark-open` on Baseten, to `accounts/fireworks/models/muse-spark-open` on Fireworks (`FIREWORKS_API_KEY`), or any OpenAI-compatible endpoint (`src/meta.js`). The Participant Guide names `meta-models/muse-spark-open-1026`; our Baseten account did not list it on 28 October (`examples/open-weights/provider.json`) and our key refused it on 30 October; the run used `meta-models/muse-spark-open`, and `MZ_MODEL` switches when the other is served. | the trust promise "the model stays with you" needs open weights you host yourself; Baseten and Fireworks run them in their cloud; same requests, same prompts; measured below |

First real measurements (28 October): voice, an 11-second goal transcribed in 3.0 s; vision, two pages read correctly for $0.005; SAM, "text input field" 5 boxes on the checkout page (recorded in `examples/repair-maison-verde/stories/repair-2026-10-28-09-31/F05/repair.json`; the raw SAM output kept in `examples/meta-tools/` is the "credit card form" try, 0 boxes). Official prices read on dev.meta.ai (pricing and rate limits) on 28 October 2026 for Muse Spark and on 30 October for voice and SAM: Muse Spark 1.3 $1.25 per million input tokens, $0.15 cached, $4.25 output; voice $0.18 per hour of audio; SAM $2.50 per 1,000 images.

What vision caught that HTTP tests did not (28 October, 09:31 run, `--vision` on F05). It is versioned in `examples/repair-maison-verde/stories/repair-2026-10-28-09-31/F05/` with its replay and screenshots. The model's fix removed the card inputs and left their labels. The 7 journeys were green, the scanner was silent, and Muse Spark looking at the page said "payment page form is incomplete: 'Numero de carte', 'Expiration', 'Cryptogramme' appear as text with no visible input fields". SAM counted 5 text fields before, 2 after. The fix was **rejected**. On F03, the same look confirmed the escaped `<script>` shown as plain text with no popup. The two looks cost $0.01. In the 11:18 run the same F05 fix removed the whole card form and announced an external payment provider. The look accepted it (SAM 5 → 0), and the fix is "proposed with reservation" for its thin justification. Raw outputs of the three Meta tools are in `examples/meta-tools/`.

Open weights, measured (28 October, versioned in `examples/open-weights/` with its replay and `provider.json`): the same DBIR mission on `meta-models/muse-spark-open` served by Baseten (`MZ_BASE_URL=https://inference.baseten.co/v1`, `BASETEN_API_KEY`): judge 10/10, 2 verified sources, 12,195 breaches and the 60% quoted from the report, 2 turns, 20 model calls, $0.073 (2 contradiction rounds on Baseten against 0 on the Meta run), 62 seconds in all. Same code, same prompts, same `reasoning_effort` per role; only the base URL changed.

On the Meta API the same goal cost $0.059 in 4 turns (`examples/dbir-2025`). Baseten's prices are the same as Meta's ($1.25 in, $4.25 out per million tokens) with cached input at $0.15. About the model name, see the table above.

## Mission Zero returns to zero by itself

An agent that learns can learn wrong. Mission Zero keeps a ledger of its missions (`memory/outcomes.json`, local and not versioned: judge score, verified sources, lessons used) and, after every mission, decides whether its own memory is hurting it. Three rules, all explainable in one sentence:

- **A.** two bad missions in a row (judge under 7) while lessons were applied;
- **B.** the same goal scored at least 2 points higher before, with fewer lessons: the memory made it worse;
- **C.** drift: the last three missions average 2 points under the three before.

When a rule fires, the agent **archives its lessons itself** (`memory/archive/lessons-<date>.json`, never deleted), writes the rule and the reason in `memory/resets.json` and in the journal, **runs the mission again knowing nothing** (`evidence/<run>/from-zero/`), compares both answers (judge score, then verified sources, then contradicted ones), keeps the better one, and relearns from that one only. `zero.json` holds the comparison. The archived lessons and the reset record of the versioned run are in `examples/back-to-zero/memory/`. No human presses the button; `MZ_ZERO=off` disables it, `--from-zero` forces it for an experiment (marked "forced", never presented as a natural reset).

First real run (28 October, forced for the experiment, DBIR 2025 goal, 3 turns, 1 round): the agent archived its 30 lessons and ran again knowing nothing. Both answers were identical, 10/10, the 60% human element quoted from the report. With memory: $0.031. From zero: $0.054, 74% more. Both took 2 turns, so the difference is in what was read and written. The first turn scored 4/10 with memory and 8/10 from zero, so the lessons did not even help the first move here. Verdict written by the agent: "same result either way: the memory did no harm", memory restored. The run and its replay are in `examples/back-to-zero/`. Three natural resets then fired on 29 October, in the real missions above (`examples/film-2026-10-29/`, each with its `zero.json`).

- **Rule A, `apex-solaire-premier-essai`.** Two bad missions in a row with lessons applied (3/10 then 4/10). The 30 lessons were archived and the mission ran again from zero. Both versions scored 4/10 with 4 green sources, but the version from zero had 1 contradicted source against 0 with memory. Version kept: with memory.
- **Rule C, `galaxie`.** The note drifted (3.3 on the last 3 missions against 10.0 on the 3 before). The 3 lessons were archived. With memory 3/10, from zero 5/10. Version kept: from zero.
- **Rule C, `laniakea`.** The note drifted again (4.0 against 7.7). The 3 lessons were archived. Both versions scored 5/10, with 4 verified sources from zero against 3 with memory. Version kept: from zero.

Rule C fired because the goals changed (space questions after the demo goals), not because memory was shown to hurt; from zero won by 2 points on `galaxie` and by 1 verified source on `laniakea`.

## Watch mode: it reads the readings every period and reports only what moved

A researcher does not have time to re-read a hundred publications, a weekly bulletin or a probe's log every day. Watch mode does it. `npm run watch -- "<source>"` reads one source's readings for the period (a public health series, a trial registry, an instrument's export in the generic format of `watch/readings.example.json`), compares them with the previous period, and reports only the variations: a value that moved more than the threshold (20% by default), a threshold crossed, a status that changed, a key that appeared or vanished. Each report (`watch/<source>/report-<period>.md`) carries the page to cite and is chained in the hashed journal. Mission Zero never acts on the source: it reads, compares, cites; a human decides.

With `--explain`, the biggest variation becomes a Mission Zero goal: the loop reads the primary sources (the bulletin, the agency's reports), answers with the exact quote for every figure, and says what is not proven. `--replay=N` plays the last N periods of a public series one after another, as if the watch had run each week: the history is public, every figure comes from a committed evidence folder, and every replayed report says so. `--until=<period>` cuts the series at a period.

Sources shipped in `watch/sources.json`: Réseau Sentinelles (France, influenza-like illness incidence per 100,000, weekly since 1984, country and regions), ClinicalTrials.gov (every registered tuberculosis vaccine study and its status, daily), WHO FluNet (influenza-positive specimens reported each ISO week by about 190 countries: world total and the six WHO regions; adapter only, the data is fetched by each user under WHO's terms, see Data sources), and an example probe export (an incubator's temperature and a culture's density, day by day: the generic format any instrument can write). Adding a source is one adapter function (`src/watch.js`) or one file in the generic format.

Watch mode reads public surveillance figures and says what moved. It is not medical advice, not a diagnosis and not an epidemic alert. The official bulletins of each network remain the reference.

Measured (30 October, versioned in `examples/watch-sentinelles-2026-10-30/`): nine weekly readings of Sentinelles (W35 to W43) and eight comparisons, replayed without any model call. Three variations were found (W36 +40.7%, W37 +44.7%, W38 +40%, the autumn rise of influenza-like illness), then five quiet weeks.

With `--explain` on the W38 rise (55 to 77 per 100,000, +40%), Mission Zero read the Sentinelles pages, quoted the surveillance method word for word (3 verified quotes, 9/10, $0.048, 10 calls). It said plainly that no published comment on that particular rise exists in what it read: the network comments on epidemic weeks, not on a September uptick. Two earlier attempts (kept locally) had asked it to re-verify the figures on the bulletin page and it answered "not proven": the figures live in the dataset, which the watch reads and keeps, not in the page. The goal now says so.

`npm run watch-replay -- watch/<source>` draws the folder as researchers read surveillance. One series gets the curve with its confidence band and threshold, and the reported weeks as red dots. Many series get the heatmap of regions by week with a red frame on each reported cell. A probe gets its control chart with its limit. Statuses appear as chips, then the variations period by period and the cited explanation. A `replay.html` is in `examples/watch-sentinelles-2026-10-30/` (France), `examples/watch-sentinelles-regions-2026-10-30/` (13 regions, the same nine readings) and `examples/watch-probe-example/` (the incubator). The first reading of the tuberculosis vaccine trials (ClinicalTrials.gov, 100 studies with their status) is in `examples/watch-clinicaltrials-2026-10-30/`: the next reading will show which trial changed status.

## Known limits (read before trusting a "proposed" fix)

1. **The scanner judges the symptom, not the cause.** "Flaw gone" means the probe no longer fires. For F14 the model stopped serving jQuery 1.8.3 instead of updating it; the probe is satisfied, the shop lost its library. The agent reviews its own patch against the cited recommendation ("cause" or "hides"). A hiding patch is refused and retried. If it persists, the fix is "proposed with reservation", the reservation written in the report. The scanner alone still cannot tell; the agent can, and says so. It is not infallible: in the 28 October results it accepted "serve the catalogue page at /robots.txt" (F10) as a cause fix, which removes the disclosure but is an odd robots file. A reviewer would ask for a plain robots.txt without the sensitive paths.
2. **The justification is not always strong.** "Proposed" proves that the journeys pass and the probe is silent on the copy; it says nothing about the quality of the cited fix. The judge scores each recommendation out of 10 and the report shows it. In the 28 October results, 4 of the 15 recommendations scored under 7 (F02, F05, F09, F12). They had one to three verified sources, but thin or secondary ones; the PCI DSS standard itself sits behind a registration form. Such a fix is "proposed with reservation", never "proposed": the reservation names the score and the number of verified sources. Read the sources before applying.
3. **The vital journeys are the customer's.** A journey that is not written cannot protect anything. Maison Verde has 7; a fix that broke something outside them would pass. In a real deployment the customer's test suite is the journeys file.
4. **The demo shop is small and fictional.** One `server.js`, 14 000 characters sent to the model per file. A real site needs the files chosen (`files` option) and the edits reviewed in context; the exact-string rule refuses ambiguous edits but cannot judge design.
5. **The secret filter is pattern-based.** It masks the usual shapes (`.env` lines, `password=`, `define('X_PASSWORD'…)`, Stripe, AWS, GitHub, Google, Slack, JWT, private keys, bearer tokens). A secret that looks like nothing (the demo's static `session=admin-7c9e` cookie value, for instance) goes through. The report says how many were masked, not that none remained.
6. **The hashed journal proves integrity, not identity.** It shows that no record changed since the run; it does not sign who ran it. A signature (the customer's key) is the next step.
7. **One model does everything.** Muse Spark plans, writes, verifies, contradicts, judges and repairs; there is no second model and no human until the end. The verifier demands an exact quote from the cited page, which limits what the writer can invent, but the chain is still one model checking itself.
8. **Two scanners can disagree, and a finding can have no probe here.** On the real site, ARGUS reported HSTS without `includeSubDomains`; Mission Zero's probe accepts a one-year max-age, so the fix stayed unverified. Sensitive HTML comments have no probe here at all: unverified too. Unverified is never silently upgraded to proposed; the scanner that found the flaw rescans after the human applies.
9. **A fix can break what no test and no screenshot sees.** A Content-Security-Policy that blocks inline scripts leaves the HTTP journeys green and the screenshot unchanged. We caught that class on the real site and added a control for it; other silent breakages of that kind (a blocked font, a refused connection) are still open.
10. **Costs are measured on `muse-spark-1.3` with reasoning** and, for one mission, on the open weights at Baseten. Baseten documents that the open model gives no reproducible output and no forced JSON mode (our JSON reader is tolerant).
11. **A finding from a third-party scanner is text written by someone else.** It goes into the model's prompt as data, and a crafted finding could try to steer the fix. The edits are confined to the copy and to the allowed files, and a human reviews the patch.
12. **DNS rebinding.** The host is checked once, then `fetch` resolves the name again; a name with a very short TTL could answer differently. Mitigation planned: resolve once and connect to the checked address.
13. **The caps are per process.** The run cap and the daily cap are enforced per process; two processes started together can each spend up to the cap.

## Trust: what stays with you, what leaves, what is checked

Mission Zero runs where you run it. It sends data only to the model provider you choose, to the search engine (the goal, in clear), to the public sites it reads, to the host you scan and to the scanner URL you set. It leaves little room to break your service and checks every citation against the page it cites. The limits above say where that stops.

| Concern | What Mission Zero does |
|---|---|
| **Where our data goes** | No server of ours is in the loop: Mission Zero runs where you run it. The model is the exception. With the Meta Model API (default), Baseten or Fireworks, what the model reads (goal, page excerpts, masked code, findings) and, with `--vision` or voice, screenshots and audio, are sent to that provider. It handles them under its own terms; check where it processes data. Only an open-weight model on your own servers keeps everything with you. Every network call is in the code: the model provider, the search engine, the public sites it reads, SAM and voice on Meta's API, the EUR-Lex mirror publications.europa.eu, the host you scan and the scanner URL you set. Nothing else. |
| **Our production must keep working** | It never modifies the live site. The optional scan sends active probes to it (see the legal notice); every fix is applied to a copy, your own vital journeys are replayed, one failure rejects the fix, the copy is rescanned, and what comes out is a patch your developers review and your pipeline deploys. Mission Zero proposes; a human applies. |
| **Our secrets must not reach a model** | A secret filter masks passwords, keys and tokens (`.env` lines, `define('X_PASSWORD', …)`, `password: '…'`, Stripe, AWS, GitHub, JWT, private keys) before every model call (`src/secrets.js`). It is pattern-based (limit 5); screenshots and audio sent with `--vision` or voice are not filtered. It restores the real values in the edits, the summary, the risk note and the review reasons; `fix.redacted.patch` is the file to share, `fix.patch` stays local. The runs committed in `examples/` predate this rule (28 October) and still carry their `fix.patch`; the secrets in them are the fictional ones of the demo shop (`demo-site/`). The report says how many were masked. |
| **We need to prove what happened** | Every record of a run (findings, each repair, each patch, the report) is chained in a hashed journal (`chain.json`, sha256 of the file and of the previous link). `npm run verify-chain` recomputes it: an altered, removed or reordered record breaks the chain (`src/chain.js`). |
| **Does it detect its own failing fixes?** | It rejects those that break a journey (see limit 9 for what it cannot see), in the report, with the name of the journey it broke. |

**What you should know before running it on your data**

- Recipients: Meta Platforms (text, vision, SAM and voice), Baseten, Fireworks, DuckDuckGo, the sites read, the host you scan and the scanner URL you set.
- The secret filter masks secrets, not names, emails or phone numbers in code, fixtures or screenshots. Work on a copy with fictional data.
- The goal is sent in clear to the search engine. Keep confidential information out of it.
- `evidence/` keeps the texts read, the answers and the patches, with secrets in clear. Do not share it, and set your own retention.
- When operated for a customer (MYTHOZOR), the operator is the customer's processor and the model providers are sub-processors. A GDPR Article 28 agreement comes before the first customer. When you run it yourself, you are the controller and the model provider acts under its own terms; check its data processing terms. Data sent to a provider outside the EU is a transfer: check its safeguards (standard contractual clauses or Data Privacy Framework).
- Reports and fixes are produced by an AI model and say so.

What this repository does not claim: certifications (ISO 27001, SOC 2), a third-party pentest of the tool, contracts. Those come with the first large customer, not with a hackathon.

## Impact: some of Maison Verde's flaws are common on real business sites

The fictional shop was not built at random. CRYPTOR.AGENCY's surface scanner (ARGUS, a passive read of a site's public home page and headers, nothing intrusive) has read 26 French business showcase sites, prospects of the agency. It reads them the way any visitor's browser reads a public page: one request to the home page, its headers and its HTML, no probing. It is a small sample, not a study, and no site is named anywhere. The figures are shares of those 26 sites, read in aggregate on 28 October 2026 and versioned as `examples/argus-aggregate.json` (counts only). The scanner itself predates the hackathon and is not part of this repository.

| Share of the 26 sites | Failing control | Maison Verde flaw it maps to |
|---|---|---|
| 81% | no Content-Security-Policy | F01, security headers |
| 73% | no anti-clickjacking header | F01 |
| 65% | no X-Content-Type-Options | F01 |
| 62% | no HSTS | F01 |
| 58% | no resistance to automated attacks (rate limiting, inferred from the response headers, not tested) | F07, weak authentication |
| 46% | server reveals itself (Server, X-Powered-By) | F02, versions disclosed |
| 42% | application version disclosed in the page | F02 |
| 27% | no privacy policy | F15 |
| 23% | mixed content (resources loaded over HTTP) | close to F05, but not the same: F05 is card data sent over HTTP |
| 23% | session cookies without Secure or HttpOnly | F08, insecure cookie |
| 19% | cookies without SameSite | F08 |

Average score 56/100; 19 of the 26 sites scored C, D or F. Each of these flaws has a proposed fix in the table above (F02 and F05 with a reservation), at about ten cents a finding. The full CSP case is the real-site run: rejected once, then proposed with a nonce. That is the gap Mission Zero is built for. The fixes are cited. What is missing on most sites is someone who proposes them with proof, without ever touching the live shop, and with every fix replayed against the customer's own journeys.

## Business

Who pays: online shops and the agencies and hosts that run them, where the same classes of flaw come back site after site. What they buy: a proven fix per finding, or the tool installed on their side, fed by the scanner they already have. What exists today: the agency's own site (6stem.com) repaired on a copy with proof, and ARGUS running on 26 prospect sites (`examples/argus-aggregate.json`). Mission Zero lands first in MYTHOZOR, the agency's platform, after the hackathon.

## Team

One founder, CRYPTOR.AGENCY (France), with Claude Code as pair programmer: commits carry the agency's identity (`cryptor.agency`) or the project identity (`mission-zero <noreply@example.com>`), and a `Co-Authored-By: Claude` line when the assistant wrote part of the change. Every run, figure and decision in this README was made and checked by the founder.

## Run it

### Requirements

- Node 22.13 or newer
- git (for the patches)
- A Meta Model API key
- Optional: Playwright (`npm i playwright && npx playwright install chromium`) for `--vision`, and ffmpeg for voice
- Optional: a Baseten key for the open weights

With Docker (git and ffmpeg inside, the `.env` never copied into the image; the test suite runs in the image on every push, `.github/workflows/ci.yml`):

```bash
docker build -t mission-zero .
docker run --rm --entrypoint npm mission-zero test                       # the test suite, no network, no model call
docker run --rm --env-file .env -v "$PWD/evidence:/app/evidence" -v "$PWD/memory:/app/memory" mission-zero src/run.js "your goal" 4 3
```

Without Docker:

```bash
cp .env.example .env            # add your MODEL_API_KEY (Meta Model API)
npm install
npm run check-key
npm test                        # the test suite, no network, no model calls
node --env-file=.env src/run.js "your goal" 4 3     # 4 turns, 3 contradiction rounds
npm run demo                    # the 5 goals above, table + evidence
node bench/make-replay.js evidence/<folder>         # animated replay of a mission (one HTML file)
npm run watch -- "Sentinelles grippe France" --replay=8 --explain   # watch mode: what moved, and why, with quotes
npm run watch-replay -- watch/sentinelles-grippe-france            # the curve, the threshold, the red dots, the explanation (one HTML file)
```

Real runs are committed in `examples/`: five research missions (`dbir-2025`, `gdpr-max-fine`, `nist-800-63b-4`, `cvss-v4`, `anssi-hygiene`), the self-reset (`back-to-zero`) and the repair of the 15 flaws (`repair-maison-verde`, two runs with their patches and hashed journals, plus the `stories/` runs, which are single-finding replays). They also include the real site read by another scanner (`real-site`), the effort sweep (`effort-sweep`), the open weights on Baseten (`open-weights`), the missions of 29 October (`film-2026-10-29`), the watch runs (`watch-*`) and the raw outputs of the Meta tools (`meta-tools`). Open any `replay.html` in a browser to watch a mission or a repair replayed from its own evidence, or read the raw `journal.jsonl` and `repair.json`.

The evidence folder (`evidence/<date>/`) holds `journal.jsonl` (every plan, observation, evaluation), `memory.json`, `final-answer.json` (answer, sources, every version with its verdicts and quotes) and `summary.json` (score, proofs, cost by role).

## Layout

| File | Role |
|------|------|
| `src/loop.js` | the hypothesis → action → observation → evaluation loop |
| `src/tools.js` | free actions, PDF reading, goal-targeted reading, EUR-Lex via the Publications Office |
| `src/pdf.js`, `src/passages.js` | PDF text, relevant passages, numbers in words |
| `src/synthesis.js` | the draft answer, from seen URLs only |
| `src/verify.js` | re-reads each cited page, exact quote required |
| `src/contradictAnswer.js` | contradictor, judge, best version kept |
| `src/research.js` | one free research action per objection |
| `src/memory.js` | lessons, generic only |
| `src/meta.js` | Meta Model API client (or Baseten open weights by base URL), reasoning effort per role, daily ledger |
| `src/run.js`, `src/zero.js` | one mission end to end; the agent's own return to zero (outcomes, rules, archive, rerun, compare) |
| `src/contradict.js`, `src/compare.js` | contradictor on the plan (kept for the A/B, off by default) and run comparison |
| `src/watch.js` | watch mode: readings compared period to period, variations only, replay of a public history, cited explanation of the biggest one |
| `src/scanner.js` | 15 shop probes and 7 policy probes (F16 to F22), generic findings; a finding is rescanned by id or by type |
| `src/repair.js` | cited recommendation, exact edits on a copy, journeys replayed, inline-script policy control, rescan, unverified status, patch |
| `src/secrets.js` | secret filter before every model call, real values restored in the edits, the summary, the risk note and the review reasons |
| `src/chain.js` | hashed evidence journal of a run |
| `src/voice.js`, `src/vision.js`, `src/sam.js` | spoken goal (muse-voice-transcribe), pages looked at (Muse Spark vision), fields boxed (SAM 3.1) |
| `demo-site/` | Maison Verde, the flawed shop, its vital journeys and its 15 documented flaws |
| `bench/` | demo goals, A/B of the contradictor, replay generator, repair runner and report, chain check |
| `web/` | a side experiment from day one (one community question, a random identifier in the browser, no name, email or stored IP); not part of the judged product |
| `Dockerfile`, `.github/workflows/` | the container; the tests on Node 22 and 24 and inside the image on every push; the live demo (`pages/index.html` + `examples/`) deployed to GitHub Pages |
| `examples/` | committed real runs, replays, patches, hashed journals, Meta tool outputs, the anonymous scan aggregate, the real site read by another scanner (`real-site/`), `effort-sweep/`, `open-weights/`, `film-2026-10-29/` (missions of 29 October) and `watch-*` |

## Data sources

- Réseau Sentinelles (Inserm, Sorbonne Université), sentiweb.fr
- WHO FluNet (Global Influenza Surveillance and Response System) is supported by an adapter only. No FluNet data is committed here: run `node bench/make-flunet-readings.js` to fetch it yourself under WHO's terms (https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions), which restrict use to public health purposes and exclude the promotion of a commercial enterprise. WHO does not endorse this project.
- ClinicalTrials.gov (U.S. National Library of Medicine)

All read on 30 October 2026. The figures are copied as published; the variations and explanations are Mission Zero's, not the sources'.

## License

PolyForm Noncommercial 1.0.0: the code is readable and usable for personal study, research and testing, and by noncommercial organizations; the hackathon organizers use it under the Official Rules. Any commercial use requires a license from CRYPTOR.AGENCY. Copyright (c) 2026 CRYPTOR.AGENCY.

What the hackathon organizers may do with the submission is governed by the hackathon's Official Rules, not by this section. The only runtime dependency is pdfjs-dist (Apache-2.0); the Meta models are called through their APIs under their providers' terms.

Meta, Muse Spark and SAM are trademarks of Meta Platforms; Baseten, Fireworks, OWASP, NIST and WHO are names of their owners. They are cited to describe what this project uses or reads; none of them endorses it.
