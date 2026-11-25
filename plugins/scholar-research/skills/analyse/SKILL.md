---
name: analyse
description: Transparent analysis of data the scholar supplied or is authorised to use. Inspects schema, units, ranges, missingness, duplicates, sample sizes, provenance and rights first, states the method and assumptions before any result, saves a reproducible script beside the data, reports negative and null results, never backfills missing observations or treats targets as observations, and labels outputs observed versus interpreted. Use when the user says "analyse", "analyze", "analyse this data", "what does this dataset show", "compare these coded artefacts", "run the numbers", "explore this survey", "tabulate", "cross-tab", "is there a pattern in", or supplies a CSV, spreadsheet or coded corpus and wants to know what it says.
---

# Analyse

Goal: the scholar learns what the data can and cannot say, by a method they can see and rerun. Analyse only
supplied or authorised data. No new collection, no contacting participants. Ask means AskUserQuestion in Claude
Code, a plain question in Codex. Scholar CLI (`$SCHOLAR`), found once: in Claude Code the session-start line
`Scholar CLI ($SCHOLAR): node "<path>"`; in Codex `scholar-start/scripts/scholar.mjs` beside the other Scholar
skills. Load `scholar-contract` first.

## 1. Before anything runs
1. Get the question: what the scholar wants to compare or learn, and which RQ or insight it serves. If none,
   offer `reflect`. A fishing trip needs the scholar's say-so and gets labelled exploratory.
2. Confirm the data is authorised: whose is it, its licence or consent terms, and whether it may sit in this repo.
   Participant, confidential or unpublished third-party data never goes to a public repo or a remote service
   without the scholar's yes and the project's ethics approval. Stop and ask if unclear.
3. Is the data actually available? A planned or target sample is not data. If the file holds targets, plans or
   predictions, say so and exclude them from observed counts.

## 2. Inspect (report this first, short)
4. Read the files and report: file names, format, rows and columns, column meanings and units (ask or read a
   codebook; do not guess), value ranges, date span, categories, missing values per column, duplicates (exact and
   near), sample size per group, odd values, and how the data was collected if recorded.
5. Flag what limits inference: small groups, empty cells, uneven coverage over time, convenience sampling, coding
   done by one person, mixed definitions. Empty cells stay empty and are named, never filled.
6. Provenance: record the source of the data and its date in the notes (or a source record).

## 3. State method and assumptions before results
7. Say what you will do and why this method suits this data (counts and proportions, cross-tabs, medians, a
   simple test, a trend over ordered periods). Prefer the simplest method that answers the question. State
   assumptions (independence, coding scheme, period boundaries, how ties and missing values are handled) and what
   would break them.
8. Ask before choices that change meaning (merging categories, dropping rows, excluding outliers, redefining
   periods). Record each such choice and its reason.

## 4. Run reproducibly
9. Use the project's own tools if present (an existing Python, R or Quarto pipeline, a notebook). Else write a
   small script beside the data: Node (`.mjs`, no dependencies) or Python with the standard library, reading the
   raw file and writing outputs to a separate folder. Never edit the raw data. Save the script, its inputs and the
   exact command. Fix seeds if anything is random. Name packages and versions used.
10. Outputs: a table (CSV or Markdown) and, if useful, a chart via skill `visualise`. Include `n` for every
    figure, units, and how missing values were handled.

## 5. Report
11. Two labelled parts. **Observed:** what the data show, with counts and the table. **Interpreted:** what the
    scholar or you suggest it means, marked as interpretation, with at least one rival reading. Never mix them.
12. Report negative and null results, empty cells, groups too small to compare and results that cut against the
    insight. A pattern is not a cause; co-occurrence is not influence. Do not smooth, drop or hide cases.
13. State uncertainty plainly (small n, one coder, convenience sample) and what extra data would settle it. Offer
    a claim record only for what the analysis actually shows (`data-result`, linked to the script) via skill
    `evidence`.

## 6. Preserve
14. Record the dataset, script, command, date and versions where the project keeps such notes (the visual sidecar
    for a figure, the mapped status for a method note). Update the insight's `evidence_status` only as far as the
    result supports, and let the scholar decide acceptance. `node $SCHOLAR validate`. Local commit only.

## Never
- Never backfill, interpolate or impute missing observations, and never turn a target or a prediction into an
  observation. Never invent a sample size, p-value or effect size.
- Never choose the method after seeing which one gives the nicer answer without saying so.
- Never present exploratory patterns as findings, or drop an inconvenient group.

## Done means
The scholar saw the data's limits before results, can rerun the script, can tell observed from interpreted, and
negative results are on the page.
