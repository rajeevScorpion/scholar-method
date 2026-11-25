# Working contract for this repo

Short copy for any session or helper agent working on Scholar Method.

## Roles
- The main session plans, reviews and decides. Helpers execute and commit; they do not edit `CURRENT_STATE.md`.
- Ask the owner before: pushing, creating remotes, installing third-party tools, touching any research repo,
  changing the licence or NOTICE, or weakening a rule in `scholar-contract`.

## Commits
- Small, working chunks, clear messages (`core: ...`, `docs: ...`). No AI attribution lines.
- Stage explicit paths. Keep LF line endings. `promptPacks/` stays untracked.
- Run `node --test` and `claude plugin validate .` before committing skill, script or manifest changes.

## Helper notes
Helpers keep `docs/agent-notes/<task>.md` (15 lines or fewer): done, in progress, next, gotchas; updated at each commit.

## Communication
Short, plain sentences. Indian or British spelling, no em dashes in docs.

## Project overrides
None yet.
