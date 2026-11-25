# Current state

**Updated:** 2026-11-25 · **Version:** 0.1.0 (unreleased, local only, no remote)

## Summary
Scholar Method is a scholar-led research companion: one Claude Code marketplace with four packs plus a Codex
installer. Stage 1 built scholar-core in full and the manifests for the other three packs.

## Working
- `scholar-core` skills: `scholar-contract`, `scholar-start`, `catch-up`, `check-out`, `harvest`, `forge`.
- `scholar.mjs`: `init --dry-run|--apply`, `doctor`, `validate`, `new`, `status`.
- SessionStart hook, silent unless `scholar/scholar.json` exists.
- `install/install.mjs` for Codex (project `.agents/skills`, global `~/.codex/skills` or `~/.agents/skills`).
- Tests: `node --test` (20 tests, synthetic thesis and paper fixtures). `claude plugin validate .` passes.
- Docs: README, ADOPT, NOTICE, CONTRIBUTING, CHANGELOG, ARCHITECTURE, ROADMAP.

## Open
- `scholar-research`, `scholar-writing`, `scholar-publish` have no skills yet.
- `harvest.mjs` (check, bundle) is planned; harvest steps are manual until then.
- Not yet tried on a real research repo; the first adoption needs a reviewed dry run on a copy.
- Humanizer provenance is best effort (plugin id or skills lock file).

## Next
Review Stage 1, then `harvest.mjs`, then scholar-research (see `docs/ROADMAP.md`).
