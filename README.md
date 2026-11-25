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

| Pack | Skill | What it does | Say |
|---|---|---|---|
| scholar-core | `scholar-contract` | The standing rules: partnership, evidence integrity, approvals, how to talk | loaded every session |
| scholar-core | `scholar-start` | Understand a repo first, map it, adopt it without overwriting; Humanizer check | "scholar start", "adopt the method" |
| scholar-core | `catch-up` | A 4 to 5 bullet snapshot of where you left off | "catch up", "where did we leave off" |
| scholar-core | `check-out` | Close a session: review insights, update status and handoff, validate, commit locally | "check out", "wrap up" |
| scholar-core | `harvest` | Offer reusable lessons to the method, anonymised, privacy-checked, after your review | "harvest", "add this to the method" |
| scholar-core | `forge` | Maintainer adds or improves a skill, or applies a harvest proposal | "forge", "make this a skill" |
| scholar-research | `reflect` | Think aloud: mirror the idea, rival explanations, link to records, provisional capture | "I have a hunch", "reflect" |
| scholar-research | `research` | Find and read secondary sources, register them with read status | "research", "what has been published on" |
| scholar-research | `evidence` | Map claims to sources and questions; show gaps and a relationship graph | "evidence", "map this to the questions" |
| scholar-research | `analyse` | Transparent analysis of data you supply, assumptions stated | "analyse", "what does this dataset show" |
| scholar-research | `visualise` | Evidence-linked chart, network or diagram with a provenance sidecar | "visualise", "chart it", "map it" |
| scholar-writing | `draft` | Evidence-gated prose from your approved argument, only when asked | "draft", "write up this section" |
| scholar-writing | `voice-review` | Prose linter, style review, optional Humanizer pass behind a fact guard | "voice review", "lint this", "does this sound like AI" |
| scholar-writing | `cite` | Check every citation resolves and supports its sentence | "cite", "check citations" |
| scholar-publish | `build` | Preflight checks, then the project's own Quarto, Word or PDF build | "build", "render the manuscript" |
| scholar-publish | `submission-check` | Pre-submission checklist for a journal, conference or university | "submission check", "ready to submit?" |

The words you can say are in `plugins/scholar-core/skills/scholar-contract/references/glossary.md`. Plain
language always works.

## Install

Needs Node 18 or newer for the scripts (no packages to install). Source: https://github.com/rajeevScorpion/scholar-method

### Claude Code
```
/plugin marketplace add rajeevScorpion/scholar-method
/plugin install scholar@scholar-method
```
`scholar` is a bundle: one install brings all four packs through plugin dependencies. To pick packs instead,
install any of `scholar-research`, `scholar-writing` or `scholar-publish`; each pulls in `scholar-core` itself.
To test from a local checkout, pass its folder path to `/plugin marketplace add` instead.
Update: `/plugin marketplace update scholar-method` (dependencies follow). Uninstall: `/plugin uninstall scholar@scholar-method`, then the packs.
Skills appear namespaced (`scholar-core:catch-up`) and also load from plain words ("catch up").

### Codex
From a checkout of this repo:
```
node install/install.mjs --agent codex --project <your-research-repo>   # skills in <repo>/.agents/skills
node install/install.mjs --agent codex --global                         # ~/.codex/skills if it exists, else ~/.agents/skills
```
Options: `--packs core,research,writing,publish` (default all), `--dry-run`, `--target <dir>`. Update: pull this repo and
run the same command again (it replaces only folders it owns). Uninstall: add `--uninstall`. The installer marks each
copy with `.scholar-method.json`, refuses to overwrite a same-named folder it does not own, and prints (does not
write) the AGENTS.md snippet that adoption adds. Hooks are Claude Code only; in Codex "catch up" does the same job.

## Start using it

Open your research repo in Claude Code or Codex and say **"scholar start"**, or paste the prompt in
[ADOPT.md](ADOPT.md). The agent reads your repo, tells you what it understood, asks, and only then adds a small
visible `scholar/` folder plus a short section in your `AGENTS.md` or `CLAUDE.md`. On the first run it also tells you what it found, for example "it seems you are working on a thesis", and asks you to
confirm, correct or describe the project; only your answer is recorded, and the next steps follow the kind you confirm.
Guides: [existing thesis](docs/ADOPTING-AN-EXISTING-THESIS.md),
[paper](docs/ADOPTING-A-PAPER.md).

