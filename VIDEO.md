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

## Final video (2 or 3 November, on the final version): the repair mode and the trust scenes

Decided on 28 October. The final video is NOT the research replay above alone: it must show the repair mode on the
flawed shop and the four trust points that let a large company run it, in this order, as live footage of real runs.

| Scene | On screen | Point made |
|---|---|---|
| Scan | the scanner's 15 findings on Maison Verde | any scanner can feed it (generic findings file, `--from=URL`) |
| Fix in under a minute | one finding → recommended fix with its verified primary source (green dots) → exact edits | proof, not a guess |
| Journeys | the 7 vital journeys replayed on the copy, all green, rescan: flaw gone | the service is never broken |
| The refusal | a fix that breaks the checkout journey → REJECTED by Mission Zero itself, nothing applied | an AI that says no to itself |
| Runs at the client | the open-weight model, the repository, the network calls (OWASP, NIST, MDN, nothing else) | their data never leaves their premises |
| Secrets and proof | the secret filter masking a key before the model call; the hashed evidence journal | nothing stolen, everything traceable |
| Patch out | the proposed fix as a patch for their own review and deployment | a human applies it |

Narration by the founder (own voice), 3 minutes. Build only on his word.

Added 28 October (afternoon), three more scenes for the final video, all from real runs:

| Scene | On screen | Point made |
|---|---|---|
| Spoken goal | the founder says the goal into the microphone; the WAV, the transcript, the cleaned goal, the mission starting | muse-voice-transcribe: talk to it |
| The look | after the F05 fix: journeys green, scanner silent, then Muse Spark looking at the checkout: « form is incomplete », SAM 5 fields → 2, fix REJECTED | vision catches what HTTP tests cannot |
| Back to zero | the agent's decision (rule, reason), its lessons archived by itself, the mission rerun knowing nothing, the two answers compared, the one kept | Mission Zero returns to zero by itself |
