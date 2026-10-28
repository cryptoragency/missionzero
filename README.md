<p align="center"><img src="assets/logo.png" alt="CRYPTOR.AGENCY" width="160"></p>

# Mission Zero

**Give it a goal. Let it discover the path. Demand proof.**

Mission Zero is an autonomous research agent that refuses to take its own word for it. You give it an objective. It has no plan and no answer. It forms hypotheses, searches, reads whole primary documents (117-page PDFs included), evaluates itself after every move, pivots when it fails, and writes an answer **only from what it actually read**. Then a verifier re-reads every cited page and demands an exact quote, a contradictor attacks the answer, a judge scores each version, and only the best one survives.

Every step is written to an evidence folder you can open: journal, memory, final answer, verdicts, quotes.

Startups track · CRYPTOR.AGENCY · Meta Global AI Developer Hackathon 2026 · built on the Meta Model API (`muse-spark-1.3`)

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
| 4 | Latest CVSS version, year, Critical range (first.org) | **10 / 10** | 3 | $0.041 |
| 5 | ANSSI *Guide d'hygiène informatique*: 42 measures, "Version 2.0 - Septembre 2017" from the PDF footer | **10 / 10** | 4 | $0.084 |

Every figure is green: confirmed by an exact quote from the primary page. Scores vary between runs because web search does: in one run of goal 1 the search returned the public-sector snapshot instead of the full report, and the judge gave 5 / 10 for citing the wrong document. That honesty is the point. Reproduce with `npm run demo`; each run writes its own evidence folder.

## Repair mode: from a scanner's finding to a proven fix, never applied by the agent

The same loop, pointed at code. A scanner (any scanner: the input is a generic JSON file, or a URL) reports the flaws of a website. For each finding, Mission Zero:

1. **researches the fix** from primary sources (OWASP, MDN, NIST, PCI DSS, IETF) with the verifier and the judge, and caches the recommendation by flaw type (the second site with the same flaw costs nothing);
2. **proposes exact edits** to the code (find/replace, each `find` must occur exactly once or the edit is refused);
3. **applies them to a copy** of the site, never to the site itself;
4. **replays the vital journeys** on the copy (browse, search, add to cart, check out, log in, follow my own order, legal page): one broken journey = the fix is **rejected**;
5. **rescans the copy**: the flaw must be gone, or the fix is **ineffective**;
6. writes the fix as a **patch** for a human to review and apply, plus a readable report.

The target in this repository is Maison Verde (`demo-site/`), a fictional shop built with the 15 flaws scanners find on most e-commerce sites (`demo-site/FLAWS.md`). It runs locally only.

```bash
npm run repair -- demo-site/findings.example.json          # the 15 findings, one proposed fix each
npm run repair -- --scan                                   # scan the demo shop first, then repair
npm run repair -- --from=https://scanner.example/findings  # any scanner's URL (MZ_SCANNER_URL / MZ_SCANNER_KEY in .env)
npm run repair-report -- evidence/repair-<date>            # one readable page per run
npm run verify-chain -- evidence/repair-<date>             # recompute the hashed evidence journal
```

### Results on Maison Verde (28 October 2026, 2 research turns, 1 contradiction round, 1 retry)

