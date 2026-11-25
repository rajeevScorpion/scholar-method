---
name: catch-up
description: Give the scholar a 4 to 5 bullet snapshot of where the research project was left, from the mapped handoff and status docs, plus insights awaiting their decision and pending harvest proposals, then offer what to do next. Never presents a hypothesis as a finding. Use when the user says "catch up", "catch me up", "where did we leave off", "what was I working on", "pick up from last time", or starts a session in a Scholar project without a task.
---

# Catch up

Goal: in seconds, the scholar knows where things stand and what is open. Cheap: read records, not manuscripts.
Ask means AskUserQuestion in Claude Code, a plain question in Codex. `$SCHOLAR` is the `scholar-start` skill's
`scripts/scholar.mjs` (Claude Code: `${CLAUDE_PLUGIN_ROOT}/skills/scholar-start/scripts/scholar.mjs`; Codex:
`scholar-start/scripts/scholar.mjs` beside this skill folder). Load `scholar-contract` if it is not loaded yet.

## 1. Read (only what is needed)
1. `scholar/scholar.json` for the role map. No `scholar/`? Say so in one line and offer `scholar-start`; stop.
2. The mapped handoff ("Stopped at", "Next step"), then the mapped status doc (summary, open, next only).
3. `node $SCHOLAR status`: insights awaiting decision, claims and sources by state, pending harvest count.
4. `git log --oneline -5` and `git status --short` for work in flight. Uncommitted changes are the scholar's.
5. Do not read manuscripts or sources. Do not explore further.

## 2. Reply: 4 to 5 bullets, plain words
- **Last session:** what was happening and where it stopped (with the date if known).
- **In flight:** unfinished task, branch or uncommitted files (or "nothing").
- **Waiting on you:** insights pending decision (IDs and titles, at most three), pending harvest proposals.
- **Open loose ends:** one or two from the status or handoff, including any reconciliation tasks.
- **Next step:** exactly what the handoff names.

Wording rules: a hypothesis or open question is called that, with its evidence status ("hypothesis, no evidence
yet", "accepted as a working position, evidence partial"). Never write "we found" or "it is established" for
anything the records do not mark as supported and checked. Source status is stated as recorded (lead,
abstract-only, full-text-reviewed). No file paths unless needed to act.

## 3. Offer three choices (single select)
1. **Continue**: resume the in-flight work or next step, named. Recommended if something is mid-way.
2. **Explore something new**: the scholar just talks; you reflect and explore.
3. **Close loose ends**: review pending insights, reconcile a stale record, or handle harvest proposals.
If nothing is in flight, drop option 1. Then act on the choice. Reviewing insights means showing each in plain
words and letting the scholar accept, edit, defer or discard it; update the record and run `validate` after.
