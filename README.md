# Scholar Method

A scholar-led research companion for inquiry, evidence, thinking, writing and continuity.

Scholar Method gives an AI coding agent (Claude Code or Codex) a careful way to work with you on a thesis, a
journal paper, a conference paper or a review. It keeps the record of your investigation in plain files in your
own repository, so any session, on any machine, in either agent, can pick up where you stopped.

## The promise

- **You lead.** You own the questions, the interpretations and every final claim. The agent thinks alongside you,
  finds and reads secondary sources, checks arguments, analyses the data you supply and draws what you ask for.
- **Talking comes first.** Say half-formed thoughts out loud. The agent reflects them back faithfully, offers a
  rival explanation, links them to your questions and sources, and notes them as provisional. It does not turn
  a conversation into a chapter.
- **No false findings.** No invented sources, quotations, data or results. A hypothesis stays a hypothesis even
  when you accept it. Your approval is not evidence.
- **Your project stays yours.** Scholar Method installs into an existing repo without replacing your files. It maps
  your own status, handoff and registers instead of duplicating them. Your university, venue and supervisor rules
  win over any default here.
- **Writing supports thinking.** Drafting happens when you ask, in your voice, behind evidence gates.

## What is in it

One marketplace, four packs. Skills load on demand by name or by plain-language trigger.

| Pack | Skill | What it does | State |
|---|---|---|---|
| scholar-core | `scholar-contract` | The standing rules: partnership, evidence integrity, approvals, how to talk | ready |
| scholar-core | `scholar-start` | Understand a repo first, map it, adopt it without overwriting; Humanizer check | ready |
| scholar-core | `catch-up` | A 4 to 5 bullet snapshot of where you left off | ready |
| scholar-core | `check-out` | Close a session: review insights, update status and handoff, validate, commit locally | ready |
| scholar-core | `harvest` | Offer reusable lessons to the method, anonymised, after review | ready |
| scholar-core | `forge` | Maintainer adds or improves a skill | ready |
| scholar-research | explore, research, ingest, verify-source, evidence-map, analyse, visualise, map, challenge | Thinking and evidence | coming in 0.1 |
| scholar-writing | draft, voice-review, cite, review, revision-response | Author-directed writing support | coming in 0.1 |
| scholar-publish | build, format-check, submission-check, publication-map | From manuscript to submission | coming in 0.1 |

The words you can say are in `plugins/scholar-core/skills/scholar-contract/references/glossary.md`. Plain
language always works.

## Install

### Claude Code
```
/plugin marketplace add <path-or-git-url-of-this-repo>
/plugin install scholar-core@scholar-method
```
Add `scholar-research`, `scholar-writing` and `scholar-publish` the same way when their skills arrive. To update:
`/plugin marketplace update scholar-method`, then update the pack.

### Codex
From a checkout of this repo (Node 18 or newer, no packages needed):
```
node install/install.mjs --agent codex --project <your-research-repo>
node install/install.mjs --agent codex --global
```
Options: `--packs core,research,writing,publish` (default all), `--dry-run`, `--uninstall`. The installer copies
skill folders, adds a `.scholar-method.json` marker to each, refuses to overwrite a same-named folder it does not
own, and prints (does not write) the AGENTS.md snippet that adoption adds. Project skills go to `.agents/skills`;
global skills go to `~/.codex/skills` if that folder exists, else `~/.agents/skills`.

## Start using it

Open your research repo in Claude Code or Codex and say **"scholar start"**, or paste the prompt in
[ADOPT.md](ADOPT.md). The agent reads your repo, tells you what it understood, asks, and only then adds a small
visible `scholar/` folder plus a short section in your `AGENTS.md` or `CLAUDE.md`.

Every session after that: **"catch up"** to resume, **"check out"** to close.

## Where things live

```
your-research-repo/
  scholar/
    scholar.json      machine config and the map of your existing files
    PROJECT_MAP.md    the same map, for people
    insights/ claims/ visuals/ (sources/ only if you have no register)
    harvest/          proposals for improving the method, kept for your review
  your own status, handoff, registers, drafts, bibliography ...   (untouched)
```
The folder is visible on purpose: some agent search tools skip hidden folders. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and [docs/ROADMAP.md](docs/ROADMAP.md) for what is next.

## Studio Method

Scholar Method is derived from [Studio Method](https://github.com/aavritidesignstudio/studio-method) (MIT), a Claude
Code kit for building apps and sites. This is a separate, independent project for scholarly work. See
[NOTICE.md](NOTICE.md). Both can be installed; Scholar's adoption step shows how to keep them from colliding.

## Contributing and licence

[CONTRIBUTING.md](CONTRIBUTING.md). MIT, see [LICENSE](LICENSE).
