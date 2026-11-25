# Current state

**Updated:** 2026-11-25 · **Version:** 0.1.2 · public at https://github.com/rajeevScorpion/scholar-method

## Summary
Scholar Method is a scholar-led research companion: one Claude Code marketplace with four packs
(core, research, writing, publish; 16 skills) plus a Codex installer that copies the same skill folders.

## Working
- scholar-core: `scholar-contract`, `scholar-start`, `catch-up`, `check-out`, `harvest`, `forge`;
  `scholar.mjs` (init, doctor, validate, new, status); `harvest.mjs` (new, check, approve, decline, list, bundle,
  promote; never pushes); SessionStart hook (silent unless `scholar/scholar.json`; prints the CLI path).
- scholar-research: `reflect`, `research`, `evidence`, `analyse`, `visualise`; evidence graph (Cytoscape + Mermaid),
  Vega-Lite render with SVG export and VIS sidecars.
- scholar-writing: `draft`, `voice-review`, `cite`; opt-in voice profile; `lint-prose`, `fact-guard`,
  `check-citations`. scholar-publish: `build` (preflight), `submission-check`.
- `npm test` 71/71 pass; `claude plugin validate .` passes. Real `claude -p` continuity run recorded.
- `scholar start` names the project type (thesis, journal or conference paper, article, review, book, proposal, other) and waits for confirmation; real thesis detected as thesis (high).
- Thesis dry run done read-only (status identical before/after); write-up in gitignored `private/`.

## Open
- Quarto render and citation-style switching (CSL) not yet built or tested; thesis has no CSL file (renders Chicago, not APA 7).
- Codex continuity not run: local Codex 0.29.0 config fails to load (owner to update/fix).
- HTML viewers not opened in a browser; Mermaid parsed not rendered; Oxford-comma check is heuristic.
- One-command bundle install tested from a local path (isolated config); not yet from GitHub. Per-project approvals: `docs/OWNER-APPROVALS.md`.

## Next
Install the packs, then run `scholar start` inside the thesis repo (dry-run notes in `private/thesis-dry-run.md`).
