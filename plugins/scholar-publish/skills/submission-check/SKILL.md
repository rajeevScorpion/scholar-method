---
name: submission-check
description: Walk the scholar through a pre-submission checklist for a journal, conference or university thesis, from the venue's actual instructions rather than assumptions. Covers format rules, AI-use disclosure, ethics and consent statements, figure rights, data availability, reference completeness, word and page limits, anonymisation for review and overlap with the scholar's other publications. Use when the user says "submission check", "ready to submit?", "pre-submission checklist", "check against the journal guidelines", "before I submit", "thesis submission requirements", or "can I send this to the venue".
---

# Submission check

Goal: no avoidable rejection or integrity problem at the door, and every answer taken from the venue's own words. You
never assume a rule. Ask means AskUserQuestion in Claude Code, a plain question in Codex. Load `scholar-contract`
first. `$SCHOLAR` is `scholar-start/scripts/scholar.mjs`. The item list is `references/checklist.md` in this skill folder.

## 1. Get the real instructions
1. Which venue, which article type, which deadline? Check the mapped status, decisions and handoff first; ask only
   for what is missing.
2. Get the venue's actual author instructions or university regulations. If the scholar pastes them or gives a file,
   read it. If only a URL is given and you can fetch pages, fetch it; otherwise ask the scholar to paste the relevant
   sections. Say which version and date you read. Never fill a rule from memory of "how journals usually work".
3. Venue rules outrank project decisions, the style guide and the profile. Where a venue rule changes a lint setting
   (US spelling, serial comma), record it in `scholar/scholar.json` `writing` and in the decisions file (see skill
   `voice-review`). Evidence controls never change with style.

## 2. Run the checks that exist
In order, from the repo root, and keep the output:
1. Build preflight with `--submission` (skill `build`): no `[GAP:` markers, figures approved.
2. `lint-prose.mjs` (skill `voice-review`) with the venue's settings, and `check-citations.mjs --root . --strict` (skill
   `cite`).
3. `node $SCHOLAR validate`.
These cover only part of the list. The rest is by reading, below.

## 3. Work the checklist
Open `references/checklist.md` and go item by item. For each: Pass, Fail, Not applicable or Unknown, with the venue
rule quoted (short) and where in the project the evidence is. Do not mark Pass from memory; read the manuscript or the
record. Group the answer:
- **Blockers** (must fix before submitting), **Needs the scholar** (a decision, a document, a signature),
  **Fine**.

## 4. Things only the scholar can supply
Never write these yourself, and never imply they are done unless the project records show it: ethics approval and
consent statements, permissions for third-party figures, funding and conflict-of-interest statements, data and code
availability statements and repository DOIs, author contributions, the AI-use disclosure, the cover letter.
Draft a statement only if the scholar asks (skill `draft`), and only from facts they have given.

## 5. AI-use disclosure
Read the venue's AI policy and the institution's. State what AI assistance was used in this project (from the
scholar's own account and the project records), compare with what the policy requires disclosed, and list the gap.
Humanizer or editing tools are covered by the same policy. Do not advise hiding or minimising use that must be
disclosed. The wording of the disclosure is the scholar's.

## 6. Overlap with other publications
Use the reuse record (skill `draft`, section 6) and the scholar's list of related papers and the thesis. Flag verbatim
or near-verbatim reuse, reused data, figures and analyses, and whether the venue's prior-publication and preprint rules
allow them. The scholar decides what to cite and disclose.

## 7. Report and next steps
Return the grouped checklist, the script output, and a short list of decisions needed. Offer to fix what is fixable
(formatting, gaps, locators) as proposals. Do not submit, upload, email or share anything: those need the scholar's
explicit yes and are done by them.

## 8. Not yet
Planned for later releases, not built: a format check against a specific publisher template, and a publication map
across the scholar's papers. Say so if asked; do not improvise them.

## 9. Done means
Venue instructions read and dated, every checklist row answered with evidence, blockers and decisions listed, nothing
assumed, nothing sent.
