---
name: scholar-start
description: Start a new research project with Scholar Method, or bring an existing thesis, paper or review repo into it without replacing anything. Understand-first, so it reads the repo (instructions, git state, status, handoff, charter, registers, style guide, Quarto, Codex agents), names what kind of project it seems to be (thesis, journal or conference paper, article, review, book, proposal) and asks the scholar to confirm, says back what it understood in 25 lines or fewer, flags stale or conflicting records, proposes a role-to-file map, asks, and only then writes a minimal scholar/ folder and a short Scholar section in AGENTS.md or CLAUDE.md. Then handles Studio Method coexistence and the Humanizer check. Safe to re-run. Use when the user says "scholar start", "set up Scholar Method", "adopt the method", "use Scholar here", "start a new paper", or opens a research repo that has no scholar/ folder.
---

# Scholar start

Goal: a research repo works the Scholar way, with the scholar's own files still in charge. Nothing changes
until the scholar has confirmed your understanding. Ask means AskUserQuestion in Claude Code, a plain question in
Codex. `$SCHOLAR` is `scripts/scholar.mjs` in this skill folder (Claude Code:
`${CLAUDE_PLUGIN_ROOT}/skills/scholar-start/scripts/scholar.mjs`). Load `scholar-contract` first.

## 1. Already adopted?
1. Right folder? If this is not a git repo but a folder one or two levels down is, ask which one is the project.
2. If `scholar/scholar.json` exists: say so in one line (with `project.kind` if confirmed; if null, ask as in 2b), run `node $SCHOLAR init --dry-run` (it must report "No
   changes"; otherwise show what is missing) and offer `catch-up`. Stop here unless the scholar wants gaps filled
   (then `init --apply`; it never overwrites).
3. New or existing? Existing: section 2. Empty or near-empty folder: section 3. Unsure: ask once.

## 2. Existing project (read-only until confirmed)
### 2a. Read
- Instructions: `AGENTS.md`, `CLAUDE.md`, `README`, `START_HERE*`, `.codex/agents/`.
- Git: `git status --short`, current branch, `git log --oneline -15`. Uncommitted work belongs to the scholar:
  list it, never touch it.
- Records: status or state, handoff, charter, research questions, decision log, source and citation registers,
  `.bib`, style guide, evidence dashboards, `_quarto.yml`, draft folders (names only, not full manuscripts).
- Run `node $SCHOLAR init --dry-run` for the detected role map.
- Note what is stale or in conflict (two status files, old chapter counts, dates, objectives that differ between
  files). These are reconciliation tasks for the scholar, never permission to rewrite the study.

### 2b. Name what you found (before the say-back)
Run `node $SCHOLAR detect` (or read it from `init --dry-run`). Say one line: "It seems you are working on a
**<kind>** (<1 to 3 strongest signals>)." Low confidence: offer the alternatives instead of asserting one. Ask
(AskUserQuestion in Claude Code: Confirm, one or two likely alternatives, "Something else, I will describe it"; a plain
question in Codex). Accept a correction, an addition ("a thesis plus two papers from it": suggest a separate project
map per output, `related_projects` only if the scholar opts in) or the scholar's own definition. Nothing is written
before this answer. Then take it ahead by kind: `references/project-kinds.md` (at most 3 questions, defaults first).

### 2c. Say back (25 lines or fewer, plain words)
What the study is and its stage; the target venue if known; what is approved versus open; what has actually been
verified versus reported; where each Scholar role lives (status, handoff, decisions, sources, bib, style guide,
drafts, assets); uncommitted work; stale or conflicting records; anything you could not work out. Then ask: "Looks
right" or "I will correct it", plus the one to three questions only the scholar can answer (stage, venue, citation
style, who the supervisor must approve). Paper projects must not inherit thesis page counts, chapter lists or
decisions; a thesis and a paper from it need a separate map.

