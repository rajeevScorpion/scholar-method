# Changelog

## 0.1.0 (unreleased)
- Marketplace `scholar-method` with four packs: scholar-core, scholar-research, scholar-writing, scholar-publish.
- scholar-core: skills `scholar-contract`, `scholar-start`, `catch-up`, `check-out`, `harvest`, `forge`.
- `scholar.mjs`: `init`, `doctor`, `validate`, `new`, `status` (zero dependencies).
- Session-start hook, silent unless the project has `scholar/scholar.json`.
- Codex installer `install/install.mjs` with ownership markers, collision refusal, update and uninstall.
- Tests with synthetic thesis and paper fixtures.
- scholar-research, scholar-writing and scholar-publish contain no skills yet.
