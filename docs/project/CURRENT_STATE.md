# Current state

**Updated:** 2026-11-25 · **Version:** 0.1.0 (unreleased, local only, no remote)

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
- Thesis dry run done read-only (status identical before/after); write-up in gitignored `private/`.

## Open
- Codex continuity not run: local Codex 0.29.0 config fails to load (owner to update/fix).
- HTML viewers not opened in a browser; Mermaid parsed not rendered; Oxford-comma check is heuristic.
- No remote; nothing published. Approvals pending: see `docs/OWNER-APPROVALS.md`.

## Next
Owner reviews the framework and `private/thesis-dry-run.md`, then decides hosting and thesis adoption.
