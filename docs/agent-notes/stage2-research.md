# Stage 2 notes: scholar-research (helper)
**Done:** graph.mjs (evidence map), render.mjs (Vega-Lite viewer, SVG, VIS sidecar), examples/research (synthetic), tests research-*.
**In progress:** the five SKILL.md files and references; example README.
**Next:** main session reviews; repo.test.mjs hard-codes 6 skills (needs updating when packs land).
**Gotchas:** pinned vega@6.4.0, vega-lite@6.5.0, vega-embed@7.3.0 (7.4.0 is under 2 weeks old), cytoscape@3.35.0; checked on npm and jsDelivr 2026-11-25.
SVG: `npx -y -p vega@6.4.0 -p vega-lite@6.5.0 vl2svg spec out.svg` works headless (no node-canvas); data.url resolves against the spec's folder.
Tool layer halves backslashes in heredocs and Write content: use String.raw or [(]-style classes in test regexes.
