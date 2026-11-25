---
name: voice-review
description: Review authored prose against the project's style guide and the opt-in writing profile, run the prose linter (dashes, Oxford comma, spelling, contractions, generic AI register), describe subjective concerns without rewriting unasked, and optionally run a Humanizer pass guarded by a before and after fact check. Use when the user says "voice review", "check my style", "lint this", "does this sound like AI", "make this read naturally", "humanize this", "polish this paragraph", "apply the style guide", or before a final pass on a chapter, abstract or paper.
---

# Voice review

Goal: the prose reads as the scholar's own, follows the right style rules, and says exactly what the evidence says.
You describe and flag; you do not rewrite unless asked. Ask means AskUserQuestion in Claude Code, a plain question in
Codex. Load `scholar-contract` first. `$SCHOLAR` is `scholar-start/scripts/scholar.mjs` (the session hook prints its
path in Claude Code). `$SKILL` is this skill folder (Claude Code: `${CLAUDE_PLUGIN_ROOT}/skills/voice-review`).

## 1. Find the rules (highest wins)
1. Read `scholar/scholar.json`: `profile.writing_profile` (a name such as `indian-academic-english`, or a path;
   null or absent means no profile), `paths.style_guide`, `paths.decisions`, and the `writing` object.
2. Order: venue or institution rules, project decisions, project style guide, the profile in
   `$SKILL/references/profiles/<name>.md`, Scholar defaults, Humanizer. Say in one line which layers apply.
3. No profile selected? Do not impose one. The `writing` lint defaults still apply (new projects carry them); a
   project turns a rule off by setting its key to false. The profile is opt-in; the lint defaults are not.

## 2. Lint (hard rules, report-only)
Run `node $SKILL/scripts/lint-prose.mjs <files> [--config scholar/scholar.json] [--strict]` on authored files
(`.md`, `.qmd`, `.txt`). Output is `file:line:col rule [severity] message | excerpt`. Severities: `error` (hard rule),
`likely` (heuristic, check by eye), `advisory` (generic AI register, the scholar decides). `--strict` exits 1 on
`error` and `likely`; `--json` gives machine output.
It skips YAML, code, block quotes, "quoted strings", citations, references sections, URLs, paths, comments and
Quarto syntax. Range dashes between digits are reported as `range-dash`. Report the findings grouped by rule;
fix nothing unless the scholar asks.

### `writing` keys in `scholar/scholar.json`
| Key | Default | Meaning |
|---|---|---|
| `no_dashes` | true | flag em dash, en dash, spaced `--`, digit-range dashes |
| `no_oxford_comma` | true | flag a likely comma before the final "and" or "or" of a list of three or more |
| `serial_comma` | false | the opposite: flag a likely missing comma ("A, B and C"); for venues that require it |
| `spelling` | "indian" | "indian" flags US spellings, "us" flags British ones, "off" disables |
| `no_contractions` | true | flag contractions in authored prose |
| `ai_register` | true | advisory flags for generic AI phrases (delve, landscape, robust, pivotal, transformative) |
| `protected_terms` | [] | extra words and phrases `fact-guard.mjs` must find unchanged |

### Venue overrides
A venue may require US spelling or the serial comma. Set the keys above AND add a line to the project's decisions
file with the date and the source (journal guideline section). Evidence controls never change with style:
`fact-guard.mjs`, `check-citations.mjs` and the contract stay as they are. The override applies to the files for
that venue only; say which.

## 3. Judgement review (describe, do not rewrite)
Read against the profile's rules 1 to 3 and 8 to 12. Report in short bullets, each with the line and why: inflated
claims, a mixed result stated as a confident one, hedges that vanished or appeared, repeated sentence patterns,
forced triplets, status and tense errors (ongoing work in the past tense), a claim with no visible support. Offer a
rewrite of one sentence only when the scholar asks. Never add uncertainty or errors to sound human.

## 4. Optional Humanizer pass (only if the scholar asks)
Humanizer is an editing assistant. It never outranks the contract or the venue, and it is not for evading AI
detection or hiding AI use a venue requires to be disclosed.
1. Check it is installed: `node $SCHOLAR doctor`. Only `blader-present` counts. `other-or-unverified` means a skill
   named humanizer from another source: say it is not blader's and do not call it. Absent: tell the scholar and point to
   the `scholar-start` approval flow. Never install anything yourself.
2. Choose the input: authored prose only. Never quotations, bibliography, data, tables, code or transcripts.
   Ask before touching approved prose in bulk.
3. Save a copy of the original, run Humanizer on the copy only, then run `fact-guard.mjs` with the original as
   `<before>` and the edit as `<after>`.
4. Reject or revise any edit that touches a name, number, date, unit, citation, quotation, term or claim, or breaks
   a style rule (re-run lint on the edit). Fact-guard output is a list to resolve, not a pass or fail by itself:
   a renamed pronoun is fine, a changed figure is not.
5. Show a before and after diff (`git diff --no-index before after`), the lint result and the fact-guard result.
   The scholar approves the replacement. Record the pass in the decisions or handoff file if they ask.

## 5. `fact-guard.mjs` (also for any manual editorial pass)
`node $SKILL/scripts/fact-guard.mjs <before> <after> [--json] [--strict]` compares protected items: numbers
(decimals, percentages, years), citekeys, author-date citations, quoted passages and block quotes, DOIs and URLs,
capitalised multi-word names and `protected_terms`. It reports LOST, ADDED and ALTERED (possible). Word-form
numbers ("three") and paraphrased claims are not detected: still read the diff.

## 6. Done means
Rules layer named, lint findings reported by rule, judgement notes given, nothing rewritten without a yes, and for
any edit a fact-guard result and a before and after diff shown.
