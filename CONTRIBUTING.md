# Contributing to Scholar Method

Scholar Method grows from real research work. You do not need write access to help.

## Two ways to contribute
1. **Fork and pull request.** Fork the repo, make a branch, change a skill or add one, run the checks below, open a
   PR that says what problem it solves and how you tested it.
2. **A harvest bundle.** Working in your own project, say "harvest". The agent drafts anonymised proposals in
   `scholar/harvest/pending/`, checks them for private content and, with your approval, exports a bundle. Attach
   the bundle to an issue or PR. The maintainer reviews it. Installing the method never gives write access.

## What a good skill looks like
- `plugins/<pack>/skills/<name>/SKILL.md` with `name` and a `description` that includes "Use when ..." phrases.
  Numbered steps a fresh session in Claude Code or Codex can follow. At most 150 lines. Detail goes in `references/`.
- No Claude-only tool names without a Codex fallback.
- Scripts are zero-dependency Node and import nothing from another skill folder.
- Plain, short prose. Indian or British spelling in method prose. No em dashes.

## Content rules
- **Public-safe.** No names, institutions, thesis or paper titles, unpublished text, participant data or secrets.
  Examples are neutral and invented.
- **Integrity first.** A change may add safeguards. It may not weaken the rules in `scholar-contract`
  (no invented sources or results, the scholar leads, ask before outward actions).
- **Ask before outward actions.** Skills ask before pushing, publishing, installing or sharing.

## Checks before a PR
```
node --test
claude plugin validate .
```
If you change a pack, bump its version in its `plugin.json` and its entry in `.claude-plugin/marketplace.json`
together, and add a line to `CHANGELOG.md`. See `CLAUDE.md` for the full routine.
