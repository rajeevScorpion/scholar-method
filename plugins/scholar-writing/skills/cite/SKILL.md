---
name: cite
description: Check claim-to-source support and citation integrity in a manuscript. Every citekey resolves in the mapped .bib, each cited claim has adequate verification status, quotations carry page locators, APA 7 is the default citation style (switchable, with a conversion mechanism) unless the venue says otherwise, no raw URLs sit in prose, and the references list matches the in-text citations. Use when the user says "check my citations", "verify the references", "are these citations right", "cite check", "does this source say that", "missing references", "clean up the bibliography", "citation style", "switch to MLA", "use IEEE", "convert my citations", "APA 7", or before a build or submission.
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
not citekeys. Author-date text citations typed by hand (no Pandoc keys) are not checked here: `style.mjs convert` finds them (section 3).

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

## 3. Citation style (APA 7 by default; the style is a setting, not a rewrite)
Write every citation once, as a Pandoc citekey (`[@key, p. 12]`, `@key`) with the source in the `.bib` or CSL-JSON.
The style is the `csl:` file in the project's Quarto or Pandoc config, so switching style means swapping that file:
the text does not change. Precedence: venue or institution rules, then a decision the scholar recorded, then APA 7.
Pandoc with no `csl:` falls back to Chicago author-date, which is not APA 7: never leave it unset.
Run `node $SKILL/scripts/style.mjs <command>` (zero dependencies; report-only unless `--apply`). Details: `references/styles.md`.

| Command | Does |
|---|---|
| `status --root .` | configured style, the CSL actually used, bibliography, Quarto; WARN when none or when they disagree |
| `use <style or file.csl> --root . [--apply]` | plan, or copy or fetch the CSL, set `csl:` in `_quarto.yml`, record `citation` in `scholar.json` |
| `fields <style> --root .` | per-style bib completeness (missing and recommended fields per entry); never fills anything |
| `convert --root . [files] [--apply]` | propose citekeys for hand-typed "(Smith, 2020)", "Smith (2020)" and "[3]" citations |
| `narrative --style <id> --root . [files]` | flag wording that depends on the style (report only) |
| `fetch <style> --root . --apply` | download an official CSL at the pinned commit |

Style ids: `apa-7` (bundled, default), `mla-9`, `chicago-author-date`, `chicago-notes`, `harvard`, `ieee`,
`vancouver`, or any `.csl` path the scholar supplies (stored as `custom`). Only `apa.csl` is bundled; the others are
downloaded on demand from the official CSL repository at a pinned commit, and only after the scholar says yes.

### Switching or converting, in order
1. Ask which style the venue or institution requires (journal guidelines, thesis regulations). If none is stated,
   APA 7 stays. Never switch on a hunch.
2. `status`, then `fields <target>`: show the gaps for the new style. Missing fields are for the scholar to fill from
   the source in hand; never from memory.
3. Hand-typed citations in the prose? `convert` (without `--apply`): show the proposal table (file:line, original,
   proposed, confidence, reason). `exact` items are safe; `likely`, `ambiguous` (two Smith 2020 entries need a/b) and
   `unmatched` are the scholar's call. Numeric `[3]` needs a numbered reference list to map; without one it is flagged only.
4. The scholar says yes: `convert --apply` (changes only `exact` items, skips quotes, code, YAML and the reference list,
   keeps line endings, writes a backup diff to `scholar/backups/`). Delete a hand-typed reference list afterwards.
5. `use <style> --apply` (fetch needs the scholar's yes first), then `narrative --style <id>` and give the scholar the list.
6. Run `check-citations.mjs`, render with the `build` skill, and compare the rendered text and reference list with the
   previous output. Look at the pages; a clean script run is not a visual check.
7. Record the decision with date and source (the journal's guidelines URL or the university rule) in the project's
   decisions file (`paths.decisions`), and update the status doc. The script never edits the decisions file.

## 4. Completeness
- Each reference should be complete and authentic: authors, year, title, venue, DOI or URL where it exists. Missing
  fields stay empty and are listed as gaps (`fields`). Never fill authors, years or DOIs from memory.
- The reference list should match the in-text citations: cited keys all present (error above), unused entries
  reviewed with the scholar (they may be background reading, not a deletion target).
- `[GAP: ...]` markers are legitimate in a draft and must be gone before a submission build (skill `build`).

## 5. Report
Group findings by file and severity, lead with errors, then say what could not be checked (unread sources, hand-typed
citations, `.bib` entries with missing fields). Offer fixes as a list; do not edit the manuscript or the `.bib`
unless the scholar says so. Edits to `.bib` entries need the source in hand.

## 6. Done means
The checker was run on the right files, every error has an owner or a fix, under-verified claims are either marked
as gaps or lifted by evidence, the style in use is the one the venue requires (or APA 7) and is recorded, and nothing
was invented.
