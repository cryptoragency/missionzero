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

## Run it

```bash
cp .env.example .env            # add your MODEL_API_KEY (Meta Model API)
npm install
npm run check-key
npm test                        # 24 tests, no network, no model calls
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
| `bench/` | demo goals, A/B of the contradictor, replay generator |
| `web/` | anonymous community page (one question, no personal data) |

## License

PolyForm Noncommercial 1.0.0: the code is readable and usable for research, study and evaluation (hackathon judging included). Any commercial use requires a license from CRYPTOR.AGENCY. Copyright (c) 2026 CRYPTOR.AGENCY.
