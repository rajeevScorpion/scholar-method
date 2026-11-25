# Scholar records: formats

Records are Markdown files with a small frontmatter block, kept in the visible `scholar/` folder of the research
repo. They are checked by `node $SCHOLAR validate`. Projects that already keep registers (sources, decisions,
status) keep their own IDs; Scholar records point at them.

## Frontmatter rules (a YAML subset)
- One `key: value` per line. No nesting, no multi-line values.
- Values are bare words, double-quoted strings (`"a title: with colon"`, JSON escapes allowed) or inline lists
  `[a, b, "c d"]`. An empty list is `[]`.
- Dates are `YYYY-MM-DD`.
- The file name is the ID: `scholar/insights/INS-0001.md`. IDs are allocated by `node $SCHOLAR new <type> --title "..."`
  (`INS-`, `CLM-`, `SRC-`, `VIS-`, four or more digits, never reused).

## Folder layout
```
scholar/
  scholar.json        machine config
  PROJECT_MAP.md      role -> file map for humans
  STATUS.md  HANDOFF.md  DECISIONS.md     only if the project has no equivalent
  insights/INS-0001.md   claims/CLM-0001.md   visuals/VIS-0001.md
  sources/SRC-0001.md    only if the project has no source register
  harvest/pending/HRV-<date>-<slug>.md   harvest/declined.md
```

## Harvest proposal
`harvest.mjs new` writes `scholar/harvest/pending/HRV-<date>-<slug>.md`. Frontmatter: `proposal_id, created, title,
source_project` (`generic`), `category` (rule, skill-fix, new-skill, research-gotcha, template), `problem,
observed_solution, generalisability, evidence_or_test, proposed_target` (a path in the method repo), `privacy_review`
(pending, passed), `privacy_hash` (set by `check --pass`; changes if the text is edited), `review_status` (proposed,
reviewed, accepted, declined), `owner_approval` (pending, yes, declined), `upstream_status` (not-submitted,
bundle-exported, `branch harvest/<id> (local, not pushed)`, submitted, merged). Declined items are one line each in
`scholar/harvest/declined.md`: `- date | id | title | reason`.

