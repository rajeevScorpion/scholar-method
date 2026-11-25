---
name: cite
description: Check claim-to-source support and citation integrity in a manuscript. Every citekey resolves in the mapped .bib, each cited claim has adequate verification status, quotations carry page locators, APA 7 is the default unless the venue says otherwise, no raw URLs sit in prose, and the references list matches the in-text citations. Use when the user says "check my citations", "verify the references", "are these citations right", "cite check", "does this source say that", "missing references", "clean up the bibliography", or before a build or submission.
---

# Cite: citation integrity and claim-to-source checks

Goal: every citation is real, resolves, supports the sentence it sits in, and carries a locator where needed. You
check and report; you never invent or "repair" a reference from memory. Ask means AskUserQuestion in Claude Code, a
plain question in Codex. Load `scholar-contract` first. `$SCHOLAR` is `scholar-start/scripts/scholar.mjs`. `$SKILL` is this skill folder (Claude Code:
`${CLAUDE_PLUGIN_ROOT}/skills/cite`).

## 1. Run the checker
`node $SKILL/scripts/check-citations.mjs --root <repo> [--bib refs.bib] [--json] [--strict] [files...]`
Without files it scans `paths.drafts` from `scholar/scholar.json`, else every `.qmd` and `.md` in the repo. The `.bib`
is `paths.bib`, `--bib`, or a `bibliography:` line found in the front matter or `_quarto.yml`. Output is
`file:line:col rule [severity] message`.

| Rule | Severity | Meaning |
|---|---|---|
| `missing-key` | error | a Pandoc citekey (`@key`, `[@key, p. 3]`) is not in the `.bib` |
| `claim-unknown` | error | a `<!-- claims: CLM-xxxx -->` id has no record in `scholar/claims` |
| `claim-under-verified` | warn | the claim is below `claim-checked`; the paragraph needs a `[GAP: ...]` marker, not a citation |
| `quote-no-locator` | warn | a quotation of three or more words has no page, figure or section locator nearby |
| `raw-url` | warn | a URL in prose (keep links in the bibliography unless the venue wants them inline) |
| `challenge-unacknowledged` | advisory | a claim has a challenging source this paragraph does not cite |
| `unused-entry` | advisory | a `.bib` entry no scanned file cites (only meaningful when all manuscript files were scanned) |

It skips YAML, code, comments and the References section; Quarto cross-references (`@fig-x`, `@tbl-x`, `@sec-x`) are
not citekeys. Author-date text citations typed by hand (no Pandoc keys) are not checked: read them yourself.

## 2. Claim-to-source reading (the part a script cannot do)
For each sentence the scholar wants checked:
1. Find its claim record (`<!-- claims: ... -->` tags help). If none exists, say so; offer to create one with
   `node $SCHOLAR new claim --title "..."`.
2. Compare what the sentence asserts with what the source supports, using only what was actually read. Record the
   read status honestly (lead, abstract-only, metadata-checked, full-text-reviewed). An abstract or snippet is a lead.
3. A claim moves up (`claim-checked`) only when the scholar or the reading shows the cited source supports this
   exact sentence, with a locator. Never raise a status yourself from memory or from a title. Suggest it; the scholar
   confirms.
4. Opposing evidence: if the claim is challenged, the sentence should say so and cite it.
5. Cannot read the source? Say "not verified" and leave the claim unverified. Do not guess a page number.

## 3. Style and completeness
- APA 7 is the default unless the project or venue says otherwise (check `profile.citation_style`, the style guide and
  the venue's instructions). Integrate author-date citations in prose; DOIs and URLs belong in the bibliography.
- Each reference should be complete and authentic: authors, year, title, venue, DOI or URL where it exists. Missing
  fields stay empty and are listed as gaps. Never fill authors, years or DOIs from memory.
- The reference list should match the in-text citations: cited keys all present (error above), unused entries
  reviewed with the scholar (they may be background reading, not a deletion target).
- `[GAP: ...]` markers are legitimate in a draft and must be gone before a submission build (skill `build`).

## 4. Report
Group findings by file and severity, lead with errors, then say what could not be checked (unread sources, hand-typed
citations, `.bib` entries with missing fields). Offer fixes as a list; do not edit the manuscript or the `.bib`
unless the scholar says so. Edits to `.bib` entries need the source in hand.

## 5. Done means
The checker was run on the right files, every error has an owner or a fix, under-verified claims are either marked
as gaps or lifted by evidence, and nothing was invented.
