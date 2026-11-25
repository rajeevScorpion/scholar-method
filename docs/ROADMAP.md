# Roadmap

0.1.0 ships four packs, 16 skills, the scholar and harvest CLIs, the hook and the Codex installer.

## Next release (0.2)
1. **format-check** (scholar-publish): check a built manuscript against a venue or university format (page, margins,
   front matter order, reference style) from the project's own rules.
2. **publication-map** (scholar-publish): which parts of a thesis feed which papers, with overlap and contribution notes.
3. **Author-date text citations in `cite`:** resolve "(Author, 2020)" in prose to bib keys, not only `@key` forms.
4. **Number words in `fact-guard`:** treat "three" and "3" as the same protected item.
5. **Excalidraw export helper:** write a board from evidence records into `scholar/visuals/`, never over a project board.
6. **MapLibre and Three.js adapters, on demand:** only for spatial or truly three-dimensional data, with a 2D or static
   equivalent and after asking the scholar.
7. **Semantic search, only if needed:** if ripgrep plus `validate` stops being enough on a large project.
8. Real Codex continuity run once a current Codex CLI is available; a browser check of the generated HTML viewers.

## Later, if a need is shown
Migration notes between method versions; more discipline-specific writing profiles; more agent adapters; `related_projects`
support in harvest (opt-in, named projects only).

## Not planned
An autonomous thesis writer; primary data collection; automatic sharing of any scholar's insights.
