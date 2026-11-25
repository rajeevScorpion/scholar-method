# Changelog

## 0.1.3 (2026-11-25)
- Citation styles: APA 7 is the default; the style is the `csl:` setting, so switching style never rewrites the text.
  `scholar.json` gains `citation: {style, csl}` (new projects get `apa-7`; `validate` checks it; `profile.citation_style`
  is no longer written). New `cite/scripts/style.mjs`: `status`, `use` (dry run unless `--apply`), `fetch`, `fields`
  (per-style bib completeness), `convert` (hand-typed author-date and numeric citations to Pandoc citekeys, applies only
  exact matches, backup diff) and `narrative` (style-dependent wording, report only). Bundled `apa.csl` (CC BY-SA 3.0,
  pinned commit `f123868`); other styles are fetched on demand with the scholar's yes. `vancouver` maps to
  `nlm-citation-sequence`, the official repository's Vancouver style.
- Quarto: `scholar.mjs doctor` reports Quarto, its Pandoc, Typst and TinyTeX, PDF readiness, and the official install
  route when Quarto is missing (it never installs). `build` runs the doctor first. The build preflight warns when a
  bibliography has no CSL, the CSL file is missing, or it differs from `citation.style`.
- Tests: style helper tests, and real Quarto render tests (HTML, DOCX, Typst PDF; APA and IEEE) that skip with a message
  when Quarto is not installed. `SCHOLAR_NET_TESTS=1` adds a download test.
- scholar-core, scholar-writing, scholar-publish and the `scholar` bundle move to 0.1.3.

## 0.1.2 (2026-11-25)
- Project-type detection: after the first read, `scholar-start` says what it seems you are working on (thesis, journal or
  conference paper, article, review, book, proposal, other), asks you to confirm, correct or define it, then takes it ahead
  by kind (`references/project-kinds.md`). `scholar.mjs detect [--json]`; detection also appears in `init --dry-run` and
  `doctor --json`.
- `init --apply --kind <kind> [--describe "..."]` records `project.kind` and `kind_source` in `scholar.json`; without
  `--kind` it stays null. A confirmed kind is never overwritten. `--kind paper` still works (stored as `journal-paper`).
  `validate` type-checks `project`. `profile.kind` is gone from new configs.
- `catch-up` names the confirmed kind. scholar-core and the `scholar` bundle move to 0.1.2.

## 0.1.1 (2026-11-25)
- New `scholar` bundle plugin: `/plugin install scholar@scholar-method` installs all four packs through plugin
  dependencies (tested on Claude Code 2.1.318).
- `scholar-research`, `scholar-writing` and `scholar-publish` declare `scholar-core` as a dependency.
- Visuals reuse a project's existing ledger and ID scheme; Humanizer installs default to project scope.

## 0.1.0 (2026-11-25)
Marketplace `scholar-method` with four packs and 16 skills.

- **scholar-core:** `scholar-contract`, `scholar-start`, `catch-up`, `check-out`, `harvest`, `forge`.
  - `scholar.mjs`: `init`, `doctor`, `validate`, `new`, `status` (zero dependencies). `init` detects numbered folders,
    Markdown chapters, visual ledger, asset register and Excalidraw boards, writes default `writing` and `harvest`
    settings and fills `external_ids` from the project's own register. `validate` type-checks `writing`.
  - `harvest.mjs`: `new`, `check` (privacy scan), `approve`, `decline`, `list`, `bundle`, `promote`. Never pushes.
    `harvest-inbox/` receives proposals for the maintainer.
  - Session-start hook (Claude Code), silent unless the project has `scholar/scholar.json`; names pending harvest proposals.
  - `check-out` edits a project's own handoff in place instead of overwriting it.
- **scholar-research:** `reflect`, `research`, `evidence`, `analyse`, `visualise`; evidence graph builder and renderer
  (Vega-Lite, Cytoscape, Mermaid, Excalidraw template) with provenance sidecars; synthetic example in `examples/research`.
- **scholar-writing:** `draft`, `voice-review`, `cite`; prose linter, fact guard, citation checker; opt-in
  `indian-academic-english` profile; examples in `examples/writing`.
- **scholar-publish:** `build` (with preflight), `submission-check`.
- Codex installer `install/install.mjs` with ownership markers, collision refusal, update and uninstall.
- Tests (71) with synthetic thesis and paper fixtures, harvest and commission scenario tests.
- Docs: README, ADOPT, architecture (with suggested vs implemented), roadmap, adoption guides for a thesis and a paper,
  validation results, owner approvals list.
