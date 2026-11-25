---
name: check-out
description: Close a research session cleanly so a fresh session, in Claude Code or Codex, can pick up with no loss. Takes stock of git and uncaptured insights, batch-reviews captured insights with the scholar, updates the mapped status, handoff and decisions, validates the records, offers harvest, commits locally, never pushes without asking, and ends with a starter line for the next session. Use when the user says "check out", "wrap up", "close the session", "end session", "hand off", or "let's continue in a fresh session".
---

# Check out

Goal: everything a fresh session needs is written in the project's own files and committed locally; nothing the
scholar said is lost or quietly promoted. Ask means AskUserQuestion in Claude Code, a plain question in Codex.
`$SCHOLAR` is the `scholar-start` skill's `scripts/scholar.mjs` (Claude Code:
`${CLAUDE_PLUGIN_ROOT}/skills/scholar-start/scripts/scholar.mjs`; Codex: `scholar-start/scripts/scholar.mjs` beside
this skill folder). Follow `scholar-contract` and the project's own protocols. Keep output short.

## 1. Take stock (cheap, no manuscript reading)
- `git status --short`, `git branch --show-current`, `git log --oneline -5`; branches not merged; commits not pushed.
- `scholar/scholar.json` for the role map; `node $SCHOLAR status` for counts and pending insights.
- This session's private insight list (see `scholar-contract`, section 7) and anything the scholar said that
  deserves a record: new sources named, decisions stated, objections raised.
- Helpers or background processes still running in this session.

## 2. Batch-review insights with the scholar
Show the session's captured insights as a short list, each as a faithful paraphrase in the scholar's meaning with
its uncertainty. For each, ask: keep, edit, defer or discard. For kept ones:
1. `node $SCHOLAR new insight --title "<short title>"`, then fill the sections (faithful paraphrase, rival
   explanations, evidence so far, next test). Quote the scholar only where they marked a quote.
2. Set `author_decision` to what the scholar said (usually `pending`; `accepted` only if they accepted it).
   Leave `evidence_status: none` unless real evidence was linked this session.
Skip this step in `capture: off` projects unless the scholar asks. Never add an insight the scholar did not see.

## 3. Ask (one question set, 1 to 3 questions)
- The next focus for the fresh session (offer what status and handoff name; free text allowed).
- Carry-overs: files to read first, decisions already made, constraints.
- Only if relevant: commit or leave uncommitted work; push now or later. Do not ask what git already answers.

## 4. Update the project's own docs (through the role map)
- **Status** (mapped status doc): rewrite stale lines, do not append a diary. What changed, what is verified
  versus reported, open items, next.
- **Decisions** (mapped decisions file): record only decisions the scholar actually made, with date and reason.
- **Handoff** (mapped handoff, overwrite): `Stopped at`, `In flight` (branches, uncommitted work),
  `Open questions`, `Next step`, and `Read first`. Under about 40 lines. It is what the session-start hook and
  `catch-up` read first, so keep the labels `Stopped at:` and `Next step:`.
- Flag, do not fix, release loose ends: unmerged branches, commits not pushed, citation or source gaps found
  today, stale records awaiting reconciliation.

## 5. Validate
`node $SCHOLAR validate`. Fix errors in records you wrote; report the ones you did not write. Warnings (a
hypothesis used as a result, approved claim with no support) go to the scholar in one line each.

## 6. Harvest
Run the `harvest` skill to offer reusable method lessons from this session. Skip it if there are none.

## 7. Commit (push only with a yes)
Commit the records and docs you changed on the working branch with a clear message (for example
`scholar: check-out, 3 insights, handoff`). Stage by explicit path so the scholar's uncommitted work is not swept in.
No AI attribution unless the project says otherwise. Never push, merge or publish without an explicit yes.
Delete local branches only if fully merged (`git branch -d`) and listed to the scholar.

## 8. Reply (6 lines or fewer)
- Done: insights kept (n), status, handoff, decisions, validate result, commit hash, harvest proposals (n).
- Top loose end and anything only the scholar can do (approvals, supervisor replies, files to supply).
- A starter line to paste next time, for example: `catch up, then <focus>; read <file> first`.
