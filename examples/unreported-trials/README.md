# Unreported cancer trials: what Mission Zero found during the Meta hackathon

**Question.** Completed phase 3 cancer trials funded by industry, finished more than two years ago, with no results on
ClinicalTrials.gov: how many have their results public somewhere else, and how many have none that anyone can find?

**Answer (2 November 2026).** Of 607 such trials, Mission Zero found public results for 528, each with the page and an
exact quote checked on it. 56 cancer trials (10 947 participants registered) remained without any results it could find.
An independent audit of 15 of them confirmed 11 (73 %). Estimate: **about 40 phase 3 cancer trials, some 8 000
participants, whose results cannot be found anywhere public.** Model cost of the whole search: about $1.50 on Muse Spark.

This is a statement about what is publicly findable on that date, by the method below. It is not a statement that any
sponsor hid results: results may sit in a journal that blocks automated reading, a conference abstract, or a regulator's file.

## Method (rerunnable: `node bench/unreported-trials.js …`)

1. **Registry** (free): ClinicalTrials.gov API, condition "cancer", phase 3, industry lead sponsor, completed before
   31 October 2024, no results posted: 607 trials.
2. **By trial number** (free): the registry's own result references, PubMed (`[si]`, `[tiab]`), Europe PMC full text.
   470 found, 137 left.
3. **PubMed by drug + condition + phase III** (Muse Spark): the model reads the 5 best abstracts and must name the one that
   reports THIS trial with an exact quote; Mission Zero's `quoteProblem` rejects any quote not in the abstract. 6 found.
4. **Web, two rounds** (Muse Spark): trial number, acronym or drug + sponsor, sponsor code, exact official title. Registry
   copies are set aside; the chosen page is read (PDF included, Europe PMC abstract when the journal blocks robots) and the
   quote is checked again. A page that cannot be read is PROBABLE, never "not found". A failed search is recorded as such.
5. **Conservative cut**: trials outside oncology and trials with a EudraCT number (the EU register blocks automated reading)
   are left out of the final count.
6. **Independent audit**: 15 random "not found" trials searched by hand: `audit-2026-11-02.md`.

Files: `sample.json` (the 607, seed 20261102), `stage1.json`, `stage1b.json`, `stage2.json`, `stage3.json`, `stage3b.json`,
`stage4-euctr.json`, `audit-sample.json`, `audit-2026-11-02.md`. `test-300/` holds the first trial run.
