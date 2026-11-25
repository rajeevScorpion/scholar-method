---
name: evidence
description: Map claims to sources and research questions, and show the gaps. Creates and updates claim records with their kind and status ladder, finds the exact page or figure that supports each one, adds contradicting sources, reports missing support as a gate ("no verified support for X"), and builds an evidence map from the records. Use when the user says "evidence", "map this to the questions", "what supports this", "is this claim backed up", "check the evidence for", "where are the gaps", "which sources contradict this", "evidence map", "link claims to sources", or asks whether a statement is supported before using it.
---

# Evidence

Goal: every statement the scholar may rely on is tied to the exact place that supports it, and every gap is
visible. A claim record is one exact statement plus its support; it is not a conclusion. Ask means
AskUserQuestion in Claude Code, a plain question in Codex. Scholar CLI (`$SCHOLAR`), found once: in Claude Code
the session-start line `Scholar CLI ($SCHOLAR): node "<path>"`; in Codex `scholar-start/scripts/scholar.mjs`
beside the other Scholar skills. Load `scholar-contract` first. Formats: `scholar-contract/references/records.md`.

## 1. Pick the statement
1. Get the exact sentence from the scholar, or from the insight or draft passage they point to. One statement per
   claim; split compound sentences. Keep the scholar's meaning; do not tidy it into something stronger.
2. Decide its kind (ask only if unclear and it matters):
   - `source-statement`: what a source says (keeps the source's meaning);
   - `author-interpretation`: the scholar's reading of evidence;
   - `hypothesis`: untested;
   - `data-result`: a result from the project's own data and analysis (needs the analysis, not a source).
3. Check for an existing claim first (ripgrep `scholar/claims`). Update it rather than duplicating.

## 2. Create or update the record
4. `node $SCHOLAR new claim --title "<the exact statement>"`, then set `kind`, `rq` (labels from the mapped
   charter; never invent one), and link the insight by adding the claim ID to the insight's `claims`.
5. Status ladder, moved up only after doing the work and never skipped:
   `unverified` -> `metadata-checked` (the source passed `research/references/source-checklist.md`) ->
   `full-text-reviewed` (the relevant text was read) -> `claim-checked` (the exact sentence is supported by the
   located passage) -> `approved-for-use` (the scholar approved it for a draft; their decision, not yours).
6. A claim leaning on an insight of kind `hypothesis` is not a result. `validate` warns; heed it.

## 3. Locate the support
7. For each supporting source, read the passage and record the locator in `supports`: `"SRC-0003 p.12"`,
   `"smith2020 fig.2"`. A locator you did not read is a fabricated one. No locator, no `claim-checked`.
8. Check the passage says what the claim says: scope, population, period, hedging, whether it is the source's own
   finding or something it cites. If the fit is partial, say what part is supported and narrow the claim or note it.
9. Search for opposition: sources that contradict or complicate the claim go in `challenges` with locators, and
   the claim keeps standing as a claim, not deleted. If you found none, say what you looked at.

## 4. Report gaps as gates
10. For each claim, state one of: supported and checked; supported but not yet read in full; lead only; no support
    found; contested. Use plain gate wording: "no verified support for X", "SRC-0002 is abstract-only", "the only
    source challenging this has not been read".
11. A gap is not filled with a plausible source, a general-knowledge statement or an invented locator. Offer the
    next step instead: read the source, search (skill `research`), or reframe the claim as the scholar's
    interpretation.
12. Show a compact table: claim, kind, status, supports, challenges, RQ, open gate. Offer to update the insight's
    `evidence_status` (`leads`, `partial`, `supported`, `contested`) to match; the scholar decides acceptance.

## 5. Evidence map
13. Build it from the records (needs Node, no installs): `node scripts/graph.mjs --root <repo>` in this skill
    folder (Claude Code: `node "${CLAUDE_PLUGIN_ROOT}/skills/evidence/scripts/graph.mjs" --root <repo>`). It writes
    `scholar/visuals/evidence-map.{cyto.json,mmd,html}`. Edges come only from links written in records; claims
    that are `claim-checked` or `approved-for-use` draw solid, everything else is dotted or dashed, challenges are
    red dash-dot with a cross or tee end. Dangling IDs are listed, not drawn. The `.html` viewer loads Cytoscape.js
    from a CDN (pinned) and needs a network; the `.mmd` renders natively in GitHub, GitLab and Quarto, and the
    HTML also carries an edge table.
14. A link on the map is a recorded link, not a causal arrow. Do not add edges by hand to make a story. For a
    visual to be used, make a sidecar (skill `visualise`).

## 6. Finish
15. `node $SCHOLAR validate`; fix errors (dangling links, enum values). Update the mapped status or handoff with
    the open gates. Local commit only if the project allows.

## Never
- Never mark `claim-checked` without having read the located passage in the actual source.
- Never use a source to support a claim it only mentions in passing, or support from an abstract.
- Never drop a contradicting source because it is inconvenient.
- Never promote a claim to `approved-for-use`; only the scholar does.

## Done means
Each claim has a kind, an honest status, located support or an explicit gate, challenges where they exist, and the
map reflects the records exactly.
