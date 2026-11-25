---
name: harvest
description: Turn what a research session taught into a reviewed, anonymised proposal for improving Scholar Method, never publishing private research content. Finds generalisable lessons (rules, skill fixes, new skill ideas, research gotchas, templates), filters out duplicates and anything project-specific, asks the scholar, writes an approved proposal to scholar/harvest/pending, runs a privacy check, and only with approval promotes it into a local method checkout on a branch or exports a bundle. Use when the user says "harvest", "add this to the method", "remember this for all projects", "make this a skill", or at check-out.
---

# Harvest

Goal: ways of working that would help any scholar move from this project into the Scholar Method repo as a
reviewed proposal. The scholar's own insights, data, manuscripts and interpretations stay in the project unless the
scholar chooses to publish them elsewhere. Nothing goes outward without a yes. Ask means AskUserQuestion in Claude
Code, a plain question in Codex.

Planned helper (a later release): `scripts/harvest.mjs check <proposal>` (privacy scan) and `scripts/harvest.mjs
bundle <proposal...>` (export a contribution bundle). Until it exists, do these two steps by hand as described.

## 1. Collect candidates (from this session only)
Look for: corrections the scholar made twice; rules they stated ("never", "always", "from now on"); steps that went
wrong and the fix that worked; a skill that needed a workaround; a repeatable source-checking, analysis or
visualisation procedure; a template that would help others.

## 2. Filter (keep only if all are true)
- **Generalisable:** it helps any scholar or discipline, not just this study. Topic findings, interpretations,
  chapter plans and people stay in the project.
- **Not a duplicate:** search the method repo (skills, `references/`, `docs/`) and `scholar/harvest/declined.md`.
  Already covered or already declined means drop it, and say so in one line.
- **No private research content:** no unpublished text, participant data, raw evidence, source excerpts, emails,
  names, institution, supervisor, thesis title, file paths or tokens. If it cannot be written without them, drop it.
- **Validated or labelled:** say whether it was used and worked, or is only a promising idea.

## 3. Ask (at most 5 candidates, multi-select)
Each option says what it is and where it would go: rule (a skill or `scholar-contract/references`), skill fix
(a named skill), new skill idea (`docs/ROADMAP.md`), research gotcha (a reference file), template. Nothing selected:
say "Nothing harvested" and stop. For each declined or deferred candidate append one dated line to
`scholar/harvest/declined.md` (what, why) so it is not offered again; deferred ones say "deferred".

## 4. Write the proposal
One file per candidate: `scholar/harvest/pending/HRV-<YYYY-MM-DD>-<slug>.md` (run `date` for the date; slug is
lowercase words). Frontmatter, then short plain sections for problem, what worked, evidence or test, and suggested
text. See `references/proposal-template.md`.
```
proposal_id: HRV-2026-12-01-source-read-status
created: 2026-12-01
source_project: generic
category: rule | skill-fix | new-skill | research-gotcha | template
problem: "..."
observed_solution: "..."
generalisability: "..."
evidence_or_test: "..."
proposed_target: "scholar-core/skills/scholar-contract"
privacy_review: pending
review_status: proposed
owner_approval: pending
upstream_status: not-submitted
```
If the project's `harvest_outbox` is `ignored`, make sure `scholar/harvest/pending/` is in `.gitignore`.

## 5. Privacy check (before approval is recorded)
Read the proposal as a stranger would. It must contain no names, no institution, no thesis or paper title, no quoted
source text beyond a short fair-use phrase the lesson depends on, no data, no paths, no secrets. Replace specifics
with neutral examples. When `harvest.mjs check` exists, run it; until then search the file for `@`, `http`, `\`, `C:`,
`/Users`, digits that look like sample sizes, and the project's own title words. Set `privacy_review: passed` only
when clean, then show the scholar the final text and ask for `owner_approval`.

## 6. Promote (only after approval, never silently)
1. Is there a known local method checkout (a path in the project's notes)? If unknown, ask the scholar once. If yes: confirm you may write there, create a branch
   `harvest/<slug>` in that checkout, apply the change in the right pack (rule text, skill edit or roadmap line),
   keep SKILL.md under 150 lines, and show the diff. Pushing or opening a PR is a separate question; ask it.
   Maintainers who push directly follow the repo's own rule; everyone else uses their fork.
2. No checkout, no permission or offline: leave the proposal in `pending/` and say how to continue later ("run
   harvest where the method checkout lives, or export a bundle"). Or export: copy the approved proposal files into
   one folder and zip it for a PR or an issue. Never claim it reached the method when it did not.
3. Update `upstream_status` (`not-submitted`, `branch-ready`, `bundle-exported`, `submitted`, `merged`).

## 7. Tell the scholar
Two lines: what was written and where it is now (pending, on a branch, bundled). Contributors without push rights:
fork, branch, open a PR, or attach the bundle to an issue; installing the method never grants write access.
