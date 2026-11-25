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
  harvest/pending/  harvest/declined.md
```

## scholar.json
`method_version`, `profile` (`kind` thesis|paper|review|unset, `citation_style`, `writing_profile` path or null),
`paths` (status, handoff, decisions, sources, bib, style_guide, drafts, assets, quarto, agents_md, claude_md,
codex_agents; each a repo-relative path or null), `capture` (`batch|ask|off`), `harvest_outbox` (`tracked|ignored`),
`related_projects` (empty unless the scholar opts in, naming each project), `external_ids` (IDs or citekeys that
live outside `scholar/`, for example the project's own register IDs). Citekeys found in the mapped `.bib` file also
count as known.

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

## What `validate` checks
Parse errors and nesting; required fields; enum values; ID shape, uniqueness and file name; list fields are lists;
dates; links resolve (record ID, bib citekey, or `external_ids`). Warnings: a data-result claim resting on a
hypothesis insight; claim-checked or approved-for-use with no supports; an insight `applied` but not accepted; a
non-exploratory visual with no inputs.
