<p align="center"><img src="assets/logo.png" alt="CRYPTOR.AGENCY" width="160"></p>

# Mission Zero

**Give it a goal. Let it discover the path. Demand proof.**

Mission Zero is an autonomous research agent that refuses to take its own word for it. You give it an objective. It has no plan and no answer. It forms hypotheses, searches, reads whole primary documents (117-page PDFs included), evaluates itself after every move, pivots when it fails, and writes an answer **only from what it actually read**. Then a verifier re-reads every cited page and demands an exact quote, a contradictor attacks the answer, a judge scores each version, and only the best one survives.

Every step is written to an evidence folder you can open: journal, memory, final answer, verdicts, quotes.

Startups track · CRYPTOR.AGENCY · Meta Global AI Developer Hackathon 2026 · built on the Meta Model API (`muse-spark-1.3`)

**What is judged, in one paragraph.** Two things, one loop. (1) A research agent that answers a goal only from primary documents it read, with an exact quote for every figure (5 demo goals at 10/10, 4 to 9 cents each). (2) A repair mode that takes any scanner's findings on a website and returns, for each flaw, a patch applied on a copy and checked five ways (the customer's own tests, a rescan, a look at the pages, the agent's review of its own patch, written reservations), at about ten cents a finding, never touching the site itself. On a real site read by another scanner, 5 of 7 findings got a proposed fix with proof and 2 stayed unverified by design (its own probe could not confirm them), for $0.22. Plus an agent that returns to zero by itself when its memory hurts. Repository: `github.com/cryptoragency/mission0` (public from 4 November 2026). Prerequisites: Node 24, a Meta Model API key; optional: Playwright and ffmpeg for the vision and voice features, a Baseten key for the open weights.

## What is new in this repository

Everything here was written during the hackathon, from 26 October 2026. The git history is dated and public. No code, data or prompt comes from the agency's existing products.

## The loop

```
goal ──► plan (hypotheses + ONE free action) ──► action ──► observation ──► evaluation (0–10, lesson, pivot)
             ▲                                                                      │
             └────────────────── next turn, with the lesson ◄───────────────────────┘
                                                                                    │ after the last turn
                                   draft answer (only URLs that were seen) ◄────────┘
                                                 │
                        verifier: re-reads each cited page, exact quote required
                                                 │  green = the page says it · red caps the score at 5
                      contradictor ──► targeted research ──► rewrite ──► verifier ──► judge
                                                 │  up to 5 rounds, stops on stagnation
                                       best version kept ──► evidence folder
```

- **Actions** are free and harmless: `web_search` (DuckDuckGo HTML), `read_page` (HTML or PDF, with a `find` hint that selects the passages that matter), `create_page` (a file in the evidence folder). Anything paid or with a real-world effect requires a human **yes**: the agent asks, never acts.
- **Reading a 250 000-character report** is cheap: the page is read once per run, cached, and reduced to its opening plus the passages relevant to what the planner asked for. Numbers written in words ("eight characters") count as numbers.
- **A claim is green only with a quote** that really appears in the cited page. "Supported" without a quote is not trusted.
- **Memory**: each mission ends with generic lessons (never about a company or a person), 30 at most, reused by the next mission. Winning objections of the contradictor become lessons too.
- **Hard budget caps**: per run (`MZ_CAP_USD`) and per day (`MZ_DAILY_CAP_USD`). The run stops when either is reached.

### What makes it cheap

Muse Spark reasons before answering and the reasoning is billed as output: it was 93 % of the cost. Mission Zero sets `reasoning_effort` **per role** (minimal for the verifier, low for judge and contradictor, medium for planning and writing). A full mission costs **$0.04 to $0.17** instead of $0.45, with a better score.

## Results on the demo goals (27 October 2026, 4 turns, 3 contradiction rounds)

| # | Goal | Judge | Green proofs | Cost |
|---|------|-------|--------------|------|
| 1 | Verizon DBIR 2025: breaches analyzed, human element (117-page PDF) | **10 / 10** | 2 | $0.059 |
| 2 | GDPR maximum fine, article (official text via the EU Publications Office) | **10 / 10** | 3 | $0.061 |
| 3 | NIST SP 800-63B-4 password lengths: 15 single-factor, eight multi-factor, 64 allowed | **10 / 10** | 3 | $0.086 |
| 4 | Latest CVSS version, year, Critical range (first.org) | **10 / 10** | 3 | $0.037 |
| 5 | ANSSI *Guide d'hygiène informatique*: 42 measures, "Version 2.0 - Septembre 2017" from the PDF footer | **10 / 10** | 4 | $0.047 |

