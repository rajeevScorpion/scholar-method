# Changelog

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
