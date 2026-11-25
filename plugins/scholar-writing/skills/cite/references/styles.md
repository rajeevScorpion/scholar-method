# Citation styles: detail for the cite skill

## The model
- Sources live in a `.bib` (BibTeX or BibLaTeX) or a CSL-JSON file. Citations in the text are Pandoc citekeys:
  `[@verma2019]`, `[@verma2019, p. 14]`, `[@baker2018; @verma2019]`, `@okafor2021` (narrative), `[-@verma2019]`
  (year only). Pandoc and Quarto format them with a CSL file named by `csl:`.
- The style is therefore one line of configuration. Rendering the same source under `apa.csl` gives
  "(Verma, 2019, p. 14)" and under `ieee.csl` gives "[1, p. 14]"; the manuscript text is unchanged. The render tests in
  `tests/quarto-render.test.mjs` show exactly this.
- `scholar.json` keeps the choice: `"citation": {"style": "apa-7", "csl": null}`. `csl` is null until a CSL file has
  been set up in the project; `style.mjs use` then records its path. Older projects may carry only
  `profile.citation_style`; `citation.style` wins when both exist.
- Precedence: venue or institution rules, then a project decision the scholar recorded, then APA 7.

## Style ids and official CSL files
| id | CSL file | in-text form |
|---|---|---|
| `apa-7` | `apa` (bundled in `references/csl/`) | author-date |
| `mla-9` | `modern-language-association` | author and page |
| `chicago-author-date` | `chicago-author-date` | author-date |
| `chicago-notes` | `chicago-notes-bibliography` | footnotes plus bibliography |
| `harvard` | `harvard-cite-them-right` | author-date |
| `ieee` | `ieee` | numeric |
| `vancouver` | `nlm-citation-sequence` | numeric |
| `custom` | any `.csl` path the scholar supplies | whatever that file does |

The official repository has no plain `vancouver.csl`; `nlm-citation-sequence` (NLM, Citing Medicine) is its Vancouver
style. A journal or university may publish its own CSL: pass the file to `use` and the project records it as `custom`.
Files are fetched from https://github.com/citation-style-language/styles at the commit pinned in `style.mjs` and in
`references/csl/README.md`; they are licensed CC BY-SA 3.0 each (see the file's `<rights>` element).

## What `style.mjs` does and does not do
- `status`: reads `csl:` from `_quarto.yml` and from each document's front matter. Reports every CSL in use, mapped to
  a style id, and warns when none is set, when one differs from `citation.style`, or when the file is missing.
- `use`: dry run unless `--apply`. A CSL already in the project is reused. A style already in a `refs/csl`, `csl`,
  `styles` or `references/csl` folder lands there; otherwise next to the bib (`<bib folder>/csl`). `csl:` in
  `_quarto.yml` is replaced in place (comments and CRLF kept) or one top-level line is appended; every other byte
  stays. No `_quarto.yml`: it prints the line to add. `scholar.json` is re-written with `citation` updated.
- `fields`: needs, per entry type, author, year and title for all styles; journal, volume and pages for articles
  (MLA: journal and pages; volume and issue recommended); publisher for books; page ranges for chapters and papers in
  numeric and MLA styles; a URL for web sources, plus an access date for numeric styles and a container for MLA.
  APA also recommends the issue number and a DOI or URL for articles. Missing fields are listed; nothing is filled.
- `convert`: recognises `(Smith, 2020)`, `(Smith & Jones, 2019, p. 4)`, `(Smith et al., 2021; Lee, 2018)`,
  `(see Lee, 2018)`, `Smith (2020)`, `Smith and Jones (2019, pp. 4-8)`, `Smith et al. (2021)` and `[3]`, `[2, 5]`,
  `[4-6]`. It matches surname and year against the bib. Confidence:
  - `exact`: one entry matches, the author count agrees with the wording, and any year suffix agrees.
  - `likely`: a match with a caveat (a/b suffix resolved by APA title order, "et al." for a two-author work,
    a suffix the bib does not store). Never applied automatically.
  - `ambiguous`: more than one entry fits (two Smith 2020 works need a/b in the text). Candidates are listed.
  - `unmatched`: nothing fits, or a bracket mixes a citation with other text. Never guessed.
  Not handled: corporate authors written in full ("World Health Organization, 2020"), `n.d.`, and citations inside
  quotations, code, YAML, comments or the reference list (skipped on purpose).
- `narrative`: report-only wording flags. A bracketed citation used as a subject ("[@smith2020] shows"); `@key` in
  numeric styles, which prints only "[2]" with no author name; sentences that lean on the year in numeric, note and MLA
  styles (they print no year); citations in headings and table cells under a note style (they become footnotes);
  hand-typed author-date text; leftover `[n]` markers outside numeric styles.

## Reading the rendered result
After a switch, open the rendered HTML, DOCX or PDF and compare with the previous output: in-text forms, the order and
format of the reference list, italics, DOIs, and whether sources without a DOI look right. CSL files differ in small
ways from the printed manual; if the venue's own examples differ, say so and let the scholar decide.
