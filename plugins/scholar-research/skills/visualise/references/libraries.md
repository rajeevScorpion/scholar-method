# Libraries: versions and licences

Checked on 2026-11-25 against the npm registry (`npm view <package> version license`) and, for the pinned ones,
by fetching the file from jsDelivr (HTTP 200). Official docs are the authority for behaviour; re-check versions
and licences before using a library in a new environment. Pin an exact version in any shipped page, and prefer a
release at least two weeks old.

## In use (pinned in the scripts)
| Need | Library | Pinned | Latest on npm | Licence | Used by |
|---|---|---|---|---|---|
| Charts, timelines, comparisons | Vega | 6.4.0 | 6.4.0 | BSD-3-Clause | `render.mjs` (viewer and SVG export) |
| | Vega-Lite | 6.5.0 | 6.5.0 | BSD-3-Clause | `render.mjs` (viewer and SVG export, `vl2svg`) |
| | Vega-Embed | 7.3.0 | 7.4.0 | BSD-3-Clause | `render.mjs` viewer (7.4.0 was published 2026-11-20, under two weeks old at the check) |
| Evidence networks | Cytoscape.js | 3.35.0 | 3.35.0 | MIT | `graph.mjs` viewer (also on cdnjs) |
| Static diagrams | Mermaid | not loaded | 12.3.0 | MIT | `.mmd` text; GitHub, GitLab and Quarto render it themselves |

SVG export: `npx -y -p vega@6.4.0 -p vega-lite@6.5.0 vl2svg spec.vl.json out.svg`. The `vl2svg` command ships in
the `vega-lite` package; `vega` is its peer. Verified on 2026-11-25 to run headless without node-canvas and to
resolve `data.url` relative to the spec's folder. PNG would need node-canvas; this pack does not do PNG.

## Available on request (not pinned, not loaded by default)
| Need | Library | Latest on npm at check | Licence | Use only when |
|---|---|---|---|---|
| Geographic data | MapLibre GL JS (`maplibre-gl`) | 6.19.0 (2026-11-17) | BSD-3-Clause | the question is spatial; needs basemap or tile data and attribution; offer a static map or table |
| Spatial or 3D structure | Three.js (`three`) | 0.187.0 (2026-10-30) | MIT | depth carries meaning; offer 2D views; WebGL does not render in a PDF |
| Bespoke visual grammar | D3 (`d3`) | 7.9.2 | ISC | simpler tools cannot represent the evidence honestly |
| Alternative charts | Apache ECharts (`echarts`) | 6.1.0 | Apache-2.0 | its interaction types fit much better than Vega-Lite |
| Node-based editors | React Flow (`@xyflow/react`) | 13.0.3 | MIT | scholars must move and connect nodes in an app |
| Hand sketching | Excalidraw (`@excalidraw/excalidraw`) | 0.18.1 | MIT | the scholar's own boards; this pack only writes concept-sketch JSON |

Before using any of these: ask the scholar, pin an exact version at least two weeks old, record it in the sidecar
(`assumptions` or notes), keep an accessible 2D or tabular equivalent, and note data and tile licences.
Installing a package or loading a remote service needs the scholar's yes.