## scholar.json
`method_version`, `project` (`kind`: null until the scholar confirms, then thesis|journal-paper|conference-paper|article|review|book|proposal|other; `kind_source`: `detected-confirmed` or `owner-defined`; optional `description` in the scholar's own words; never written from detection alone), `citation` (below), `profile` (`writing_profile`: a profile name such as
`indian-academic-english`, a repo-relative path, or null; the only place a writing profile is selected),
`paths` (status, handoff, decisions, sources, bib, style_guide, drafts, assets, quarto, visual_ledger, asset_register,
boards, agents_md, claude_md, codex_agents; each a repo-relative path or null), `capture` (`batch|ask|off`), `harvest_outbox` (`tracked|ignored`),
`writing` (lint switches, below), `harvest` (`allow_domains`: public documentation domains a proposal may link to,
default none; `deny_terms`: words that must never appear in a proposal, such as title words, names, institution; set
at adoption), `related_projects` (empty unless the scholar opts in, naming each project), `external_ids` (IDs or citekeys that
live outside `scholar/`, for example the project's own register IDs; `init` fills it from IDs found in the mapped source register and visual ledger). Citekeys found in the mapped `.bib` file also
count as known.

### `citation` (style of in-text citations and the reference list)
New projects get the default below. Citations are written once as Pandoc citekeys; the style is the `csl:` file in the
project's Quarto or Pandoc config, so a style change swaps that file and never rewrites the text. Precedence: venue or
institution rules, then a decision the scholar recorded (with date and source, in the decisions file), then APA 7.
```json
"citation": {"style": "apa-7", "csl": null}
```
`style` is `apa-7`, `mla-9`, `chicago-author-date`, `chicago-notes`, `harvard`, `ieee`, `vancouver` or `custom` (the
official CSL file names are in the `cite` skill's `references/styles.md`). `csl` is null until a CSL file is set up in
the project, then the repo-relative path (`style.mjs use` writes both); `custom` needs it. `validate` checks the types
and warns on an unknown style id. Older projects may carry only `profile.citation_style` (free text); `citation.style`
wins when both exist. `style.mjs status` and the build preflight warn when no `csl:` is configured or it disagrees.

### `writing` (prose lint rules)
New projects get these defaults. They apply whether or not a writing profile is selected: a project turns a rule
off by editing the key, and a venue override is recorded in the decisions file as well. The profile stays opt-in
(`profile.writing_profile` null means none).
```json
"writing": {"no_dashes": true, "no_oxford_comma": true, "serial_comma": false, "spelling": "indian",
            "no_contractions": true, "ai_register": true, "protected_terms": []}
```
`spelling` is `indian`, `us` or `off`; `protected_terms` is a list of strings; the rest are booleans.
`validate` type-checks these and warns on unknown keys. Missing keys fall back to the defaults in `lint-prose.mjs`.

## Insight
Fields: `id, created, updated, title, kind, maturity, author_decision, evidence_status, rq, sources, claims, related`.

| Field | Allowed values |
|---|---|
| kind | observation, hypothesis, question, interpretation, objection |
| maturity | captured, explored, evidence-linked, applied |
| author_decision | pending, accepted, challenged, deferred, discarded |
| evidence_status | none, leads, partial, supported, contested |

`rq` holds research question labels (free text, for example `RQ1`). `sources`, `claims`, `related` hold record IDs,
bib citekeys or declared external IDs. Body sections, in order: **Faithful paraphrase**, **Scholar's words** (only if
the scholar designates a quote; verbatim), **Rival explanations**, **Evidence so far**, **Next test**.
Acceptance and evidence are separate: `accepted` with `evidence_status: none` is valid and means "the scholar
adopts this as a working position", not "this is verified".

## Claim
Fields: `id, kind, status, supports, challenges, rq, used_in`.

| Field | Allowed values |
|---|---|
| kind | source-statement, author-interpretation, hypothesis, data-result |
| status | unverified, metadata-checked, full-text-reviewed, claim-checked, approved-for-use |

`supports` and `challenges` list source IDs or citekeys, each optionally followed by a locator:
`"SRC-0003 p.12"`, `"smith2020 fig.2"`. `used_in` lists draft locations (free text). Body: the exact statement,
then notes. A source-statement keeps the source's meaning; an author-interpretation is the scholar's.

## Source (only when the project has no source register)
Fields: `id, citekey, type, title, authors, year, doi, url, accessed, read_status, rights, limitations`.
`read_status`: lead, abstract-only, metadata-checked, full-text-reviewed. Never fill `doi`, `year` or `authors`
from memory; copy them from the source or leave them empty.

## Visual sidecar
Fields: `id, status, purpose, kind, evidence_class, input_refs, source_status, question_links, transforms,
render_spec, limitations, assumptions, review_status, exports`.
`status`: exploratory, evidence-linked, approved, manuscript-ready. `input_refs`, `question_links`, `assumptions`
and `exports` are lists. `transforms` and `render_spec` are repo-relative paths to the script and spec that make the
figure. Keep concept sketches (`evidence_class: concept`) apart from empirical figures. Body: the caption and notes.
When the project already has a visual ledger or ID scheme, that ledger is the record and its IDs are reused; a
sidecar is only added for fields the ledger cannot hold (skill `visualise`, step 3).

## What `validate` checks
Parse errors and nesting; required fields; enum values; ID shape, uniqueness and file name; list fields are lists;
dates; links resolve (record ID, bib citekey, or `external_ids`). Warnings: a data-result claim resting on a
hypothesis insight; claim-checked or approved-for-use with no supports; an insight `applied` but not accepted; a
non-exploratory visual with no inputs.
