# Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-25 | Four packs (scholar-core, scholar-research, scholar-writing, scholar-publish) with Codex parity from the start | Keeps each pack small and installable alone; the owner uses both Claude Code and Codex |
| 2026-11-25 | Fresh history with attribution (NOTICE.md, derived from Studio Method e3f25fe, MIT) | Independent project and releases; licence and credit preserved; no upstream disruption |
| 2026-11-25 | The commissioning prompt pack stays untracked (`promptPacks/` is gitignored) | It is working material for the owner, not part of the public method |
| 2026-11-25 | `studio-core` is disabled per research repo, with approval, through project `enabledPlugins`; the owner adds one global CLAUDE.md line | Different session rules; Scholar edits no global files |
| 2026-11-25 | The owner's thesis repository is not touched during development | It is the first real adoption and needs a reviewed dry run first |
| 2026-11-25 | Records live in a visible `scholar/` folder | Hidden folders are skipped by ripgrep-based agent search |
| 2026-11-25 | Insight capture is batched at pauses and check-out | Do not interrupt a thinking scholar |
