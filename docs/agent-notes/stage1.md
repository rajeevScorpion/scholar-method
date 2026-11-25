# Stage 1 notes (helper)
**Done:** manifests (4 packs), scholar CLI, hook, Codex installer, six scholar-core skills, root docs, docs/project; 20 tests and `claude plugin validate .` green.
**In progress:** nothing.
**Next:** main session reviews; then harvest.mjs, scholar-research.
**Gotchas:** Codex project skills path is `.agents/skills` (official docs); docs say user level is ~/.agents/skills, this machine uses ~/.codex/skills (installer prefers it if it exists).
Heredocs with apostrophes break the Bash tool; use the Write tool.
Humanizer SKILL.md never says "blader": provenance only from plugin id `humanizer@humanizer` or a skills lock file.
Tests spawn git; they set HOME and USERPROFILE to temp dirs for doctor and installer.
