---
name: forge
description: As the maintainer of the Scholar Method repo, add a new skill or improve an existing one in the right pack, from a workflow that just worked, an approved harvest proposal or a roadmap item. Drafts to the skill standards, bumps versions in plugin.json and marketplace.json together, validates, tests, commits locally and asks before any push. Use when the user says "forge", "make this a skill", "add a skill for", "update the skill", "build the next skill from the roadmap", or turns an approved harvest proposal into method changes.
---

# Forge

Goal: a new or improved skill that another scholar can use without this conversation, in Claude Code and in Codex.
Only people with write access to the method repo forge; others use `harvest` and send a PR from a fork. Ask means
AskUserQuestion in Claude Code, a plain question in Codex. Work inside the method repo, not a research project.

## 1. Pin down the skill (three questions or fewer)
- What job does it do, end to end, in one sentence a stranger understands?
- Which pack? `scholar-core` (way of working), `scholar-research` (thinking and evidence), `scholar-writing`
  (author-directed writing), `scholar-publish` (build and submit). New pack only if none fits.
- New or change? For a change, read the current skill first and keep its name and trigger phrases.
Check `docs/ROADMAP.md` and `harvest-inbox/` (proposals contributors sent on `harvest/<id>` branches, or bundles in
it); they may already hold the draft text. A proposal is a suggestion: review it, decide, apply it by hand in the right
pack, and say in the commit which proposal it came from. Decline it in the inbox with a one-line reason if it does not fit.

## 2. Gather what is true
- From the project that produced it: the steps that worked, the gotchas, the commands.
- From outside: current official docs for each tool or service it touches, with the date checked. Rules about
  integrity, authorship and privacy come from `scholar-contract`; do not weaken them.
- Third-party tools: never bundle them. Detect, show the official install route, ask.

## 3. Write (folder `plugins/<pack>/skills/<name>/`)
- `SKILL.md`: frontmatter `name` (kebab-case, plain, no pack prefix) and `description` that says what it does and
  includes "Use when ..." with natural trigger phrases. Body: numbered steps a fresh session in Claude Code or
  Codex can follow, what done means, what to ask. At most 150 lines. No Claude-only tool names without a Codex
  fallback ("ask the owner: AskUserQuestion in Claude Code, a plain question in Codex").
- `references/` for depth; `scripts/` only for mechanical, repeatable steps. Scripts are zero-dependency Node ESM
  and import nothing from another skill folder. Codex copies skill folders flat and Claude installs each plugin
  alone, so everything a skill needs at run time lives in its own folder, or in a sibling skill of the same pack
  that is documented by relative path.
- Public-safe: neutral examples, no names, institutions, titles or private data. Indian or British spelling,
  plain short prose, no em dashes.

## 4. Check
1. `claude plugin validate .` from the repo root (and `claude plugin validate plugins/<pack>` for the pack).
2. `node --test` (it checks versions agree, line limits, frontmatter, and that scripts and the installer still work).
3. Dry run: read the SKILL.md as a fresh session in an empty project. Every step must be doable from what is written.
4. If it has scripts, run them once on a synthetic fixture under `tests/fixtures/`, and add a test.

## 5. Ship
1. Bump the pack version in `plugins/<pack>/.claude-plugin/plugin.json` and the same pack's entry in
   `.claude-plugin/marketplace.json` (they must agree). New skill: minor. Fix: patch. If the pack is
   `scholar-core`, also update `VERSION` in `scholar.mjs` and the marketplace `metadata.version` when releasing.
2. Update `README.md` (skills table), `CHANGELOG.md` and `docs/ROADMAP.md` (remove the item if it came from there).
   Delete the applied `harvest-inbox/<id>.md` in the same commit.
3. Commit locally with a clear message (`forge: <skill> (<pack> <version>)`). No AI attribution lines.
4. Ask before pushing: "Push Scholar Method <version>?" Never push without a yes.
5. Tell the owner how projects get it: Claude Code `/plugin marketplace update scholar-method` then update the pack;
   Codex `node install/install.mjs --agent codex --project <repo>` again (it updates only folders it owns).
