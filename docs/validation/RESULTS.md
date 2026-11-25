# Validation results (0.1.0)

Run on 2026-11-25, Windows 11, Node 22.17.0, git 2.50.0, Claude Code CLI (`claude plugin validate`). All tests use
synthetic fixtures copied to temp folders. "Pass" means the command exited 0 on `main` at the release commit.

## Commands
| Check | Command | Result |
|---|---|---|
| Whole suite | `node --test` | pass, 71 tests, 0 failed, 0 skipped on this machine (the SVG export test skips itself when `npx` or the network is missing) |
| Marketplace manifest | `claude plugin validate .` | pass |
| Each pack manifest | `claude plugin validate plugins/<pack>` for the four packs | pass |
| Versions agree | `tests/repo.test.mjs` (plugin.json, marketplace entry, `VERSION` in scholar.mjs, descriptions equal, no "coming" wording) | pass |
| Skill standards | `tests/repo.test.mjs`: exactly the 16 expected skills, `name` equals folder, "Use when" in the description, at most 150 lines | pass |
| Style of public prose | `tests/repo.test.mjs`: no em dashes in tracked Markdown (skips `examples/writing`, which holds deliberate "before" samples, `tests/fixtures` and `private/`) | pass |

## Tests by area
| File | Tests | Covers |
|---|---|---|
| `scholar.test.mjs` | 12 | `init` dry run writes nothing; adoption maps equivalents, touches nothing outside `scholar/`, is idempotent; new-paper layout; ID allocation; `validate` errors and warnings; `writing` default object and type-check; numbered-folder, Markdown-chapter, ledger and board detection; `external_ids` from a register; `doctor` Humanizer provenance and studio-core |
| `hook.test.mjs` | 3 | session hook silent without `scholar/`, prints handoff lines and counts, works from a subfolder |
| `install.test.mjs` | 4 | Codex installer dry run, install of all 16 skills with markers, update, uninstall of owned folders only, collision refusal, `--project`, `--global`, `--packs` |
| `harvest.test.mjs` | 6 | `new` fields from the template; privacy scan rules; check, pass and approve bound to a text hash; decline and no re-offer; bundle; promote to a temp method checkout (local branch, commit, no remote, refusals) |
| `scenarios.test.mjs` | 7 | commission demonstrations, see below |
| `research-*.test.mjs` | 11 | evidence graph builder, Vega-Lite, Mermaid and Cytoscape renderers, the synthetic research example |
| `writing-*.test.mjs` | 19 | prose linter, fact guard, citation checker, the four writing examples |
| `publish-preflight.test.mjs` | 4 | build preflight |

## Commission milestones (`05_VALIDATION_AND_HANDOFF.md`) and harvest scenarios (`03_HARVEST_AND_PORTABILITY.md`)
| Item | Evidence | Status |
|---|---|---|
| M1 independent repo, attribution, licence, manifests, versions | `NOTICE.md`, `LICENSE`, repo tests, `claude plugin validate` | pass; it is a fresh-history copy, not a fork |
| M2 understanding-first adoption, idempotent, uncommitted work preserved | `scholar.test.mjs`, `scenarios.test.mjs` "milestone 2" | pass (dry run writes nothing; second apply changes nothing; the modified and untracked files are untouched) |
| M3 cross-agent continuity | `scenarios.test.mjs` scenario 6 (a clone carries only repo files; hook and CLI recover; Codex install lands 16 skills and the installed copies run); `docs/validation/claude-continuity.md` (real `claude -p` run) | pass for files, hook, CLI and one real Claude run; no real Codex run, see limitations |
| M4 scholar-led conversation; a hypothesis stays a hypothesis after a new session | `scenarios.test.mjs` "milestone 4" on `examples/research`; `research-example.test.mjs` | pass for recovery and records; the conversational behaviour itself is skill text, not testable by script |
| M5 credible workflow (source, claim, RQ, citations, missing-data gate) | `writing-cite`, `research-graph`, `writing-examples` tests, `examples/writing/04-evidence-to-draft` | pass for the mechanical parts |
| M6 writing contract | `writing-lint`, `writing-factguard`, `writing-examples` (AI-sounding abstract, citation and number preservation, journal override) | pass; Humanizer was not installed or run |
| M7 harvest portability and privacy | `harvest.test.mjs`, `scenarios.test.mjs` 1 to 6 | pass |
| M8 visual research | `research-render`, `research-graph` tests, `examples/research/visuals` | pass; see limitations |
| M9 thesis and paper adoption notes | `private/thesis-dry-run.md` (local, gitignored), `docs/ADOPTING-AN-EXISTING-THESIS.md`, `docs/ADOPTING-A-PAPER.md` | dry run done read-only; the thesis repo status was identical before and after |
| Harvest 1 and 2: from a thesis fixture and from a paper fixture, records kept apart | `scenarios.test.mjs` | pass |
| Harvest 3: an approved item shared without project material | bundle checked for IDs, terms, paths | pass |
| Harvest 4: a declined item never bundles, never promotes, is not re-offered | `scenarios.test.mjs`, `harvest.test.mjs` | pass |
| Harvest 5: no upstream permission | promote stays local, no remote, no push call in the script; the bundle route | pass |
| Harvest 6: a fresh session on another agent | clone from committed files; hook and `status` show the pending proposal and the pending hypothesis | pass |

## Limitations
- **Real Codex run not done.** The local Codex CLI is 0.29.0 and its global config fails to load with it (an unknown
  `model_reasoning_effort` value, an MCP server entry without `command`); after overriding those on the command line the
  configured model was rejected for the ChatGPT account. Codex continuity is therefore shown only through the installer
  and the installed scripts, not through a live Codex session.
- **Claude continuity** is one run of one model with read-only tools and Scholar Method not installed in that session.
- **HTML viewers were not opened in a browser.** The Vega-Lite and Cytoscape pages are generated and their JSON specs
  are checked; rendering in a browser was not verified.
- **Mermaid was parsed, not rendered** (syntax check with mermaid@12.3.0 in a scratch folder). The Excalidraw template
  was not opened in Excalidraw.
- **SVG export** depends on `npx` and the network (`vl2svg`); the test skips itself without them.
- **Oxford comma detection is a heuristic.** `likely` findings need a human look; the AI-register check is advisory only.
  Word-form numbers and paraphrased claims are not detected by the fact guard.
- **The privacy scan is a net, not a judge.** It finds emails, phone-like numbers, local paths, long quotes, listed terms,
  project IDs and 8-word overlaps. Names, institutions and topic details that are not in `harvest.deny_terms` will
  pass; the scholar reading the final text is the real review. `privacy_review: passed` and `owner_approval: yes` record
  that a script and a prompt ran, not that a human really read the text.
- **Harvest `promote`** needs `git` and a configured `user.name` and `user.email` in the method checkout.
- **Skill behaviour** (reflect, research, draft and the rest) is instruction text. Tests cover the scripts and the file
  formats, not how a given model follows the text.
- Windows was the only platform exercised.
