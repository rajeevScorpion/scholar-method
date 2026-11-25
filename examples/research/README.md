# Example: scholar-research (synthetic test fixture)

Everything here is invented: the sources, claims, insights, data, periods and the question. No real research,
no real DOIs. It exists to show the pack working end to end. Check it with
`node plugins/scholar-core/skills/scholar-start/scripts/scholar.mjs validate --root examples/research`.

## What is in it
- `scholar/`: config, 2 insights, 3 claims, 3 sources, 3 visual sidecars, the evidence map (`.mmd`, `.cyto.json`, `.html`).
- `data/synthetic_artefacts.csv`: 23 coded rows, all `acquired`. `data/synthetic_targets.csv`: the planned target (6 per cell), kept apart.
- `visuals/specs/acquired_by_period.vl.json` and `visuals/exports/` (HTML viewer, SVG), `visuals/method_diagram.mmd`.

## Doc 06 scenarios
- **A, free talk (`reflect`):** a loose hunch becomes INS-0001, a hypothesis, `pending`, evidence `none`. The reply
  mirrors it, offers a rival (shared tooling, as in INS-0002) and proposes a search and a coding table. No prose drafted.
- **B, secondary research (`research`):** SRC-0001 and SRC-0003 are `full-text-reviewed`, SRC-0002 is `abstract-only`
  (a lead). Each has provenance, limits and no DOI because none was seen. INS-0002 links the sources as leads.
- **C, analysis and visual (`analyse`, `visualise`):** the CSV is inspected, then charted by `render.mjs` with a
  sidecar (VIS-0001). Bars are observed counts; ticks are the target. Interpretation stays out of the chart.
- **D, a fresh session:** `scholar/HANDOFF.md` and the records give back INS-0002 as "accepted as a working
  hypothesis, evidence leads only", not as a finding. Run `node <scholar.mjs> status --root examples/research` to see it.

## Doc 05 milestone 8
- Chart: CSV + spec + HTML viewer + SVG + caption + sidecar, all synthetic-labelled. Vega-Lite was chosen as the
  simplest declarative form that keeps data and spec together.
- Evidence map (`evidence/scripts/graph.mjs`): CLM-0001 is solid (claim-checked), CLM-0002 is dotted (unverified),
  CLM-0003 is a red dash-dot "challenges" edge. Every edge is a link written in a record.
- Method diagram: `visuals/method_diagram.mmd` (Mermaid), a concept sketch, sidecar VIS-0003.
- Rebuild: `node plugins/scholar-research/skills/visualise/scripts/render.mjs examples/research/visuals/specs/acquired_by_period.vl.json --svg --out-dir examples/research/visuals/exports --sidecar VIS-0001`
  and `node plugins/scholar-research/skills/evidence/scripts/graph.mjs --root examples/research`.

## The declined causal arrow
Asked "draw that the interface style caused the editorial style", the assistant declines. Period P3 editorial has a
target but no acquired rows, so there is nothing to compare there. SRC-0003 (CLM-0003) argues against inferring
influence, and CLM-0002 ("interface led editorial") has no verified support. Co-occurrence in counts is not cause.
It offers instead: the side-by-side counts already charted, a chronology with P3 marked as a gap, and an arrow-free
map. The gate stays on record: "no verified support for interface-led; no editorial data for P3".