Every figure is green: confirmed by an exact quote from the primary page. Scores vary between runs because web search does: in one run of goal 1 the search returned the public-sector snapshot instead of the full report, and the judge gave 5 / 10 for citing the wrong document. That honesty is the point. Reproduce with `npm run demo`; each run writes its own evidence folder.

## Repair mode: from a scanner's finding to a proven fix, never applied by the agent

The same loop, pointed at code. A scanner (any scanner: the input is a generic JSON file, or a URL) reports the flaws of a website. The finding is the unit, not the website: a CVE from a dependency scanner, a server misconfiguration from an infrastructure scanner carry the same five fields and go through the same controls; the rescan becomes that scanner's own command. For each finding, Mission Zero:

1. **researches the fix** from primary sources (OWASP, MDN, NIST, PCI DSS, IETF) with the verifier and the judge, and caches the recommendation by flaw type (the second site with the same flaw costs nothing);
2. **proposes exact edits** to the code (find/replace, each `find` must occur exactly once or the edit is refused);
3. **applies them to a copy** of the site, never to the site itself;
4. **replays the vital journeys** on the copy (browse, search, add to cart, check out, log in, follow my own order, legal page): one broken journey = the fix is **rejected**; a policy that would block the page's own inline scripts is a broken page too (a control added after the first real site, below);
5. **rescans the copy** with the probe that matches the finding by id or by type (so a finding from another scanner is rescanned here): the flaw must be gone, or the fix is **ineffective**; no probe for its type, or a probe that does not reproduce it on the untouched copy, and the fix is **unverified**, never proposed;
6. **reviews its own patch** against the recommendation it researched: cause removed, or symptom hidden? A hiding patch is refused by the agent and retried with that reason; if no better patch comes, the fix is **proposed with reservation**, the reservation written. A recommendation the judge scored under 7 is a reservation too, never a silent « proposed »;
7. writes the fix as a **patch** for a human to review and apply, plus a readable report.

The target in this repository is Maison Verde (`demo-site/`), a fictional shop built with the 15 flaws scanners find on most e-commerce sites (`demo-site/FLAWS.md`). It runs locally only.

**The scanner probes only a site you own.** A local address is yours by definition. Any other host must serve a token of your choice (`MZ_OWNER_TOKEN`, 16 characters or more) at `/.well-known/mission-zero.txt`, the same proof a registrar asks for a domain; otherwise `scan()` refuses before a single probe runs (`src/scanner.js`, `src/scanner.test.js`). Mission Zero is a repair tool, not a reconnaissance one: pointing it at someone else's site is not possible by design, and not allowed by its licence.

```bash
npm run repair -- demo-site/findings.example.json          # the 15 findings, one proposed fix each
npm run repair -- --scan                                   # scan the demo shop first, then repair
npm run repair -- --from=https://scanner.example/findings  # any scanner's URL (MZ_SCANNER_URL / MZ_SCANNER_KEY in .env)
npm run repair-report -- evidence/repair-<date>            # one readable page per run
npm run verify-chain -- evidence/repair-<date>             # recompute the hashed evidence journal
npm run repair-replay -- evidence/repair-<date> F14        # animated replay of one repair, control by control (one HTML file)
```

### Results on Maison Verde (28 October 2026, final run: 2 research turns, 1 contradiction round, 1 retry, vision on, self-review on)

Every status below was decided by the system, not edited by hand: the table is generated from the evidence folders (`node bench/make-results-table.js <run> [<run>]`). « Proposed with reservation » means every mechanical check is green but the agent wrote a reservation: a cited recommendation the judge scored under 7, or a patch the agent itself judges to hide the symptom.

