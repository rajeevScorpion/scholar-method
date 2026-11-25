---
name: draft
description: Turn the scholar's approved argument and verified claims into proposed manuscript prose, only when the scholar asks or approves. Evidence-gated, so anything weaker than claim-checked becomes a visible gap marker, never a plausible citation. Also covers reviewer and revision responses with a traceable change list, and reuse or self-plagiarism provenance between a thesis and papers. Use when the user says "draft this", "write this paragraph", "turn these claims into text", "propose a paragraph", "respond to the reviewers", "revise this section", "reuse text from my thesis", or asks for a first version of any section.
---

# Draft (evidence-gated, scholar-approved)

Goal: prose that carries only what the records support, written as a proposal the scholar can accept, edit or refuse.
Writing is a support capability, not the point of the work. Ask means AskUserQuestion in Claude Code, a plain question
in Codex. Load `scholar-contract` first. `$SCHOLAR` is `scholar-start/scripts/scholar.mjs`.

## 0. Gate: is drafting wanted?
1. Draft only when the scholar asks or approves. A discussion is not a request. If unsure, ask one question:
   "Shall I propose a paragraph from these claims, or keep talking it through?" Recommended default: keep talking.
2. Substantive drafting needs approval of the argument first: the claim, its place in the argument and the
   rival explanation the scholar wants kept. Do not adopt an interpretation as their position yourself.
3. Never overwrite approved prose in bulk. Work in a new file, a branch or a clearly marked proposal.

## 1. Gather (read records, not guesses)
1. `scholar/scholar.json` for the role map, then the relevant `scholar/claims/CLM-*.md` (status, supports,
   challenges), the source register or `.bib`, and the mapped style guide and profile (see `voice-review`).
2. `node $SCHOLAR validate`. Fix nothing silently; report errors that block drafting.
3. Build a table: claim, kind, status, supporting sources with locators, challenging sources.

## 2. Evidence gate
| Claim status | What the draft may do |
|---|---|
| `claim-checked`, `approved-for-use` | State it, cite it with the locator from `supports`, acknowledge any `challenges`. |
| `unverified`, `metadata-checked`, `full-text-reviewed` | No assertion, no citation. Leave `[GAP: CLM-0004 unverified]` (id, status, what is missing). |
| `hypothesis` or `author-interpretation` | Write it as the scholar's interpretation or a hypothesis, in their words if designated. |
| `data-result` | Only if data and procedure are documented as done. A plan or target is written as a plan. |
- Never write a plausible citation, page, DOI, quotation or number to fill a gap. A gap marker is the correct output.
- Keep three voices distinguishable: **source statements** (cited, the source's meaning), **scholar interpretation**
  (marked as the author's), **assistant suggestions** (listed outside the prose, as options, never in it).
- Cite opposing sources where the claim is contested. Do not turn a mixed result into a confident one.
- Status and tense: ongoing work stays ongoing.

## 3. Four passes (from the writing contract)
1. **Claim pass.** Is each claim supported and suitably qualified? Are the sources real and actually read? Which
   competing explanation matters? Output the gaps before any prose.
2. **Argument pass.** Does the paragraph make one point, develop it and show its evidence or limit? Is it
   consistent with the research question and neighbouring sections?
3. **Voice pass.** Apply the style guide and profile through `voice-review`. Humanizer only if installed, approved
   and run through that skill's guard.
4. **Final pass.** Run `check-citations.mjs` (skill `cite`) and `lint-prose.mjs`; check status and tense and that
   every figure mentioned is approved.
Tag each paragraph for the checkers: `<!-- claims: CLM-0001, CLM-0002 -->`.

## 4. Present as a proposal
Show the proposed text (or a diff against the existing section) plus: the claim table, the gaps, anything cut or added
and why, and the assistant suggestions kept apart. Ask the scholar to accept, edit or refuse. After acceptance:
1. Write into the project file the scholar names. Update each used claim's `used_in` (file and paragraph).
2. Note the pass in the mapped status or handoff doc. Commit locally if the scholar wants.

## 5. Reviewer and revision responses
1. Make a table of every reviewer point (R1.2, R2.1 ...): the point, the scholar's decision (accept, partly accept,
   rebut), the change made (file, location) and the evidence. Draft only after the scholar has decided each row.
2. Every claimed change must exist in the manuscript. Diff the revision against the submitted version and check each
   row against it; list changes not tied to a reviewer point.
3. New evidence or analysis in a response is the scholar's to supply. Never invent a completed analysis, a new
   sample or a citation to satisfy a reviewer. Missing support is a gap marker and a note to the scholar.
4. Output: the response letter draft and the traceable change list. Tone is polite and specific; disagree with evidence.

## 6. Reuse and self-plagiarism provenance
When text, data, figures or analyses move between a thesis and papers (or between papers):
1. Record each reuse as a row in the mapped decisions or status file: source file and section, destination, what is
   reused (verbatim, adapted, data, figure), the new contribution and the venue's overlap policy.
2. Prefer rewriting to copying; cite the earlier work where the venue wants it. Flag verbatim overlap for the scholar.
3. `submission-check` (skill in `scholar-publish`) uses this record for the overlap item.

## 7. Done means
Proposal shown, gaps visible, nothing invented, nothing overwritten, approved text placed where the scholar said,
`used_in` updated, and `validate` still clean.