### 2d. Write the minimum (after confirmation)
1. Work on a feature branch (`scholar-adopt`), unless the project's own rules say otherwise.
2. `node $SCHOLAR init --apply --kind <kind>` with the confirmed kind (`--kind other --describe "..."` for the
   scholar's own definition; without `--kind` the kind stays null and init reminds you). It creates only missing files
   under `scholar/` and maps equivalents instead of duplicating them. Correct any wrong mapping in `scholar/scholar.json` and
   `scholar/PROJECT_MAP.md` by hand, from what the scholar confirmed.
3. Append (never replace) the short Scholar section from `references/agents-snippet.md` to the existing `AGENTS.md`
   and/or `CLAUDE.md`, creating only the one the project's agent uses if neither exists.
4. Record "Scholar Method <version> adopted <date>" in the mapped status doc (run `date`; version from
   `scholar/scholar.json`). Add one line to the mapped decisions file only if the scholar approves it.
5. Show `git diff` and `git status`. Commit on the branch (`scholar: adopt Scholar Method`). Do not merge or push.

## 3. New project
No detection signals, so ask the kind directly (options from `references/project-kinds.md`, plus "Something else, I will
describe it") and take it ahead by kind. Ask in one go (defaults first): kind; working title; target venue or institution if known;
citation style (default APA 7); whether to opt in to a writing profile (default no). Create the folder layout the
scholar wants for drafts (do not impose one), run `init --apply --kind <kind>`, add the Scholar section to
`AGENTS.md`/`CLAUDE.md`, commit. Do not start drafting.

## 4. Studio Method coexistence
Run `node $SCHOLAR doctor --json` and read `studio_core`. If `studio-core` is installed in Claude Code, its
session rules (helper agents, usage limits) can collide with Scholar's. Ask before doing anything, then offer to
create or merge a project `.claude/settings.json` with:
```json
{ "enabledPlugins": { "studio-core@studio-method": false } }
```
(`enabledPlugins` takes `"plugin@marketplace": true|false` per scope; the project file overrides the user one.
Checked against Claude Code docs, 2026-11-25. Merge into existing keys; never overwrite the file.) Then tell the
scholar the one line to add to their own global `~/.claude/CLAUDE.md`, which you must not edit:
"In repos that have a scholar/ folder, follow Scholar Method; do not load Studio Method working-contract or
playbook there." If the project has its own session protocol, that stays in charge.

## 5. Humanizer check (detect, then ask)
Humanizer (`blader/humanizer`) is an optional third-party editing assistant. Never install it silently.
1. Read `doctor` output `humanizer.status`. Also look at the skills your own session lists.
2. `blader-present`: say so, with where it was found. Do not reinstall.
3. A skill named "humanizer" from another source (for example `anthropic-skills:humanizer`, or `other-or-unverified`
   in doctor) is NOT blader's. Report it as "a differently sourced humanizer", not as the one we mean.
4. `absent`: tell the scholar what would be installed, where (this project or global), and the exact commands, and
   ask. Say you will re-read the upstream README (https://github.com/blader/humanizer) before running anything,
   because commands change. Default to installing in this project only; global only if the scholar asks.
   Commands as last checked (2026-11-25):
   - Claude Code, this project: `claude plugin marketplace add blader/humanizer --scope project` then
     `claude plugin install humanizer@humanizer --scope project` (in-session: `/plugin` and pick project scope)
   - Codex, this project: `npx skills add blader/humanizer --agent codex`
   - Codex, global: `npx skills add blader/humanizer --global --agent codex`
   Run only the one for the active agent and only after a yes. Verify it loads and test on a short synthetic sample.
5. Declined: carry on without it. Humanizer never overrides the contract (`scholar-contract`, section 3).

## 6. Hand over
Give a `catch-up` style snapshot and ask what the scholar wants to explore first. No drafting, no chapter plans.
Tell them the next-session words: "catch up" to resume, "check out" to close.
