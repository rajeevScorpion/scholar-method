# Start a research project on Scholar Method

Install the skills first (see the README): Claude Code with `/plugin marketplace add rajeevScorpion/scholar-method` and
`/plugin install scholar@scholar-method` (all four packs), or Codex with `node install/install.mjs --agent codex --project .`.

Then paste this into the first session in your research repo (Claude Code or Codex):

---

This project follows **Scholar Method**. Please:

1. Check that the `scholar-core` skills are available. If not, tell me the exact install command and wait.
2. Run the `scholar-start` skill. Read the repo first and change nothing: instructions, git status and branch,
   uncommitted work, status, handoff, registers, style guide, Quarto config. Tell me what you understood in 25
   lines or fewer, flag stale or conflicting records, and propose which of my existing files plays which role.
   Wait for my answer.
3. After I confirm, on a feature branch, add only what is missing: a small `scholar/` folder and a short Scholar
   section in my `AGENTS.md` or `CLAUDE.md`. Never replace my files. Show me the diff.
4. Check whether Humanizer and Studio Method are installed. Tell me what you found. Do not install or change
   anything until I say yes.
5. From then on: follow `scholar-contract`. I lead. Reflect my ideas, explore before asking, ask at most one
   question, and write prose only when I ask. Never invent sources or results.

---

Shorter, once installed: **"scholar start"**. Next sessions: **"catch up"** and **"check out"**.
