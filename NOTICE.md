# Notice

Scholar Method is derived from **Studio Method** by Aavriti Design Studio
(https://github.com/aavritidesignstudio/studio-method), released under the MIT licence. The derivation is from
commit `e3f25fe`. Both projects are MIT licensed and share the same copyright holder. Scholar Method has fresh
history and its own versions and releases; the upstream repository was read, not modified.

## Kept (the philosophy and shape)
- A Claude Code plugin marketplace with several packs, each pack versioned, versions kept in agreement between
  `plugin.json` and `marketplace.json`.
- Understand-first adoption: read, say back, ask, then write the minimum and never overwrite.
- Status, handoff and contract documents, the session-start reminder hook, `catch-up` and `check-out`.
- `harvest` and `forge` as the way the method grows from real work.
- The habit of short, plain output and asking before anything outward.

## Rewritten for scholarly work
- All skills were rewritten: `scholar-start`, `scholar-contract`, `catch-up`, `check-out`, `harvest`, `forge`.
- Evidence integrity, authorship and approvals replace app-building rules.
- Records live in a visible `scholar/` folder with insight, claim, source and visual formats and a validator.
- Skills work in Codex as well as Claude Code, through a zero-dependency installer.
- Harvest is privacy-gated and can export a bundle for contributors without write access.

## Dropped
Everything about apps, websites, stores and hosted services: the app, site and services packs, device testing,
release rituals, store listings, product pulse, mockups, repo-size cleaning and the orchestration rules for
helper agents and usage percentages.

## Third-party tools
`blader/humanizer` (https://github.com/blader/humanizer) is an optional external editing skill. Scholar Method does
not include, copy or install it; it only detects it and asks first.
