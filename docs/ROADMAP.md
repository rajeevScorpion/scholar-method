# Roadmap

Stage 1 (this repo today): scholar-core, the CLI, the hook, the Codex installer and tests.

## Next, in order
1. **harvest.mjs** (`check`, `bundle`): privacy scan of proposals and a contribution bundle export.
2. **scholar-research 0.1**: `explore`, `research` (secondary sources with read status), `ingest`, `verify-source`,
   `evidence-map`, `challenge`, `map`, `analyse`, `visualise`.
3. **scholar-writing 0.1**: `draft` (evidence-gated, author-directed), `voice-review` (writing profile, light
   linter for dashes and Oxford commas that skips quotes, citations, code and YAML), `cite`, `review`,
   `revision-response`. Tests: an AI-sounding abstract, citation and number preservation, a journal style override.
4. **scholar-publish 0.1**: `build` (Quarto, Word, PDF), `format-check`, `submission-check`, `publication-map`.

## Visual research (inside scholar-research)
Start small: Vega-Lite for evidence-linked charts, Cytoscape.js for relationship networks, Mermaid for diagrams, and
the scholar's existing Excalidraw files. Each substantive visual keeps a sidecar record (inputs, transforms, spec,
sources, limitations, exports). MapLibre and Three.js only when the data is spatial or truly three-dimensional, and
only after asking. No dependency is required in every project.

## Later, if a need is shown
Migration notes between method versions; a retrieval index; more discipline-specific profiles; more agent adapters.

## Not planned
An autonomous thesis writer; primary data collection; automatic sharing of any scholar's insights.
