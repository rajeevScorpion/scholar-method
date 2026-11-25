# Adopting Scholar Method for a paper

For a journal paper, conference paper or review, whether the repo is new or already has a draft. Smaller than a thesis:
fewer roles, its own records.

## Principles
- A paper does not inherit a thesis's page counts, chapter lists, decisions or records. Even when it grows out of a
  thesis, it gets its own `scholar/` folder and its own project map; nothing is read across projects.
- Set the target venue early. Its rules outrank project decisions, the style guide and any writing profile.
- A common author voice across projects is opt-in: choose a writing profile per project, or none.

## Steps
1. Install the skills (README), open the paper repo, say "scholar start". The agent reads first and changes nothing.
2. Confirm in the read-back: the research question, target venue (if known), stage, working citation style, which
   sources are verified, the draft and its history, what is approved, and any reuse from earlier work.
3. The agent says what it seems to be (journal paper, conference paper, review, article or something else) and you
   confirm or correct it; only then is `project.kind` recorded. For a new paper, `init --apply --kind journal-paper` creates `scholar/STATUS.md`, `HANDOFF.md`, `DECISIONS.md` and a
   sources folder, because there are none to map. For an existing draft repo it maps what is there first.
4. Record the venue in `scholar/DECISIONS.md` with its source, and set `writing` keys in `scholar/scholar.json` if the
   venue needs US spelling or the serial comma (add a decisions line too).
5. Optional: a contribution map (who did what) and an overlap check against your other publications, kept as plain
   Markdown beside the draft.
6. From then on: "catch up" to resume, "check out" to close, "harvest" to offer reusable lessons (privacy-checked,
   never your insights or text).

## Differences from a thesis adoption
No chapter architecture to reconcile, usually no agent protocol of its own, a venue instead of an institution, and
shorter records. Everything else (read-first, map not replace, branch, diff, your yes) is the same.
