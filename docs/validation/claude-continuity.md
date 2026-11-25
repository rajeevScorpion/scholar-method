# Claude Code continuity check

Date: 2026-11-25. Cross-agent recovery from repo files only: a fresh `claude -p` session in a temp copy of
`examples/research` (git-initialised, nothing installed from Scholar Method, no session memory).

Command (run in the temp copy; read-only tools only, no sessions saved):
```
claude -p "Read scholar/ and the handoff. In 5 bullets: what is this project, which insights are pending, which claims are verified. Do not write files." --tools "Read,Grep,Glob" --permission-mode dontAsk --no-session-persistence
```
Result: `git status` in the temp copy stayed clean afterwards. Transcript (the account sign-in warning line is omitted):

> - **What it is:** This is a made-up test project, not real research. It shows how the scholar-research pack works on one question, RQ1: did the flat-icon style in interface artefacts come before the same style in editorial artefacts? That question is still open. The project has 2 insights, 3 claims and 3 fictional sources, plus a chart and an evidence map.
> - **Pending insight:** INS-0001 is waiting on your decision (`author_decision: pending`). It suggests flat icons in interfaces moved together with editorial minimalism, and nothing supports it yet. INS-0002 says shared tools explain the overlap better than one field influencing the other. You accepted it, but only as a working hypothesis (DECISIONS.md, 2026-11-25), so it isn't pending.
> - **Verified claims:** CLM-0001 is checked against SRC-0001 p.4: both fields picked up the same tools in the same period. CLM-0003 is reviewed against the full text of SRC-0003, which argues the styles are too weakly similar to show influence. That claim argues against the influence reading.
> - **Unverified claim:** CLM-0002 says the interface style came one period before the editorial style. Its only support is SRC-0002, which has been read as an abstract only and has no page reference. The handoff says not to write this up as a finding.
> - **Next step:** decide whether to acquire editorial artefacts for period P3, since without them there's nothing to compare in that period. Then re-run the chart.
> 
> One mismatch: INS-0002 says neither SRC-0001 nor SRC-0002 has been read in full, but SRC-0001 is marked as read in full (`read_status: full-text-reviewed`). One of those two records is out of date. I didn't open the visuals or the `data/` folder, and I didn't write any files.

What this shows: the agent recovered the project, the pending insight (INS-0001), the accepted-but-hypothesis insight
(INS-0002), which claims are checked and which are not, and the handoff's instruction not to write the influence
claim up as a finding, from the files alone. It also caught a real inconsistency in the example (INS-0002 said neither
source was read in full while SRC-0001 was marked full-text-reviewed); the example was corrected after this run.

Limits: one run, one model, tools restricted to reading. It did not exercise the skills or the session hook (Scholar
Method was not installed in that Claude Code session); those are covered by `tests/scenarios.test.mjs`.
