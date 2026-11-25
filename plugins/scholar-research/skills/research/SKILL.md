---
name: research
description: Secondary-source discovery and intake for a scholar's investigation. Searches only where authorised and available, discloses coverage and limits, respects licences, paywalls, robots rules and institutional access, registers each lead with provenance (search string, database, date) and a read status ladder, never cites a lead as verified, compares positions and links the literature back to the insight. Use when the user says "research", "what has been published on", "find sources on", "literature search", "look for papers about", "what does the literature say", "has anyone written about", "review the literature", "survey the field", or asks for secondary sources, background reading or related work.
---

# Research (secondary sources)

Goal: the scholar sees what has already been published, how far each item was actually read, how positions
differ, and how it bears on their insight. Secondary and existing material only: no recruiting, no interviews, no
new primary records. Ask means AskUserQuestion in Claude Code, a plain question in Codex. Scholar CLI
(`$SCHOLAR`), found once: in Claude Code the session-start line `Scholar CLI ($SCHOLAR): node "<path>"`; in Codex
`scholar-start/scripts/scholar.mjs` beside the other Scholar skills. Load `scholar-contract` first.

## 1. Frame the search
1. Name the insight, claim or research question behind it (INS or CLM id, RQ label from the mapped charter). If
   there is none, ask which one it serves, or offer `reflect` first. Do not search "everything".
2. Say in two lines: what you will search for, where (databases, search engines, archives, the scholar's own
   library or `.bib`), and what would count as relevant. Check the project's existing source register and `.bib`
   first so you do not re-register known items.
3. Respect the project's rules (institution, venue, a "ask before acquiring files" rule). Fetching a full-text
   PDF or any download needs the scholar's yes; opening an abstract page does not.

## 2. Search
4. If the agent has a web search tool, run a few targeted queries (author-year-free keyword strings, then
   narrower ones). Otherwise write the search strings and name suitable databases for the scholar to run, and
   stop there. Never pretend to have searched.
5. Respect access: no paywall circumvention, no scraping against robots rules or terms, no use of someone else's
   credentials. Where an institutional login is needed, say so and let the scholar fetch the item.
6. Keep a search log as you go: exact string, database or engine, date (today's date), filters, number of results
   looked at. Put it in the notes of the source records or the mapped register.

## 3. Register each lead with provenance
7. One record per candidate worth keeping. If the project has its own source register (`paths.sources` in
   `scholar/scholar.json` is a file), add entries there in its format and reference its IDs. Otherwise
   `node $SCHOLAR new source --title "..."` and fill the fields (`records.md`: citekey, type, title, authors,
   year, doi, url, accessed, read_status, rights, limitations).
8. Copy bibliographic fields from the page you actually saw. If you did not see a DOI, year or author list, leave
   it empty. Never complete a reference from memory. A guessed DOI or page is a fabricated one.
9. Set `read_status` honestly, and move it up only after doing the work:
   `lead` (seen in a result list or cited elsewhere) -> `abstract-only` (abstract read) -> `metadata-checked`
   (the checklist in `references/source-checklist.md` passed) -> `full-text-reviewed` (the relevant parts read in
   the actual text). Note limitations: language, paywall, preprint, single case, age.
10. Never cite a lead as verified, never quote from an abstract as if from the text, and never put an unverified
    item in the bibliography as settled. Say "lead" or "abstract only" in anything you tell the scholar.

## 4. Read and compare
11. Read only what is needed, for the claim at stake. For each item you read, note: what it argues, on what
    evidence, its scope and its limits, and the page or figure for any specific statement.
12. Compare positions: where sources agree, where they differ, which are primary versus secondary, which are
    dated. Include at least one source that disagrees or complicates the insight if one exists; if none was
    found, say what you searched, so absence is not mistaken for consensus.
13. Report coverage plainly: "searched A and B with these strings on this date; 40 results scanned; 6 kept; not
    searched: C; paywalled items not read". Say what the search could not see.

## 5. Link back and hand over
14. Link the sources to the insight: add IDs to the insight's `sources`, raise `evidence_status` to `leads` or
    `partial` only as far as the reading supports, and propose claims for specific statements (skill `evidence`).
    Do not mark an insight `supported` from abstracts.
15. Show the scholar a short table: item, read status, what it says, how it bears on the insight, limits. Offer
    the next step (read in full, compare, map to claims). Update the mapped status or handoff line.
16. Run `node $SCHOLAR validate`. Local commit only if the project allows; no pushing.

## Never
- Never invent a source, DOI, quotation, page, date or author. Missing metadata stays empty and is a gate.
- Never download, upload or share a paywalled or copyrighted file without a yes. Never put it in a public repo.
- Never treat search rank, citation counts or a snippet as quality. Never quote more than a few words.

## Done means
Every kept item has a record with provenance and an honest read status, coverage and limits were stated, positions
were compared, and the insight links to the sources without being upgraded beyond what was read.
