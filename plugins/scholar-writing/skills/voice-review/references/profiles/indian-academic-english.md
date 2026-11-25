# Writing profile: Indian academic English (opt-in)

An optional profile for scholars who write natural Indian academic English. It is not part of the universal Scholar
rules. A project selects it in `scholar/scholar.json` with `"profile": {"writing_profile": "indian-academic-english"}`
and may add its own style guide at `paths.style_guide`, which outranks this profile. Venue and institution rules
outrank both. Evidence rules never change with style: see `scholar-contract/references/integrity.md`.

Precedence: venue and institution rules, project decisions, project style guide, this profile, Scholar defaults,
Humanizer.

## Rules
1. **Natural academic English.** Write as a researcher explaining an argument to informed peers. Vocabulary is
   straightforward, around undergraduate to master's level, never needlessly elevated. Seriousness comes from
   evidence and reasoning, not from inflated words.
2. **Keep the author's voice.** Keep the intended claim, nuance, examples, order of thought and individual rhythm.
   Edit for clarity and precision without making every paragraph uniform or machine-polished.
3. **Variation without false errors.** Vary sentence length and paragraph shape as the argument needs. Use natural
   transitions and modest reflection. Never insert misspellings, invented uncertainty or deliberate mistakes to look
   human.
4. **Plain punctuation.** No em dashes or en dashes in authored prose. Avoid ornamental symbols, heavy brackets and
   chains of semicolons. A plain hyphen stays for compounds and technical terms; number ranges use a hyphen or "to".
5. **No Oxford comma.** In ordinary lists write "A, B and C". Rewrite the sentence if that creates a real
   ambiguity. Leave quotations, titles, references and verbatim imports as they are.
6. **Indian and British spellings** in original prose: organisation, colour, analyse, programme, centre, recognise.
   Never silently change titles or direct quotations.
7. **No contractions** in formal thesis or journal prose.
8. **Avoid generic AI register.** Drop formulaic openings, hype, forced triplets, repeated sentence patterns,
   excess signposting and predictable endings (delve, landscape, robust, pivotal, transformative, "it is important
   to note", "in conclusion") when they add no meaning. Accurate disciplinary terms stay.
9. **Argument first.** A paragraph makes a point, develops it and shows its evidence or limit. Prefer connected
   synthesis to source-by-source summary.
10. **Do not over-edit.** Keep meaning, citations, quotations, approved framing, special terms and the requested
    length. If shortening, say what was cut or keep a tracked diff. Never turn a mixed result into a confident one.
11. **Titles, headings, abstracts.** Descriptive, plain, reviewer-friendly. No novelty claims or marketing tone.
    Respect a frozen title or abstract.
12. **Status and tense.** Ongoing work is described as ongoing. Data collection, findings, approvals and
    publication are stated only when documented.

## How the checks map
`lint-prose.mjs` enforces rules 4 to 8 (dashes, Oxford comma, spelling, contractions, AI register). Rules 1 to 3
and 9 to 12 are judgement: describe concerns, do not rewrite unasked. Rule 12 and the evidence rules are checked
by reading against the project records and by `fact-guard.mjs` after any edit.
