# Architecture

## Layers
1. **Method** (this repo): versioned skills, scripts, an installer, tests. Public-safe and independent of any study.
2. **Project records** (in each research repo): the scholar's own files plus a small visible `scholar/` folder.
   Usually Git-tracked.
3. **Local environment**: installed plugins and skills, editor setup, agent private memory, secrets. Never treated
   as shared state; Scholar never claims any agent's memory is synchronised.
4. **Contribution channel**: harvest proposals, reviewed and anonymised, then merged by a maintainer.

## One source, two adapters
Each skill exists once at `plugins/<pack>/skills/<name>/`.
- **Claude Code** installs through the marketplace (`.claude-plugin/marketplace.json`, four plugins). Skills appear
  namespaced (`scholar-core:catch-up`). The `hooks/` folder holds the SessionStart hook.
- **Codex** installs through `install/install.mjs`, which copies skill folders into the Codex skills directory
  (project: `.agents/skills`; user: `~/.codex/skills` if present, else `~/.agents/skills`; checked against the
  official Codex skills docs and `codex --help` on 2026-11-25). Each copy gets a `.scholar-method.json` marker
  (pack, version, source). The installer updates folders it owns, refuses to overwrite one without the marker,
  and supports `--uninstall`. Hooks are Claude only; in Codex the contract and `catch-up` do the same job.

Packs and skills (16): `scholar-core` (scholar-contract, scholar-start, catch-up, check-out, harvest, forge),
`scholar-research` (reflect, research, evidence, analyse, visualise), `scholar-writing` (draft, voice-review, cite),
`scholar-publish` (build, submission-check).

## Project records
```
scholar/
  scholar.json  PROJECT_MAP.md
  STATUS.md HANDOFF.md DECISIONS.md      only when the project has no equivalent
  insights/ claims/ visuals/ (sources/ only if no register)
  harvest/pending/  harvest/declined.md
```
`scholar.json` maps each role (status, handoff, decisions, sources, bib, style guide, drafts, assets, visual ledger,
asset register, boards, Quarto) to an existing
file. Scholar prefers pointing at the project's canonical files over creating new ones. Records are Markdown with
a YAML-subset frontmatter, specified in `scholar-contract/references/records.md` and checked by
`scholar.mjs validate`. IDs (`INS-0001`, `CLM-0001`, `SRC-0001`, `VIS-0001`) are allocated by the script; projects
with their own registers keep their IDs and list them in `external_ids`.
Acceptance and evidence are separate fields: an accepted insight is not a verified one.

## Precedence
Institution and venue rules, then accepted proposal and project decisions, then the project style guide, then the
scholar's writing profile, then Scholar defaults, then third-party tools (Humanizer). A project's own session or
agent protocols override Scholar's helper defaults.

## Deviations from the commission, and why
- **Visible `scholar/`, not `.scholar/`.** Ripgrep-based agent search skips hidden folders, so records would be
  invisible to the agents that need them.
- **Self-contained skill scripts.** Codex copies skill folders flat and Claude installs each plugin alone, so a
  skill must not import from another skill's folder. One CLI (`scholar.mjs`) lives in `scholar-start`; the other
  scholar-core skills call it by documented sibling path, which holds because the pack installs as a unit.
  The CLI itself imports nothing.
- **Insight capture is batched.** The commission asks for quiet capture of insights. Interrupting a thinking
  scholar to file each one defeats the purpose, so the agent keeps a short session list and reviews it with the
  scholar at a pause or at check-out (`capture: batch|ask|off`). Nothing is written without the scholar seeing it.
- **Humanizer provenance check.** Humanizer's SKILL.md does not name its source, so presence by folder name proves
  nothing. `doctor` reports the official plugin id (`humanizer@humanizer`) or a skills lock file as evidence, and
  labels anything else "unverified". A differently sourced skill called humanizer is reported as not blader's.
  Nothing is ever installed without the scholar's yes.
- **Studio Method coexistence.** The two methods have different session rules. Adoption offers a project-level
  `enabledPlugins` setting that disables `studio-core` there, and tells the owner the one global CLAUDE.md line to
  add. Scholar does not edit global files.
