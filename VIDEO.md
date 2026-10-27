# Demo video (3 minutes)

The video is the animated replay of one real mission (`bench/make-replay.js`), recorded headless and narrated.
Nothing is staged: every figure on screen comes from the evidence folder of that run.

Build it: `node video/make-video.cjs evidence/<folder>` → `video/out/mission-zero-demo.mp4` (needs ffmpeg on PATH).
The narration text is in `video/narration.json`; replace the synthetic voice by recording the same text.

## Script

| Scene | On screen | Narration |
|---|---|---|
| Intro | title card | Mission Zero. Give it a goal. Let it discover the path. Demand proof. |
| Goal | the goal, constraints | The goal: Verizon DBIR 2025, confirmed breaches and human element, cite the report. No plan, no answer, public sources only, no spending. |
| Turn 1 | hypothesis → web search → 8 results → score 3, pivot | It forms a hypothesis and searches. It finds the report: a 117-page PDF. The evaluator is strict: 3/10. It pivots. |
| Turn 2 | read_page on the PDF, 117 pages, 263 887 characters → score 2 | It reads the whole PDF and keeps only the passages that match what it is looking for. Still not enough. Lesson stored. |
| Turn 3 | search → 12,195 confirmed → score 5 | A search confirms 12,195 breaches, not the human element. Every turn ends with a lesson, reused on the next mission. |
| Turn 4 | read_page with find "human element" | Back to the PDF with a sharper question. Both figures have now been seen in the report itself. |
| Draft | the answer typed out, 2 sources | The writer drafts from what was seen. A page never read cannot be cited. |
| Verification | 2 claims, dots turn green, quotes | The verifier re-reads each page and demands an exact quote. Red would cap the score at 5. |
| Contradictor | 0 rounds, "no real flaw" | A contradictor attacks, a judge scores, the best version is kept. Nothing to rewrite, nothing to pay for. |
| Result | 10/10 · 2 green · $0.059 | 12,195 breaches, 60 % human element. Judge 10/10. Cost: six cents. |
| Outro | repo, Muse Spark, reasoning effort per role | Built during the hackathon on Muse Spark. A mission costs 4 to 17 cents. Proof, not promises. |

## Judging criteria covered

- **Impact**: an agent whose answers come with quotes from primary sources, at cents per mission.
- **Meta tools**: Meta Model API, `muse-spark-1.3`, `reasoning_effort` per role (the cost finding).
- **Technical depth**: self-evaluation loop, goal-targeted PDF reading, verifier with mandatory quote, contradictor and judge, daily budget ledger, 24 tests.
- **Demo**: a real run, replayed from its own evidence.
