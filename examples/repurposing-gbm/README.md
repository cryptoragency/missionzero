# Glioblastoma: approved drugs never tested against this cancer

**For researchers. Not medical advice. Hypotheses, not treatments.**

Mission Zero read 673 PubMed abstracts on glioblastoma (the most aggressive brain cancer), noted every drug that showed an effect, checked which ones are already approved for another use, then searched the trial registries under every name of each drug. What is left are leads that a laboratory can test, never a recommendation for a patient.

## The funnel

| Step | File | Count |
|---|---|---|
| Abstracts read | `a-abstracts.json`, `a-items.json` | 673 studies, 366 drugs with an effect noted, sentence checked |
| Already approved for another use | `b-approved.json` | 211 with an official FDA label |
| Trials searched under every name | `c-trials.json` | 95 never tested against glioblastoma |
| Leads with single-drug evidence and brain exposure | `d-leads.json`, `e-strict.json` | 21 candidates |
| Human review (rule: a single-drug anti-glioblastoma result in animals or humans, and a quote saying the drug crosses the blood-brain barrier) | `f-human-review.json` | 9 kept |

The 9 leads: amlodipine, cariprazine, cimetidine, clemastine, fluvoxamine, lomitapide, moxidectin, ribavirin, stiripentol. Each comes with the exact sentence read on PubMed and its PMID.

## Caveats, written in the files

- moxidectin: the brain quote comes from a toxicity study, weak evidence of useful brain exposure;
- clemastine: a mouse glioma model was susceptible, no survival figure;
- cimetidine and lomitapide: effect shown in combination with temozolomide (standard care), not alone;
- the final check by Mission Zero (one full mission per drug: contradicting study, human trial under another name or registry, full paper) has not run yet (`final_check_pending` in `f-human-review.json`).

## What this is and is not

These are results in mice, not in humans. They are hypotheses for researchers and laboratories, with their page, so that anyone can read the same sentence. Nothing here is medical advice, a diagnosis or a treatment; Mission Zero never gives medical advice (see the main README).