- **No SQLite, no vector search.** Markdown and JSON registries are enough for 0.1; the validator and ripgrep cover
  retrieval. Revisit if a real retrieval problem appears.
- **Fresh history.** Studio Method was the inspiration, not a parent: see NOTICE.md.

## Harvest flow
Three places hold knowledge: the project's own records (never shared), a portable proposal (`scholar/harvest/pending`),
and accepted method knowledge (the method repo). `harvest.mjs` moves a proposal between them only on explicit steps:
`new`, `check --pass` (privacy scan, bound to a hash of the text), `approve`, then `bundle` (a file for a PR or issue) or
`promote` (a local branch and commit of `harvest-inbox/<id>.md` in a method checkout). It never pushes and never adds a
remote. The maintainer applies a proposal by hand with `forge`. Projects never read each other's records.

## Suggested vs implemented
| Commission suggestion | What we built | Why |
|---|---|---|
| `.scholar/` hidden folder, `.scholar/project-map.md` | Visible `scholar/` with `scholar.json` and `PROJECT_MAP.md` | Ripgrep-based agent search skips hidden folders |
| Quiet capture of each insight | Batch review at a pause or at check-out (`capture: batch\|ask\|off`) | Interrupting a thinking scholar defeats the purpose; nothing is written unseen |
| Skills such as explore, ingest, verify-source, evidence-map, map, challenge, review, revision-response, format-check, publication-map | 16 skills: reflect, research, evidence, analyse, visualise, draft, voice-review, cite, build, submission-check, plus six core | Smallest set that covers the milestones; the rest are on the roadmap. Source verification lives in `research` and `evidence`, challenge in `reflect` |
| Shared libraries across skills | Self-contained skill scripts; one CLI in `scholar-start` | Codex copies skill folders flat and Claude installs each plugin alone |
| Portable proposal fields in an outbox | `harvest.mjs` with the doc 03 fields plus `title` and `privacy_hash` | The hash ties a passed privacy review to the exact text; any edit invalidates it |
| Optional promotion into the method repo | `promote` makes a local branch and a commit of `harvest-inbox/<id>.md`; never pushes; `bundle` for contributors | The maintainer applies a proposal with `forge`; auto-editing skills would bypass review |
| Humanizer detection | `doctor` with provenance labels; consent flow in `scholar-start` | Its SKILL.md does not name its source, so presence by folder name proves nothing |
| Studio Method coexistence | Project `enabledPlugins` setting plus one global CLAUDE.md line, both shown and never applied by Scholar | Two methods with different session rules must not both load |
| Hook-based continuity for Claude and an equivalent for Codex | Claude SessionStart hook; in Codex the contract and `catch-up` read the same files | Codex has no hook in the same form; the files are the shared source of truth |
| SQLite or vector retrieval (considered) | Markdown, JSON and `validate` | Enough for 0.1; revisit on a real retrieval problem |
| Visual libraries (Vega-Lite, Cytoscape.js, Mermaid, Excalidraw, later MapLibre and Three.js) | Vega-Lite, Cytoscape, Mermaid and an Excalidraw template with provenance sidecars; MapLibre and Three.js deferred | Start small; spatial and 3D only on demand and after asking |

## Pinned versions and platform notes
- Visual pages load `vega@6.4.0`, `vega-lite@6.5.0`, `vega-embed@7.3.0` and `cytoscape@3.35.0` from jsDelivr (vega-embed 7.4.0
  was under two weeks old when checked; versions confirmed on npm and jsDelivr on 2026-11-25). Headless SVG:
  `npx -y -p vega@6.4.0 -p vega-lite@6.5.0 vl2svg <spec> <out.svg>` (no node-canvas needed; `data.url` resolves against the spec folder).
- Codex project skills live in `.agents/skills` (official docs). The docs name `~/.agents/skills` for user level, while this
  machine has `~/.codex/skills`, so the installer prefers that folder when it exists.
- Tests spawn git and set `HOME` and `USERPROFILE` to temp folders for `doctor` and the installer.