| # | Flaw | Status | What the agent did (its own words) | Judge | Checks |
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
| F14 | jQuery 1.8.3 | **proposed with reservation** | 1 attempt refused by itself (rejected), then: Remove the vulnerable jQuery 1.8.3 endpoint by redirecting it to the catalogue. Reservation: the agent judges its own patch hides the symptom instead of removing the cause: Patch redirects /js/jquery-1.8.3.min.js to '/' instead of updating to a non-vuln | 8/10, 2 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: hides |
| F15 | no privacy policy | proposed | Add privacy notice at checkout and privacy policy on legal notice explaining purpose and use of collected data. | 7/10, 2 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: partial |
| F02 | versions disclosed | **proposed with reservation** | 1 attempt refused by itself (ineffective), then: Remove Server and X-Powered-By version disclosure headers from HTML responses. Reservation: weak justification: the judge scored the cited recommendation 4/10 (1 verified source); read the sources before applying | 4/10, 1 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |
| F10 | robots.txt lists sensitive paths | proposed | 1 attempt refused by itself (rejected), then: Serve the normal catalogue page at /robots.txt so no sensitive Disallow entries are disclosed. | 9/10, 3 green | journeys 7/7, rescan clean, look ok, fields 0→0, self-review: cause |

5 reserved, 10 proposed · 15 findings · 237 model calls · $1.49 (about 10 cents per finding, vision and self-review included)

Reading the « Checks » column: « journeys 7/7 » the customer's tests replayed on the repaired copy; « rescan clean » the scanner no longer fires on the copy; « look ok » Muse Spark judged the repaired pages still work for a customer; « fields a→b » SAM 3.1's count of text fields on the finding's page before and after; « self-review: cause / hides / partial » the agent's verdict on its own patch. « green » is a cited source whose exact quote the verifier found on the page; « red » a contradiction.

The two runs behind this table, with every patch and their hashed journals (32 and 16 records, intact), are in `examples/repair-maison-verde/`, with the merged report page `report.html`. Earlier in the day, before the self-review existed and while a token cap could cut the judge's answer, the same 15 findings had come out « 15 proposed »: that run is not the one shown, because a 0/10 from a cut answer is not a judgement.

### A real site, read by another scanner (28 October 2026)

The second target is real: 6stem.com, CRYPTOR.AGENCY's own showcase site, a static page served by nginx. Its files are the agency's and stay out of this repository; what is here is the run's evidence (`examples/real-site/`: findings, patches, report, replays, hashed journal). The copy Mission Zero works on is the site's folder plus a 40-line `server.js` that reproduces the hosting's headers (it stands for the nginx configuration: a patch on it is a change of that configuration, which a human applies) and 5 vital journeys (home page, scripts load, legal notice present, unknown paths show the site, a visitor is never blocked).

The findings did not come from Mission Zero's scanner. ARGUS, the surface scanner of MYTHOZOR (35 passive checks on the public home page and its headers, a product that predates the hackathon), read the live site and served its result through the generic URL input (`--from=URL`, a bearer key in `.env`): score 81/100, grade A, 7 findings. Mission Zero knows nothing about ARGUS: it reads `{ id, severity, type, url, evidence, description }`.