### Everyday words
- **"scholar start"**: read the repo, say it back, map your files, adopt without overwriting.
- **"catch up"**: 4 or 5 bullets from your handoff, pending insights and pending harvest proposals.
- **"I have a hunch that..." / "reflect"**: talk it through; the idea is kept as a provisional insight, never as a finding.
- **"research X"**, **"evidence"**, **"analyse this data"**, **"visualise"**: find and read sources, map claims to questions,
  analyse what you supplied, draw evidence-linked charts and networks with a provenance record.
- **"draft"**, **"voice review"**, **"cite"**, **"build"**, **"submission check"**: writing and publishing support, always on your say.
- **"check out"**: review the session's insights with you, update status and handoff, validate, commit locally, give a
  starter line for next time.
- **"harvest"**: offer reusable lessons to the method. Proposals are privacy-scanned, need your approval, and go to a local
  branch or a bundle file; nothing is pushed.
- **"forge"** (maintainers): turn an approved proposal or a workflow into a skill.

A session looks like this: `scholar start` (once), then each day `catch up`, work, `check out`. Next-session line from
check-out, for example: `catch up, then look at INS-0003; read notes/session_handoff.md first`.

## Citation styles

Write citations once, as Pandoc citekeys (`[@key, p. 12]`, `@key`) with sources in a `.bib` or CSL-JSON file. The style is
a setting, the `csl:` file in your Quarto or Pandoc config, so changing style means swapping that file, not retyping
the text. **APA 7 is the default**; a journal's or university's rules win, then a decision you record, then APA 7.
`apa.csl` is bundled; MLA 9, Chicago, Harvard, IEEE, Vancouver (NLM) or any CSL file you supply are fetched on demand,
only with your yes. Without a `csl:` Pandoc would fall back to Chicago author-date, so `status` and the build
preflight warn when none is set.

```
node plugins/scholar-writing/skills/cite/scripts/style.mjs status --root .
node plugins/scholar-writing/skills/cite/scripts/style.mjs use mla-9 --root .            # plan only
node plugins/scholar-writing/skills/cite/scripts/style.mjs use mla-9 --root . --apply    # do it
node plugins/scholar-writing/skills/cite/scripts/style.mjs fields mla-9 --root .         # missing bib fields for that style
node plugins/scholar-writing/skills/cite/scripts/style.mjs convert --root .              # propose citekeys for typed "(Smith, 2020)"
```

`convert --apply` rewrites only exact matches and leaves ambiguous or unmatched ones for you; `narrative` lists wording
that depends on the style. See [the cite skill](plugins/scholar-writing/skills/cite/SKILL.md) and
[its style notes](plugins/scholar-writing/skills/cite/references/styles.md).

## Quarto

Builds use your project's own Quarto setup. `node plugins/scholar-core/skills/scholar-start/scripts/scholar.mjs doctor`
reports the Quarto version, its Pandoc and whether PDF output is ready (Typst is bundled with Quarto 1.4 and later;
TinyTeX is only needed for LaTeX). If Quarto is missing, the doctor prints the official route
(https://quarto.org/docs/get-started/; Windows: `winget install --id Posit.Quarto`) and the agent asks you first;
nothing is ever installed for you. Real render tests (HTML, DOCX and a Typst PDF under APA and a numeric style) run
when Quarto is installed and skip with a message when it is not; results are in
[docs/validation/RESULTS.md](docs/validation/RESULTS.md).

## Where things live

```
your-research-repo/
  scholar/
    scholar.json      machine config, the map of your existing files, writing and harvest settings
    PROJECT_MAP.md    the same map, for people
    insights/ claims/ visuals/ (sources/ only if you have no register)
    harvest/          pending proposals and a declined log, kept for your review
  your own status, handoff, registers, drafts, bibliography ...   (untouched)
```
The folder is visible on purpose: some agent search tools skip hidden folders. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, [docs/validation/RESULTS.md](docs/validation/RESULTS.md) for
what was tested and what was not, and [docs/ROADMAP.md](docs/ROADMAP.md) for what is next.

## Studio Method

Scholar Method is derived from [Studio Method](https://github.com/aavritidesignstudio/studio-method) (MIT), a Claude
Code kit for building apps and sites. This is a separate, independent project for scholarly work. See
[NOTICE.md](NOTICE.md). Both can be installed; Scholar's adoption step shows how to keep them from colliding.

## Contributing and licence

[CONTRIBUTING.md](CONTRIBUTING.md). MIT, see [LICENSE](LICENSE).
