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

## Citation styles (CSL)
`plugins/scholar-writing/skills/cite/references/csl/apa.csl` (APA Style 7th edition) is copied unmodified from the
Citation Style Language styles repository (https://github.com/citation-style-language/styles) at commit
`f123868a546e6e7cec10e808ae04ef0e52bf2210`. It is licensed under Creative Commons Attribution-ShareAlike 3.0 (authors
Brenton M. Wiernik and Andrew Dunning, contributor Jay Pfaffman); that licence applies to the file, not to the rest of
this repository. `tests/fixtures/quarto-styles/csl/ieee.csl` (IEEE, same commit, same licence) is a test fixture only.
Other styles are downloaded on demand by `style.mjs fetch` from the same repository and commit, only after the scholar
agrees; each keeps its own licence.
