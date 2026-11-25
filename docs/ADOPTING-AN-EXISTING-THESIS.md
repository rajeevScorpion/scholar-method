# Adopting Scholar Method in an existing thesis repository

For a thesis that already has its own status notes, handoff, registers, bibliography, drafts and agent instructions.
Scholar maps your files; it does not replace them. Nothing is written until you have confirmed what the agent understood.

## What stays yours
Your accepted proposal, research questions, decisions, source register, bibliography, chapter files, style guide and
any agent or session protocol. Where Scholar and your repo disagree, your repo wins (see the precedence ladder in
`docs/ARCHITECTURE.md`).

## Steps
1. **Install** the skills (README). Claude Code: the marketplace. Codex: `node install/install.mjs --agent codex --project <repo>`.
2. **Dry run, read-only.** Say "scholar start", or run
   `node plugins/scholar-core/skills/scholar-start/scripts/scholar.mjs init --dry-run --kind thesis --root <repo>`.
   It prints which of your files it would map to each role (status, handoff, decisions, sources, bibliography, style
   guide, drafts, assets, visual ledger, Excalidraw boards, Quarto config, AGENTS.md, Codex agents) and the few files it
   would add under `scholar/`. Check `git status` before and after if you want proof; it must not change.
3. **Read-back.** The agent tells you, in 25 lines or fewer, what it understood, what is approved versus open, what is
   verified versus reported, your uncommitted work, and any stale or conflicting records. Correct it.
4. **Reconcile on your terms.** Old chapter counts, two status files, a handoff that lags behind the state doc: these
   are your tasks. Scholar lists them and never rewrites the study to fix them.
5. **Adopt on a branch** (`scholar-adopt`): `init --apply --kind thesis` adds `scholar/` (config, project map, empty
   record folders, harvest folders), then a short Scholar section is appended to your `AGENTS.md` and/or `CLAUDE.md`.
   Review `git diff`. Merging is your call.
6. **Fit the config to the project.** In `scholar/scholar.json`: `writing` (lint rules that match your style guide),
   `harvest.deny_terms` (title words, names, institution, IDs that must never leave the project),
   `harvest.allow_domains`, and `external_ids` (init fills it from your register).
7. **Session protocol.** If your repo has its own session steps (an active-session claim, a session log, model
   routing), keep them. The Scholar section you append says so, and `check-out` edits your handoff in place.
8. **Other tools.** If you also use Studio Method, disable it for this repo (`.claude/settings.json`, shown by
   `scholar-start`) and add the one global line it prints. Humanizer is optional; the agent asks before installing anything.

## Records that need a decision from you
IDs: if your register uses `SRC-####`, those stay external (listed in `external_ids`); Scholar does not create a second
source register. Figures: pick whether Scholar visual sidecars reuse your ledger IDs. Reported but unavailable data:
Scholar records it as an unverified source statement, not a finding.
