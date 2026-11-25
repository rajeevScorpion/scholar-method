# Stage 2 notes: scholar-research (helper)
**Done:** 5 skills (reflect, research, evidence, analyse, visualise) with references; graph.mjs; render.mjs; examples/research (synthetic) with README; tests research-*. validate and own tests green.
**In progress:** nothing.
**Next:** main session reviews. Needs from core: repo.test.mjs asserts exactly 6 skills (now 11+ with research; update the count); plugin.json and marketplace description still say "Skills are coming".
**Pins:** vega@6.4.0, vega-lite@6.5.0, vega-embed@7.3.0 (7.4.0 is under 2 weeks old), cytoscape@3.35.0; checked on npm and jsDelivr 2026-11-25.
**SVG:** `npx -y -p vega@6.4.0 -p vega-lite@6.5.0 vl2svg spec out.svg` runs headless without node-canvas; data.url resolves against the spec folder.
**Gotchas:** bash heredocs and Edit halve backslashes (use String.raw or [(]-style regex classes in tests). Mermaid output was syntax-checked with mermaid@12.3.0 parse in a scratch folder, not rendered; Excalidraw template untested in Excalidraw.
