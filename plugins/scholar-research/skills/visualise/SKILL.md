---
name: visualise
description: Evidence-linked charts, timelines, relationship maps and method diagrams for a scholar's inquiry, chosen by what the question needs rather than what looks impressive. Follows question, evidence class, inspect, simplest form, render, interrogate, preserve, export; defaults to Vega-Lite for charts, Cytoscape.js and Mermaid for networks, Mermaid for method diagrams; every substantive visual gets a sidecar record, caption and alt text. Keeps observed versus hypothesis, available versus target sample, and co-occurrence versus cause visibly apart. Use when the user says "visualise", "visualize", "chart it", "map it", "plot this", "make a figure", "timeline", "show me how X changed over time", "relationship diagram", "network of", "method diagram", "concept map", "can this be shown in 3D", or wants to see a pattern, gap or connection.
---

# Visualise

Goal: the scholar can see, question and trace something in their evidence. A figure is a claim, so it keeps its
inputs, its method and its limits. Not a dashboard, not decoration. Ask means AskUserQuestion in Claude Code, a
plain question in Codex. Scholar CLI (`$SCHOLAR`), found once: in Claude Code the session-start line `Scholar CLI
($SCHOLAR): node "<path>"`; in Codex `scholar-start/scripts/scholar.mjs` beside the other Scholar skills.
Scripts here: `scripts/render.mjs` (Claude Code: `${CLAUDE_PLUGIN_ROOT}/skills/visualise/scripts/render.mjs`).
Load `scholar-contract` first. Libraries, versions and licences: `references/libraries.md`. Templates:
`references/sketches.md`.

## 1. Understand and classify
1. What does the scholar want to see: a distribution, a comparison, a chronology, a relationship, a process, a
   place, a structure? One brief suggestion is enough; no questionnaire. Which insight or RQ does it serve?
2. Evidence class (say it out loud, and never merge classes invisibly): `coded-observations` or other supplied
   data; secondary-source extraction; records (insights, claims, sources); author hypothesis; concept sketch.
3. Check what exists in the project: a visual asset ledger, an Excalidraw board, an assets folder, a figure
   style. Map and reuse them; never replace the scholar's boards. Acquiring new image files needs their yes.
   An existing ledger or numbering is the system of record: register the visual there under its next ID, in
   its own format. If it lacks fields Scholar needs (inputs, spec, transforms, status, exports), propose adding
   those columns to the ledger (ask first) rather than starting a parallel register.

## 2. Inspect before drawing
4. Check schema, units, date range, sample sizes, missing values, duplicates, rights, and whether the data is
   actually available (skill `analyse` step 4). Refuse to chart a fictional or merely planned sample as if
   observed. Never invent, fill or interpolate rows to make a chart look complete.

## 3. Choose the simplest honest form
5. Prefer a basic chart or table over spectacle. Defaults:
   - chart, distribution, comparison, timeline: **Vega-Lite** (JSON spec, data by relative path);
   - evidence or citation network from records: **Cytoscape.js** (interactive) plus **Mermaid** (static); use the
     `evidence` skill's `graph.mjs`;
   - method, process, decision flow: **Mermaid** (text, diffable, renders in Quarto, GitHub, GitLab);
   - hand-drawn thinking: the scholar's **Excalidraw**; you may write a `.excalidraw` JSON concept sketch with
     uncertain links dashed, but the scholar opens it in Excalidraw, checks it and exports SVG or PNG; say so.
     Do not claim an export you did not make.
   - **MapLibre** or **Three.js** only after asking whether space or depth adds analytic value (a place, a
     measured spatial layout). Always offer a 2D or tabular equivalent. Never use a map for non-geographic links.
6. If the project already has a plotting pipeline (Python, R, Quarto) that makes reliable figures, use it and
   still write the sidecar.

## 4. Render
7. Chart: write the spec at `visuals/specs/<name>.vl.json` (or the project's convention) with `data.url` a
   relative path to the data file, a title, a `description` (alt text) and axis titles with units. Then
   `node scripts/render.mjs <spec> --svg --out-dir <dir> --sidecar VIS-000N` (allocate the ID first:
   `node $SCHOLAR new visual --title "..."`). It checks the data files exist, inlines data into a pinned-version
   HTML viewer (CDN, needs network to view), exports SVG headlessly through `npx` (needs Node, npx and network on
   the first run) and writes or refreshes the sidecar with the input row count. If SVG export fails, say so;
   offer the HTML and the spec, and do not claim an image.
8. Network: `node ${CLAUDE_PLUGIN_ROOT}/skills/evidence/scripts/graph.mjs --root <repo>` (Codex: `evidence/scripts/graph.mjs` beside this skill folder; see skill `evidence`). Method diagram: write a
   `.mmd` from `references/sketches.md`.
9. Do not claim an interaction works if it is only a mockup. Say what you rendered and what you did not check.

## 5. Three distinctions that must show in the figure or caption
10. **Observed versus hypothesis:** a different mark style (dashed, hollow) plus a legend, never one style for
    both. Uncertain links are dashed.
11. **Available versus target corpus:** a planned sample is not observations. Draw no rows for target-only cells;
    show the target as a separate, labelled mark if at all, and name empty cells in the caption.
12. **Co-occurrence versus cause:** no arrow labelled caused or influenced without documented evidence. If the
    scholar asks for a causal picture the data cannot support, decline plainly, say what is missing (for example
    "no acquired editorial artefacts for P3; SRC-0003 argues against influence") and offer an honest alternative:
    side-by-side counts, a chronology with gaps marked, or an arrow-free map.

## 6. Interrogate with the scholar
13. Invite them to filter, compare periods, inspect outliers, reveal source links, change or challenge a link.
    Distinguish a visible pattern from an interpretation, and offer one rival reading. Update the figure from
    their changes through the spec, not by hand-editing an image.

## 7. Preserve and export
14. Every substantive visual gets a provenance record: in the project's own ledger when one exists (step 3),
    otherwise a sidecar `scholar/visuals/VIS-000N.md` (`records.md`). A sidecar for a ledgered visual reuses the
    ledger ID (or names it in the body when its shape differs). Status `exploratory`
    until the scholar says otherwise, `review_status: author-review-needed`, `evidence_class`, `input_refs`,
    `transforms`, `render_spec`, `limitations`, `assumptions`, `exports`. Concept sketches use
    `evidence_class: concept` and are captioned as sketches. Body: caption and alt text (what is shown, sample
    and period coverage, observed versus target, hypothesis marks).
15. Accessibility: colour-independent encodings (shape, dash, label), enough contrast, readable at print size,
    alt text, and a text or table equivalent. Axes honest: no truncated bars, no interpolated missing periods, no
    smoothing away negative cases; sample sizes shown where they matter.
16. Putting a figure into a submission document, uploading data to a remote charting service or publishing an
    interactive page needs the scholar's approval and the venue's rules. Do none of these unasked.
17. `node $SCHOLAR validate`. Update the mapped status. Local commit only.

## Never
- Never alter, hide or fabricate data; never present a concept sketch as a result; never draw an unevidenced
  causal arrow; never put confidential or participant data in a spec or sidecar in a public repo.

## Done means
The figure traces to real inputs and a rerunnable spec, the three distinctions are visible, a caption, alt text and
sidecar exist, and the scholar knows what was and was not checked.
