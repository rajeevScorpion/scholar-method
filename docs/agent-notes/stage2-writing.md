# Stage 2 notes: writing and publish packs (helper)
**Done:** 5 skills (draft, voice-review, cite, build, submission-check), profile, lint-prose, fact-guard, check-citations, preflight, examples 01-04, 23 tests (writing-*, publish-*). `claude plugin validate .` passes.
**Red in core-owned tests (need main session):** repo.test.mjs skill count `seen == 6` and em-dash scan (examples/writing/01 holds deliberate dashes); install.test.mjs expects "coming later" for empty packs.
**Gotchas:** Bash tool strips backslashes in `sed`/heredoc JS; use the Edit tool for regex changes.
Core `profile` in scholar.json is an object: the writing profile is `profile.writing_profile`, not a string `profile`.
Lint "likely" findings (Oxford, serial comma) are heuristics; advisory (AI register) never fails `--strict`.
**Next:** main session review; core `init` default `writing` object; roadmap items (format-check, publication-map).