| Finding (ARGUS) | Mission Zero's answer | What it did | Checks |
|---|---|---|---|
| A-csp-strength · CSP without script-src (medium) | **proposed**, 1 attempt refused by itself | first attempt `script-src 'self'`: **rejected, the fix breaks the page** (the policy forbids inline scripts and the page runs 7 of them); second attempt: a per-response nonce with `strict-dynamic`, injected into every script tag | journeys 5/5, rescan clean (F17), look ok, self-review: cause |
| A-csp-connect · CSP without connect-src (medium) | **proposed** | `connect-src 'self'` added to the policy | journeys 5/5, rescan clean (F22), look ok, self-review: cause |
| A-corp · no Cross-Origin-Resource-Policy (low) | **proposed** | header `same-origin` on every response | journeys 5/5, rescan clean (F18), look ok, self-review: cause |
| A-coep · no Cross-Origin-Embedder-Policy (low) | **proposed** | header `credentialless` (the recommendation's choice, so that embedded resources keep working) | journeys 5/5, rescan clean (F19), look ok, self-review: cause |
| A-auto-throttle · no rate limiting (low) | **proposed**, 1 attempt ineffective | per-IP sliding window, 30 requests a minute, 429 with Retry-After and rate-limit headers; the first attempt left the burst probe unanswered | journeys 5/5 (12 pages in a row still pass), rescan clean (F21), look ok, self-review: cause |
| A-comments · sensitive HTML comments (medium, heuristic) | **unverified** | strips HTML comments from served pages; Mission Zero has no probe for this type, so it refuses to call the fix proven: « the scanner that found it must rescan once the patch is applied » | journeys 5/5, no rescan, look ok, self-review: cause |
| A-hsts-sub · HSTS without includeSubDomains (low) | **unverified** | adds `includeSubDomains`; Mission Zero's own HSTS probe accepts a one-year max-age and did not see the finding on the untouched copy: the scanners disagree, so the rescan cannot confirm anything | journeys 5/5, no rescan, look ok, self-review: cause |

5 proposed, 2 unverified · 7 findings · 23 model calls · $0.216 · the look (Muse Spark vision) accepted every repaired page, SAM 3.1 counted 0 text fields before and after (a showcase page has none: evidence, not a gate). The hosting omits `includeSubDomains` on purpose (customers' other subdomains); the unverified status is the right answer, not a failure.

What this run taught us, in the order it happened (the three runs are the same evening; the first two are not versioned, their lessons are):

1. **First run, $0.634, 114 calls.** Vision did not run (the Playwright path was missing from `.env`, recorded as an error in each record, never as a verdict) and one of our new probes had lost a backslash: fixed, two commits.
2. **Second run, $0.185.** `script-src 'self'` came out « proposed »: 5 journeys green, probe silent, screenshot fine, self-review « cause ». The page runs 7 inline scripts; that policy would have blocked them all. Neither the HTTP journeys nor the look can see a blocked script. We added the control: a policy that forbids the page's own inline scripts is a broken page, **rejected** (`inlineScriptsBlocked` in `src/repair.js`, tested).
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
| `muse-spark-1.3` (vision) | `--vision` in repair mode: after a fix passes the journeys and the rescan, the repaired pages are screenshotted headless and shown to the model as a customer sees them (`src/vision.js`) | an HTTP assertion is blind: a blank page or a vanished product grid returns 200. The model answers « ok / problems / seen » and a « not ok » rejects the fix |
| `sam-3.1` (segmentation) | same `--vision` step: SAM boxes the text fields of the finding's page before and after (`src/sam.js`) | visual evidence a reviewer understands in one glance: the card form had 5 fields, the fixed page has 2. Concepts must be visual (« form », « text input field », « button »): « credit card form » finds nothing |
| Muse Spark open weights (Baseten) | `MZ_BASE_URL` + `BASETEN_API_KEY` switch the whole system to `meta-models/muse-spark-open` on Baseten (`MZ_MODEL=meta-models/muse-spark-open-1026` for the hackathon slug named in the Participant Guide, which our account did not list on 28 October), or any OpenAI-compatible endpoint (`src/meta.js`) | the trust promise « the model stays with you » needs the open weights; same requests, same prompts; measured below |

First real measurements (28 October): voice, an 11-second goal transcribed in 3.0 s; vision, two pages read correctly for $0.005; SAM, « form » 1 box, « text input field » 5 boxes, « button » 1 box on the checkout page, under 2 s each. Official prices on 28 October 2026 (dev.meta.ai, pricing and rate limits): Muse Spark 1.3 $1.25 per million input tokens, $0.15 cached, $4.25 output; voice $0.18 per hour of audio; SAM $2.50 per 1 000 images.

What vision caught that HTTP tests did not (28 October, 09:31 run, `--vision` on F05, versioned in `examples/repair-maison-verde/stories/repair-2026-10-28-09-31/F05/` with its replay and screenshots): the model's fix removed the card inputs and left their labels. The 7 journeys were green, the scanner was silent, and Muse Spark looking at the page said « payment page form is incomplete: 'Numero de carte', 'Expiration', 'Cryptogramme' appear as text with no visible input fields ». SAM counted 5 text fields before, 2 after. The fix was **rejected**. On F03, the same look confirmed the escaped `<script>` shown as plain text with no popup. The two looks cost $0.01. In the final run (11:18) the same F05 fix removed the whole card form and announced an external payment provider: the look accepted it (SAM 5 → 0), and the fix is « proposed with reservation » for its thin justification. Raw outputs of the three Meta tools are in `examples/meta-tools/`.

Open weights, measured (28 October, versioned in `examples/open-weights/` with its replay and `provider.json`): the same DBIR mission on `meta-models/muse-spark-open` served by Baseten (`MZ_BASE_URL=https://inference.baseten.co/v1`, `BASETEN_API_KEY`): judge 10/10, 2 verified sources, 12,195 breaches and the 60 % quoted from the report, 2 turns, 20 model calls, $0.073, 62 seconds in all. Same code, same prompts, same `reasoning_effort` per role; only the base URL changed. On the Meta API the same mission took 2 turns and $0.031 (`examples/dbir-2025`). Baseten's prices are the same as Meta's ($1.25 in, $4.25 out per million tokens) with cached input at $0.15. The Participant Guide names `meta-models/muse-spark-open-1026` for the hackathon; our Baseten account listed only `meta-models/muse-spark-open` on 28 October (GET /v1/models), so the run used that one and `MZ_MODEL` switches when the other is served.

## Mission Zero returns to zero by itself

An agent that learns can learn wrong. Mission Zero keeps a ledger of its missions (`memory/outcomes.json`, local and not versioned: judge score, verified sources, lessons used) and, after every mission, decides whether its own memory is hurting it. Three rules, all explainable in one sentence:

- **A.** two bad missions in a row (judge under 7) while lessons were applied;
- **B.** the same goal scored at least 2 points higher before, with fewer lessons: the memory made it worse;
- **C.** drift: the last three missions average 2 points under the three before.

When a rule fires, the agent **archives its lessons itself** (`memory/archive/lessons-<date>.json`, never deleted), writes the rule and the reason in `memory/resets.json` and in the journal, **runs the mission again knowing nothing** (`evidence/<run>/from-zero/`), compares both answers (judge score, then verified sources, then contradicted ones), keeps the better one, and relearns from that one only. `zero.json` holds the comparison. The archived lessons and the reset record of the versioned run are in `examples/back-to-zero/memory/`. No human presses the button; `MZ_ZERO=off` disables it, `--from-zero` forces it for an experiment (marked « forced », never presented as a natural reset).

First real run (28 October, forced for the experiment, DBIR 2025 goal, 3 turns, 1 round): the agent archived its 30 lessons, ran again knowing nothing, and both answers were identical, 10/10, the 60 % human element quoted from the report. With memory: $0.031. From zero: $0.054, 75 % more: both took 2 turns, the difference is in what was read and written (the first turn scored 4/10 with memory and 8/10 from zero, so the lessons did not even help the first move here). Verdict written by the agent: « same result either way: the memory did no harm », memory restored. The run and its replay are in `examples/back-to-zero/`. A natural reset (rules A, B or C) has not fired yet; when one does, it will be shown as it happened, never staged.

## Known limits (read before trusting a « proposed » fix)

We would rather list these ourselves.

1. **The scanner judges the symptom, not the cause.** « Flaw gone » means the probe no longer fires. For F14 the model stopped serving jQuery 1.8.3 instead of updating it; the probe is satisfied, the shop lost its library. Since 28 October (afternoon) the agent reviews its own patch against the cited recommendation (« cause » or « hides »): a hiding patch is refused and retried, and if it persists the fix is « proposed with reservation », the reservation written in the report. The scanner alone still cannot tell; the agent can, and says so. It is not infallible: on the final run it accepted « serve the catalogue page at /robots.txt » (F10) as a cause fix, which removes the disclosure but is an odd robots file; a reviewer would ask for a plain robots.txt without the sensitive paths.
2. **The justification is not always strong.** « Proposed » proves that the journeys pass and the probe is silent on the copy; it says nothing about the quality of the cited fix. The judge scores each recommendation out of 10 and the report shows it: on the final 28 October run, 4 of the 15 recommendations scored under 7 (F02, F05, F09, F12: one to three verified sources but thin or secondary ones; the PCI DSS standard itself sits behind a registration form). Since 28 October (afternoon) such a fix is « proposed with reservation », never « proposed »: the reservation names the score and the number of verified sources. Read the sources before applying.
3. **The vital journeys are the customer's.** A journey that is not written cannot protect anything. Maison Verde has 7; a fix that broke something outside them would pass. In a real deployment the customer's test suite is the journeys file.
4. **The demo shop is small and fictional.** One `server.js`, 14 000 characters sent to the model per file. A real site needs the files chosen (`files` option) and the edits reviewed in context; the exact-string rule refuses ambiguous edits but cannot judge design.
5. **The secret filter is pattern-based.** It masks the usual shapes (`.env` lines, `password=`, `define('X_PASSWORD'…)`, Stripe, AWS, GitHub, Google, Slack, JWT, private keys, bearer tokens). A secret that looks like nothing (the demo's static `session=admin-7c9e` cookie value, for instance) goes through. The report says how many were masked, not that none remained.
6. **The hashed journal proves integrity, not identity.** It shows that no record changed since the run; it does not sign who ran it. A signature (the customer's key) is the next step.
7. **One model does everything.** Muse Spark plans, writes, verifies, contradicts, judges and repairs; there is no second model and no human until the end. The verifier demands an exact quote from the cited page, which limits what the writer can invent, but the chain is still one model checking itself.
8. **Two scanners can disagree, and a finding can have no probe here.** On the real site, ARGUS reported HSTS without `includeSubDomains`; Mission Zero's probe accepts a one-year max-age, so the fix stayed unverified. Sensitive HTML comments have no probe here at all: unverified too. Unverified is never silently upgraded to proposed; the scanner that found the flaw rescans after the human applies.
9. **A fix can break what no test and no screenshot sees.** A Content-Security-Policy that blocks inline scripts leaves the HTTP journeys green and the screenshot unchanged. We caught that class on the real site and added a control for it; other silent breakages of that kind (a blocked font, a refused connection) are still open.
10. **Costs are measured on `muse-spark-1.3` with reasoning** and, for one mission, on the open weights at Baseten; Baseten documents that the open model gives no reproducible output at temperature 0 and no forced JSON mode (our JSON reader is tolerant).

## Trust: built for companies that cannot afford a mistake

Mission Zero does not ask to be trusted. It is built so that it has no way to take your data, little room to break your service, and no way to cite what it did not read. The limits above say where that stops.

| Concern | What Mission Zero does |
|---|---|
| **Our data must not leave our premises** | It runs where you run it: a Node script on your machine or your cloud, no server of ours in the loop. With an open-weight model (`muse-spark-open`, self-hosted or in your own Baseten account), the model stays with you too. The code is public: you can read every network call it makes (public sources and the model, nothing else). |
| **Our production must keep working** | It never touches the live site. Every fix is applied to a copy, your own vital journeys are replayed, one failure rejects the fix, the copy is rescanned, and what comes out is a patch your developers review and your pipeline deploys. Mission Zero proposes; a human applies. |
| **Our secrets must not reach a model** | A secret filter masks passwords, keys and tokens (`.env` lines, `define('X_PASSWORD', …)`, `password: '…'`, Stripe, AWS, GitHub, JWT, private keys) before every model call, and restores them only in the edits, in memory, for one call (`src/secrets.js`). The report says how many were masked. |
| **We need to prove what happened** | Every record of a run (findings, each repair, each patch, the report) is chained in a hashed journal (`chain.json`, sha256 of the file and of the previous link). `npm run verify-chain` recomputes it: an altered, removed or reordered record breaks the chain (`src/chain.js`). |
| **Does it know when it is wrong?** | Yes, and it says so: a fix that breaks a journey is rejected by Mission Zero itself, in the report, with the name of the journey it broke. |

What this repository does not claim: certifications (ISO 27001, SOC 2), a third-party pentest of the tool, contracts. Those come with the first large customer, not with a hackathon.

## Impact: the flaws of Maison Verde are the flaws we see in the wild

The fictional shop was not built at random. CRYPTOR.AGENCY's surface scanner (ARGUS, a passive read of a site's public home page and headers, nothing intrusive) has scanned 26 French business sites (prospects of the agency, scanned the way any visitor's browser reads a public page: one request to the home page, its headers and its HTML, no probing). It is a small sample, not a study, and no site is named anywhere; the figures are shares of those 26 sites, read in aggregate on 28 October 2026 and versioned as `examples/argus-aggregate.json` (counts only). The scanner itself predates the hackathon and is not part of this repository.

| Share of the 26 sites | Failing control | Maison Verde flaw it maps to |
|---|---|---|
| 81 % | no Content-Security-Policy | F01, security headers |
| 73 % | no anti-clickjacking header | F01 |
| 65 % | no X-Content-Type-Options | F01 |
| 62 % | no HSTS | F01 |
| 58 % | no resistance to automated attacks (rate limiting) | F07, weak authentication |
| 46 % | server reveals itself (Server, X-Powered-By) | F02, versions disclosed |
| 42 % | application version disclosed in the page | F02 |
| 27 % | no privacy policy | F15 |
| 23 % | mixed content over HTTP | F05, data over HTTP |
| 23 % | session cookies without Secure or HttpOnly | F08, insecure cookie |
| 19 % | cookies without SameSite | F08 |

Average score 56/100; 19 of the 26 sites scored C, D or F. Each of these flaws has a proposed, checked fix in the table above, at about ten cents a finding. That is the gap Mission Zero is built for: the fixes are known, cited and cheap; what is missing on most sites is someone who proposes them with proof and never breaks the shop.

## Business

Who pays: online shops and the agencies and hosts that run them, where the same 15 flaws come back site after site, and where a wrong fix costs more than the flaw. What they buy: a proven fix per finding, or the tool installed on their side, fed by the scanner they already have. CRYPTOR.AGENCY runs two production sites of its own where Mission Zero will be integrated first, after the hackathon; nothing of them is in this repository, and nothing in this repository predates 26 October 2026. We are open to a seed round and to a strategic partnership or acquisition by a platform player.

## Run it

```bash
cp .env.example .env            # add your MODEL_API_KEY (Meta Model API)
npm install
npm run check-key
npm test                        # 65 tests, no network, no model calls
node --env-file=.env src/run.js "your goal" 4 3     # 4 turns, 3 contradiction rounds
npm run demo                    # the 5 goals above, table + evidence
node bench/make-replay.js evidence/<folder>         # animated replay of a mission (one HTML file)
```

Real runs are committed in `examples/`: five research missions (`dbir-2025`, `gdpr-max-fine`, `nist-800-63b-4`, `cvss-v4`, `anssi-hygiene`), the self-reset (`back-to-zero`), the repair of the 15 flaws (`repair-maison-verde`, two runs with their patches and hashed journals, plus the `stories/` runs the video shows) and the raw outputs of the Meta tools (`meta-tools`). Open any `replay.html` in a browser to watch a mission or a repair replayed from its own evidence, or read the raw `journal.jsonl` and `repair.json`.

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
| `src/scanner.js` | 15 shop probes and 7 policy probes (F16 to F22), generic findings; a finding is rescanned by id or by type |
| `src/repair.js` | cited recommendation, exact edits on a copy, journeys replayed, inline-script policy control, rescan, unverified status, patch |
| `src/secrets.js` | secret filter before every model call, restored in the edits only |
| `src/chain.js` | hashed evidence journal of a run |
| `src/voice.js`, `src/vision.js`, `src/sam.js` | spoken goal (muse-voice-transcribe), pages looked at (Muse Spark vision), fields boxed (SAM 3.1) |
| `demo-site/` | Maison Verde, the flawed shop, its vital journeys and its 15 documented flaws |
| `bench/` | demo goals, A/B of the contradictor, replay generator, repair runner and report, chain check |
| `web/` | a side experiment from day one (anonymous community question, no personal data); not part of the judged product |
| `examples/` | committed real runs, replays, patches, hashed journals, Meta tool outputs, the anonymous scan aggregate, the real site read by another scanner (`real-site/`) |

## License

PolyForm Noncommercial 1.0.0: the code is readable and usable for research, study and evaluation (hackathon judging included). Any commercial use requires a license from CRYPTOR.AGENCY. Copyright (c) 2026 CRYPTOR.AGENCY.

The Official Rules of the Meta Global AI Developer Hackathon do not require an open-source license; they require a public repository during judging and grant Meta and its partners a perpetual, royalty-free license on the submission, which CRYPTOR.AGENCY accepted when it entered. That grant stands whatever the license above says. Third-party code and models are listed in `package.json` with their own licenses; no code from any earlier project of the company is in this repository.
