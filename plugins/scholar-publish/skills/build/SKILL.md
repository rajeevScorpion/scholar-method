---
name: build
description: Build the manuscript with the project's own pipeline after a preflight that checks prose lint, citations, figure approval and leftover gap markers. Detects a Quarto project and runs what the project's own instructions say; never invents a build. Reports problems, never fixes them silently. Use when the user says "build the paper", "render the thesis", "quarto render", "make the PDF", "build for submission", "compile the manuscript", "preflight", or "is this ready to build".
---

# Build (preflight, then the project's own build)

Goal: a build the scholar can trust, and a clear list of what is not ready. Outputs (PDF, HTML, DOCX) are derived
artefacts; the Markdown or Quarto source is the truth. Ask means AskUserQuestion in Claude Code, a plain question
in Codex. Load `scholar-contract` first. `$SCHOLAR` is `scholar-start/scripts/scholar.mjs`. `$SKILL` is this skill folder (Claude Code:
`${CLAUDE_PLUGIN_ROOT}/skills/build`).

## 1. Mode
Ask once if unclear: **draft build** (a working render, gaps allowed) or **submission build** (no gap markers, all
figures approved). Default: draft. A submission build also needs the `submission-check` checklist.

## 2. Find the project's own build
1. Read the project's `AGENTS.md` or `CLAUDE.md`, the README and the mapped handoff for a build command. What they say
   wins.
2. No instructions? `_quarto.yml` (or `.yaml`) means `quarto render` from the repo root. Anything else (LaTeX, a
   Makefile, an npm script, Pandoc): use only what the repo already contains and say what you found. Nothing
   recognisable: stop and ask. Never invent a pipeline, and never install a toolchain without a yes.
3. Run `node $SCHOLAR doctor` (add `--json` to read it). Its Quarto line gives the version, Quarto's own Pandoc and PDF
   readiness: Typst is bundled with Quarto 1.4 and later, so a PDF build needs nothing else unless the project
   asks for LaTeX (then TinyTeX or another TeX is needed; `quarto list tools` shows TinyTeX).
4. Quarto missing: stop and ask. Tell the scholar the official route (https://quarto.org/docs/get-started/; on Windows
   `winget install --id Posit.Quarto`) and that installing is their yes to give. Never install it yourself. Without
   Quarto, only the preflight and the writing checks can run.
5. Render targets (`html`, `docx`, `pdf` or `typst`) are whatever the project's `_quarto.yml` or instructions define;
   pass `--to <format>` only when they say so. Quarto reads `csl:` for the citation style (skill `cite`).

## 3. Preflight (report, do not fix)
Run these in order, from the repo root, and keep the output:
1. `node $SKILL/scripts/preflight.mjs --root . [--submission] [files...]`. It checks, without building anything:
   - `[GAP: ...]` markers in the manuscript (warn in a draft build, error with `--submission`);
   - every figure that has a sidecar in `scholar/visuals` is `approved` or `manuscript-ready` (warn otherwise);
     figures with no sidecar are advisory (concept sketches and untracked images: confirm rights and approval);
   - citation style: a bibliography with no `csl:` (Pandoc then falls back to Chicago author-date, not APA 7), a
     `csl:` file that is missing, or one that differs from `citation.style` in `scholar.json` (all warn; fix them
     with `style.mjs` of the `cite` skill, never by hand-editing a style);
   - the detected build command, and where the writing-pack scripts below live. It prints their exact commands
     under "run first".
2. The two commands it prints: `lint-prose.mjs <manuscript files>` (skill `voice-review`) and
   `check-citations.mjs --root .` (skill `cite`). Run both. If the writing pack is not installed, say so and
   continue with the remaining checks; do not skip silently.
3. `node $SCHOLAR validate` (scholar-start's CLI) so claim and visual records are consistent.
Add `--strict` to any script to get exit code 1 on findings.

## 4. Decide
- Errors (missing citekeys, gap markers in a submission build, unknown claims): do not build for submission. List
  them with file and line and ask the scholar how to proceed.
- Warnings (unapproved figures, lint hits, quotes without locators): show them, then ask whether to build anyway
  for a draft. Never build a submission with unapproved figures.
- Advisory notes: mention in one line.
Do not edit manuscript text, the `.bib` or sidecars to make the checks pass. Offer the fix list instead.

## 5. Build
1. Run the project's command, in the project's own way (output folder, profile, `--to` formats as its instructions
   say). Keep the log; show errors and warnings from the tool, not a summary of your own.
2. Build artefacts are derived. Do not commit them unless the project already tracks them; say where they are.
3. Failure: report the first real error and the likely file; do not retry with invented flags.

## 6. Report (short)
Mode, command run, preflight result by severity, build result and output location, what the scholar must decide.
Note any figures or gaps still open. No claim that the document is "ready" unless a submission build passed and the
`submission-check` list is complete.

## 7. Done means
Preflight output shown, the project's own build run (or the reason it was not), problems reported not hidden, and no
source file changed by the build step.
