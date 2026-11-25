# Scholar Method repo

This is the source of Scholar Method (see README.md): one Claude Code plugin marketplace with four packs, plus a
Codex installer. Work on it the way it tells research projects to work. Project docs: `docs/project/`
(`CURRENT_STATE`, `HANDOFF`, `WORKING_CONTRACT`, `DECISIONS`). Design: `docs/ARCHITECTURE.md`.

## Editing skills
- One source per skill: `plugins/<pack>/skills/<name>/SKILL.md` (+ `references/`, `scripts/`). Claude installs the
  marketplace; Codex gets the same folders through `install/install.mjs`. Never keep two copies.
- SKILL.md: frontmatter `name` and `description` with "Use when ..." phrases, at most 150 lines, numbered steps, no
  Claude-only tool names without a Codex fallback.
- Scripts: zero dependencies, Node ESM, no imports across skill folders. Reference them relative to the skill folder
  (and `${CLAUDE_PLUGIN_ROOT}` in Claude). The shared CLI is `scholar-core/skills/scholar-start/scripts/scholar.mjs`.
- Keep content public-safe and neutral. Indian or British spelling in prose, no em dashes.

## Versions
Bump a pack in `plugins/<pack>/.claude-plugin/plugin.json` and its entry in `.claude-plugin/marketplace.json`
together. For scholar-core also keep `VERSION` in `scholar.mjs` equal (a test checks). Add a line to `CHANGELOG.md`.

## Checks (run before every commit that changes skills, scripts or manifests)
```
node --test
claude plugin validate .
```
Tests copy synthetic fixtures from `tests/fixtures/` into temp folders; never put real research content there.

## Session words here
This repo is software, not a research project, so it has no `scholar/` folder: "catch up" and "check out" run Studio
Method's skills against `docs/project/`. Improvements to Scholar Method itself go in through `forge` (scholar-core),
not Studio's harvest.

## Rules for this repo
- `promptPacks/` is gitignored and stays untracked. Never commit it.
- No AI attribution lines in commits. Never push or create remotes without the owner's yes.
- Commit small and often. Keep LF line endings.
- Do not touch the owner's research repositories from here.
