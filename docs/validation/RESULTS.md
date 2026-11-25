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
| M3 cross-agent continuity | `scenarios.test.mjs` scenario 6 (a clone carries only repo files; hook and CLI recover; Codex install lands 16 skills and the installed copies run); `docs/validation/claude-continuity.md` (real `claude -p` run) | pass for files, hook, CLI, one real Claude run and one real Codex run (`docs/validation/codex-continuity.md`) |
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

## Citation styles and Quarto (0.1.3)
Run on 2026-11-25, Windows 11, Node 22.17.0, Quarto 1.10.18 (Pandoc 3.10, Typst 0.15.1 bundled; TinyTeX not installed).
Fixture: `tests/fixtures/quarto-styles` (invented authors and sources, no DOIs). Each render test copies it to a temp
folder, switches the style with `style.mjs use ... --apply`, renders, asserts on the output text and removes the folder.
| Check | Command | Result |
|---|---|---|
| Whole suite | `node --test` | pass, 102 tests, 0 failed, 1 skipped (the network test, unless `SCHOLAR_NET_TESTS=1`) |
| Marketplace and four packs | `claude plugin validate .` and `claude plugin validate plugins/<pack>` | pass |
| APA 7 render, HTML | `quarto render index.qmd --to html` after `use apa-7 --apply` (bundled `apa.csl`) | pass: "(Verma, 2019, p. 14)", "Okafor (2021)", "(Lindqvist & Rao, 2020)", "(Baker et al., 2018; Verma, 2019)", APA reference list |
| APA 7 render, DOCX | same, `--to docx`, text read from `word/document.xml` | pass, same in-text forms and reference entries |
| Numeric style render, HTML and DOCX | `use csl/ieee.csl --apply` (IEEE vendored in the fixture), `--to html` and `--to docx` | pass: "[1, p. 14]", "[1], [4]", numbered reference list; the `.qmd` source is byte-identical before and after the switch |
| Convert, then render | typed "(Verma, 2019, p. 14)" and two more patterns, `convert --apply`, render under APA | pass: rendered text equals the original typed text |
| PDF via Typst | `quarto render index.qmd --to typst -M keep-typ:true` | pass: a valid PDF (`%PDF-` header); the `.typ` source carries `#set bibliography(style: "csl/apa.csl")`. The PDF's inner text was not extracted, so the citation text is checked in HTML and DOCX only |
| Doctor with Quarto | `scholar.mjs doctor --json` | pass: version, Pandoc, Typst, `pdf_ready` true via Typst |
| Doctor without Quarto | `SCHOLAR_QUARTO=<missing>` | pass: `present: false`, install route printed, nothing installed |
| Render tests with no Quarto on PATH | `node --test tests/quarto-render.test.mjs` with a PATH holding only Node and system tools | 5 skipped with the message "quarto is not on PATH: install it from https://quarto.org/docs/get-started/ ...", the missing-Quarto doctor test passes |
| Download from the pinned commit | `SCHOLAR_NET_TESTS=1 node --test tests/citation-style.test.mjs` (`use mla-9 --apply`) | pass: `modern-language-association.csl` fetched at `f123868a546e6e7cec10e808ae04ef0e52bf2210`, `csl:` set |
| `style.mjs` unit tests | `tests/citation-style.test.mjs` (15 tests) | pass: status warning with no CSL, dry runs write nothing, minimal `_quarto.yml` edits (LF and CRLF, comments kept), per-style `fields`, `convert` proposals and apply rules, numeric mapping, `narrative` flags |

Not verified: the other styles (MLA, Chicago, Harvard, Vancouver) were not rendered, only fetched in one case (MLA);
LaTeX PDF output (TinyTeX is not installed here); the exact wording of each CSL against the printed manuals.

## Limitations
- **Real Codex run done after updating the CLI.** The old npm Codex CLI (0.29.0) could not read a config written by the
  newer Codex app; updating to 0.172.0 fixed it with no config change. See `docs/validation/codex-continuity.md`.
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