| # | Flaw | Status | Fix proposed (the model's own summary) | Sources verified |
|---|------|--------|----------------------------------------|------------------|
| F11 | .env served with secrets | proposed | deny dotfiles, rotate every secret | 2 green |
| F05 | card data over HTTP | proposed | no card form in the shop, payment delegated to a certified provider | 4 green |
| F09 | admin trusts a guessable cookie | proposed | random server-side session issued after login, validated on /admin | 2 green |
| F13 | customer export without auth | proposed | admin session required on /export/customers.csv | 2 green |
| F03 | reflected XSS | proposed | output escaped on search, checkout echo and 404 | 1 green |
| F04 | price trusted from the client | proposed | price looked up server-side by product id | 2 green |
| F06 | IDOR on /order | **rejected, then proposed** | 1st fix required an admin session and broke « follow my own order »; 2nd fix: ownership (customer cookie matching the order's e-mail) or admin, else 403 | 2 green |
| F07 | weak authentication | proposed | generic error, rate limit with 429, failures logged | 3 green |
| F12 | backups listed | proposed | directory listing off, backup files 404 | 2 green |
| F01 | no security headers | **cut, then proposed** | 1st answer was truncated by the token cap (raised); 2nd: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP frame-ancestors | 5 green |
| F08 | insecure session cookie | proposed | Secure, HttpOnly, SameSite=Strict | 3 green |
| F14 | jQuery 1.8.3 | **proposed, but see limits** | the vulnerable file is no longer served: a removal, not an update. The scanner cannot tell the difference, a reviewer can | 2 green |
| F15 | no privacy policy | proposed | privacy notice on the legal page, linked from the checkout | 3 green |
| F02 | versions disclosed | proposed, weak justification | Server and X-Powered-By removed | 0 green, 2 red |
| F10 | robots.txt lists sensitive paths | proposed | sensitive Disallow entries removed | 3 green |

15 findings, 15 fixes proposed, 7/7 vital journeys green after every proposed fix, every copy rescanned clean. 17 attempts, 194 model calls, **$1.10 in total** (about 7 cents per finding). Every proposed fix is a patch in its evidence folder. The merged report page of the 15 findings and the last run (F01, F06) with its patches and its hashed journal are in `examples/repair-maison-verde/`: open `report.html`, and check the journal with `npm run verify-chain -- examples/repair-maison-verde` (6 records, intact).

## Meta tools, each where it earns its place

| Tool | Where | Why there and not elsewhere |
|---|---|---|
| `muse-spark-1.3` (text, reasoning) | every role: planner, evaluator, writer, verifier, contradictor, judge, repairer | one model, one effort level per role (`reasoning_effort`): the cost finding of this project |
| `muse-voice-transcribe-1.0` (speech to text) | `npm run voice -- recording.wav --run`: a goal spoken into a microphone becomes the mission's goal (`src/voice.js`) | the first thing a founder does with an agent is talk to it; the WAV is resampled to mono 16 kHz with ffmpeg when needed, the wake name and stutters are dropped |
| `muse-spark-1.3` (vision) | `--vision` in repair mode: after a fix passes the journeys and the rescan, the repaired pages are screenshotted headless and shown to the model as a customer sees them (`src/vision.js`) | an HTTP assertion is blind: a blank page or a vanished product grid returns 200. The model answers « ok / problems / seen » and a « not ok » rejects the fix |
| `sam-3.1` (segmentation) | same `--vision` step: SAM boxes the text fields of the finding's page before and after (`src/sam.js`) | visual evidence a reviewer understands in one glance: the card form had 5 fields, the fixed page has 2. Concepts must be visual (« form », « text input field », « button »): « credit card form » finds nothing |
| Muse Spark open weights (Baseten) | `MZ_BASE_URL` + `MZ_MODEL` switch the whole system to the open-weight model on any OpenAI-compatible endpoint (`src/meta.js`) | the trust promise « the model stays with you » needs the open weights; same requests, same prompts, prices per provider |

First real measurements (28 October): voice, an 11-second goal transcribed in 3.0 s; vision, two pages read correctly for $0.005; SAM, « form » 1 box, « text input field » 5 boxes, « button » 1 box on the checkout page, under 2 s each.

What vision caught that HTTP tests did not (28 October, `--vision` on F05): the model's fix removed the card inputs and left their labels. The 7 journeys were green, the scanner was silent, and Muse Spark looking at the page said « payment page form is incomplete: 'Numéro de carte', 'Expiration', 'Cryptogramme' appear as text with no visible input fields ». SAM counted 5 text fields before, 2 after. The fix was **rejected**. On F03, the same look confirmed the escaped `<script>` shown as plain text with no popup. The two looks cost $0.01.

## Mission Zero returns to zero by itself

An agent that learns can learn wrong. Mission Zero keeps a ledger of its missions (`memory/outcomes.json`: judge score, verified sources, lessons used) and, after every mission, decides whether its own memory is hurting it. Three rules, all explainable in one sentence:

- **A.** two bad missions in a row (judge under 7) while lessons were applied;
- **B.** the same goal scored at least 2 points higher before, with fewer lessons: the memory made it worse;
- **C.** drift: the last three missions average 2 points under the three before.

When a rule fires, the agent **archives its lessons itself** (`memory/archive/lessons-<date>.json`, never deleted), writes the rule and the reason in `memory/resets.json` and in the journal, **runs the mission again knowing nothing** (`evidence/<run>/from-zero/`), compares both answers (judge score, then verified sources, then contradicted ones), keeps the better one, and relearns from that one only. `zero.json` holds the comparison. No human presses the button; `MZ_ZERO=off` disables it, `--from-zero` forces it for an experiment (marked « forced », never presented as a natural reset).

First real run (28 October, forced for the experiment, DBIR 2025 goal, 3 turns, 1 round): the agent archived its 30 lessons, ran again knowing nothing, and both answers were identical, 10/10, the 60 % human element quoted from the report. With memory: $0.031. From zero: $0.054, 75 % more: both took 2 turns, the difference is in what was read and written (the first turn scored 4/10 with memory and 8/10 from zero, so the lessons did not even help the first move here). Verdict written by the agent: « same result either way: the memory did no harm », memory restored. The run and its replay are in `examples/back-to-zero/`. A natural reset (rules A, B or C) has not fired yet; when one does, it will be shown as it happened, never staged.

## Known limits (read before trusting a « proposed » fix)

We would rather list these ourselves.

1. **The scanner judges the symptom, not the cause.** « Flaw gone » means the probe no longer fires. For F14 the model stopped serving jQuery 1.8.3 instead of updating it; the probe is satisfied, the shop lost its library. The patch and the model's own summary are in the report so a reviewer sees it; the prompt asks for the cause over hiding, and this is the first thing to harden.
2. **The justification is not always strong.** « Proposed » proves that the journeys pass and the probe is silent on the copy; it says nothing about the quality of the cited fix. The judge scores each recommendation out of 10 and the report shows it: on the 28 October run, 6 of the 15 recommendations scored under 7 (F02: 0 verified source, 2 contradicted; F05: secondary sources, because the PCI DSS standard itself sits behind a registration form; F15: one contradicted source; F09, F10, F12: thin). The report flags them « weak justification ». Read the sources before applying.
3. **The vital journeys are the customer's.** A journey that is not written cannot protect anything. Maison Verde has 7; a fix that broke something outside them would pass. In a real deployment the customer's test suite is the journeys file.
4. **The demo shop is small and fictional.** One `server.js`, 14 000 characters sent to the model per file. A real site needs the files chosen (`files` option) and the edits reviewed in context; the exact-string rule refuses ambiguous edits but cannot judge design.
5. **The secret filter is pattern-based.** It masks the usual shapes (`.env` lines, `password=`, `define('X_PASSWORD'…)`, Stripe, AWS, GitHub, Google, Slack, JWT, private keys, bearer tokens). A secret that looks like nothing (the demo's static `session=admin-7c9e` cookie value, for instance) goes through. The report says how many were masked, not that none remained.
6. **The hashed journal proves integrity, not identity.** It shows that no record changed since the run; it does not sign who ran it. A signature (the customer's key) is the next step.
7. **One model does everything.** Muse Spark plans, writes, verifies, contradicts, judges and repairs; there is no second model and no human until the end. The verifier demands an exact quote from the cited page, which limits what the writer can invent, but the chain is still one model checking itself.
8. **Costs are measured on `muse-spark-1.3` with reasoning**; the open-weight variant has not been benchmarked yet.

## Trust: built for companies that cannot afford a mistake

Mission Zero does not ask to be trusted. It is built so that it cannot steal, cannot break and cannot lie.

| Concern | What Mission Zero does |
|---|---|
| **Our data must not leave our premises** | It runs where you run it: a Node script on your machine or your cloud, no server of ours in the loop. With an open-weight model (`muse-spark-open`, self-hosted or in your own Baseten account), the model stays with you too. The code is public: you can read every network call it makes (public sources and the model, nothing else). |
| **Our production must keep working** | It never touches the live site. Every fix is applied to a copy, your own vital journeys are replayed, one failure rejects the fix, the copy is rescanned, and what comes out is a patch your developers review and your pipeline deploys. Mission Zero proposes; a human applies. |
| **Our secrets must not reach a model** | A secret filter masks passwords, keys and tokens (`.env` lines, `define('X_PASSWORD', …)`, `password: '…'`, Stripe, AWS, GitHub, JWT, private keys) before every model call, and restores them only in the edits, in memory, for one call (`src/secrets.js`). The report says how many were masked. |
| **We need to prove what happened** | Every record of a run (findings, each repair, each patch, the report) is chained in a hashed journal (`chain.json`, sha256 of the file and of the previous link). `npm run verify-chain` recomputes it: an altered, removed or reordered record breaks the chain (`src/chain.js`). |
| **Does it know when it is wrong?** | Yes, and it says so: a fix that breaks a journey is rejected by Mission Zero itself, in the report, with the name of the journey it broke. |

What this repository does not claim: certifications (ISO 27001, SOC 2), a third-party pentest of the tool, contracts. Those come with the first large customer, not with a hackathon.

## Business

Who pays: online shops and the agencies and hosts that run them, where the same 15 flaws come back site after site, and where a wrong fix costs more than the flaw. What they buy: a proven fix per finding, or the tool installed on their side, fed by the scanner they already have. The loop behind it is already deployed in production on two sites by CRYPTOR.AGENCY; Mission Zero is the public, from-scratch version built for this hackathon. We are open to a seed round and to a strategic partnership or acquisition by a platform player.

## Run it

```bash
cp .env.example .env            # add your MODEL_API_KEY (Meta Model API)
npm install
npm run check-key
npm test                        # 62 tests, no network, no model calls
node --env-file=.env src/run.js "your goal" 4 3     # 4 turns, 3 contradiction rounds
npm run demo                    # the 5 goals above, table + evidence
node bench/make-replay.js evidence/<folder>         # animated replay of a mission (one HTML file)
```

Two real runs are committed in `examples/` (DBIR 2025, CVSS v4): open `replay.html` in a browser to watch the mission replayed from its own evidence, or read the raw `journal.jsonl`.

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
| `src/meta.js` | Meta Model API client, reasoning effort per role, daily ledger |
| `src/scanner.js` | 15 probes, generic findings (any scanner can replace it) |
| `src/repair.js` | cited recommendation, exact edits on a copy, journeys replayed, rescan, patch |
| `src/secrets.js` | secret filter before every model call, restored in the edits only |
| `src/chain.js` | hashed evidence journal of a run |
| `src/voice.js`, `src/vision.js`, `src/sam.js` | spoken goal (muse-voice-transcribe), pages looked at (Muse Spark vision), fields boxed (SAM 3.1) |
| `demo-site/` | Maison Verde, the flawed shop, its vital journeys and its 15 documented flaws |
| `bench/` | demo goals, A/B of the contradictor, replay generator, repair runner and report, chain check |
| `web/` | anonymous community page (one question, no personal data) |

## License

PolyForm Noncommercial 1.0.0: the code is readable and usable for research, study and evaluation (hackathon judging included). Any commercial use requires a license from CRYPTOR.AGENCY. Copyright (c) 2026 CRYPTOR.AGENCY.
