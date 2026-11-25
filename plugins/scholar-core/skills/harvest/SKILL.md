---
name: harvest
description: Turn what a research session taught into a reviewed, anonymised proposal for improving Scholar Method, never publishing private research content. Finds generalisable lessons (rules, skill fixes, new skill ideas, research gotchas, templates), filters out duplicates and anything project-specific, asks the scholar, writes an approved proposal to scholar/harvest/pending, runs a privacy scan, and only with approval promotes it into a local method checkout on a branch or exports a bundle. Never pushes. Use when the user says "harvest", "add this to the method", "remember this for all projects", "make this a skill", or at check-out.
---

# Harvest

Goal: ways of working that would help any scholar move from this project into the Scholar Method repo as a
reviewed proposal. The scholar's own insights, data, manuscripts and interpretations stay in the project unless the
scholar chooses to publish them elsewhere. Nothing goes outward without a yes. Ask means AskUserQuestion in Claude
Code, a plain question in Codex. `$HARVEST` is `scripts/harvest.mjs` in this skill folder (Claude Code:
`${CLAUDE_PLUGIN_ROOT}/skills/harvest/scripts/harvest.mjs`). Every command takes `--root <project>`.
Projects never read each other's records: a harvest and its privacy scan see only this project, even when
`related_projects` is set.

## 1. Collect candidates (from this session only)
Look for: corrections the scholar made twice; rules they stated ("never", "always", "from now on"); steps that went
wrong and the fix that worked; a skill that needed a workaround; a repeatable source-checking, analysis or
visualisation procedure; a template that would help others.

## 2. Filter (keep only if all are true)
- **Generalisable:** it helps any scholar or discipline, not just this study. Topic findings, interpretations,
  chapter plans and people stay in the project.
- **Not a duplicate:** run `node $HARVEST list` (pending and declined titles) and search the method repo (skills,
  `references/`, `docs/`) if you can see it. Already covered or already declined: drop it, say so in one line.
- **No private research content:** no unpublished text, participant data, raw evidence, source excerpts, emails,
  names, institution, supervisor, thesis title, file paths or tokens. If it cannot be written without them, drop it.
- **Validated or labelled:** say whether it was used and worked, or is only a promising idea.

## 3. Ask (at most 5 candidates, multi-select)
Each option says what it is and where it would go: rule (a skill or `scholar-contract/references`), skill fix
(a named skill), new skill idea (`docs/ROADMAP.md`), research gotcha (a reference file), template. Nothing selected:
say "Nothing harvested" and stop. Each declined candidate: `node $HARVEST decline --title "<title>" --reason "<why>"`
(or `decline <id>` for an existing proposal). That logs it in `scholar/harvest/declined.md` and it is never offered again.

## 4. Write the proposal
`node $HARVEST new --title "<plain title>" --category rule|skill-fix|new-skill|research-gotcha|template --target
<path in the method repo>` (add `--problem`, `--solution`, `--generalisability`, `--evidence` to fill the fields).
It writes `scholar/harvest/pending/HRV-<date>-<slug>.md` from `references/proposal-template.md`. Fill the sections in
neutral words with a made-up example if one helps; `source_project` stays `generic`. If the project's
`harvest_outbox` is `ignored`, make sure `scholar/harvest/pending/` is in `.gitignore`.

## 5. Privacy scan (before approval)
1. `node $HARVEST check <id>`. It blocks (exit 1) on emails, phone-like numbers, absolute local paths, quoted passages
   over 25 words, any `harvest.deny_terms` entry from `scholar/scholar.json`, this project's record IDs and bib keys,
   and 8 or more consecutive words shared with the project's drafts or records. URLs and DOIs are advisory unless
   `harvest.allow_domains` is set. Fix every blocking hit by rewriting in neutral terms, then re-run.
2. If `deny_terms` is empty, ask the scholar for the words that must never leave (title words, names, institution)
   and add them to `scholar/scholar.json` `harvest.deny_terms` first.
3. Show the scholar the final text. Only after they agree it reads as safe for a stranger:
   `node $HARVEST check <id> --pass` (add `--accept-advisory` if they accept the listed URLs or DOIs). This records
   `privacy_review: passed` with a hash of the text, so any later edit invalidates it.
4. Ask for approval to share. On a yes: `node $HARVEST approve <id>` (`owner_approval: yes`). The scan is a net,
   not a judge; the scholar's reading is the real review.

## 6. Promote or export (only after approval, never silently)
Nothing leaves the project until this step, and nothing is ever pushed by the script.
1. **Local method checkout** (a path the scholar names; ask once): `node $HARVEST promote <id> --method <path>`.
   It checks the folder is a Scholar Method git checkout with no uncommitted changes, creates branch
   `harvest/<id>`, adds the proposal as `harvest-inbox/<id>.md`, commits locally (`harvest: <title>`) and leaves
   the checkout on its original branch. The maintainer then applies it with the `forge` skill. Pushing is a separate
   question: print the push and PR commands it shows and ask before the owner runs them.
2. **No write access, no checkout or offline:** `node $HARVEST bundle <id> --out harvest-bundle.md` writes one
   Markdown file for an issue or a PR from a fork. A contributor forks the method repo, then adds the fork as a remote
   in their checkout and pushes there. Installing the method never grants write access.
3. Leave unapproved proposals in `pending/`. `node $HARVEST list` shows state; `upstream_status` moves through
   `not-submitted`, `bundle-exported` or `branch ... (local, not pushed)`, then `submitted` and `merged` (set by hand
   after the owner pushes). Never claim it reached the method when it did not.

## 7. Tell the scholar
Two lines: what was written and where it is now (pending, on a local branch, bundled). Another session or agent
finds pending proposals in `scholar/harvest/pending/`; `scholar.mjs status` and the session hook list them.
