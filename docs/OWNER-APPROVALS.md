# Actions awaiting the owner

Nothing below has been done. Each needs an explicit yes.

| # | Action | Why it is held | Command or step |
|---|---|---|---|
| 1 | Choose a host and create the remote repository | No remote exists; this repo has never been pushed | Create the repo on the chosen host, then `git remote add origin <url>` yourself |
| 2 | First push of `main` | Public or private publication is the owner's decision | `git push -u origin main` after reviewing `git log` and `git status` |
| 3 | Decide public versus private before the first push | `promptPacks/` is gitignored; `private/` is gitignored; check `git ls-files` for anything you do not want public | `git ls-files` and a read through `NOTICE.md` |
| 4 | Install blader/humanizer, per environment | Third-party code; never installed silently | Re-read https://github.com/blader/humanizer, then Claude Code `/plugin marketplace add blader/humanizer` and `/plugin install humanizer@humanizer`; Codex `npx skills add blader/humanizer --agent codex` (project) or with `--global` |
| 5 | Adoption writes into the thesis repo | The thesis repo is untouched so far (dry run only) | Review the private dry-run notes (`private/thesis-dry-run.md`, local only), then `scholar start` on a branch |
| 6 | Global `~/.claude/CLAUDE.md` exception line | Scholar never edits global files; today the global file tells every session to load the Studio Method working contract | Add: "In repos that have a scholar/ folder, follow Scholar Method; do not load Studio Method working-contract or playbook there." |
| 7 | Disable `studio-core` in the thesis repo | It would collide with the repo's own session protocol | Add `{"enabledPlugins": {"studio-core@studio-method": false}}` to the thesis `.claude/settings.json` |
| 8 | Codex install scope: global or project | Both work; project keeps skills with the repo, global serves every repo | `node install/install.mjs --agent codex --project <repo>` or `--global` (`~/.codex/skills` is used if it exists) |
| 9 | Repair the local Codex CLI config | Codex 0.29.0 fails to load the global config (`model_reasoning_effort = "xhigh"` unknown, an `n8n-mcp` server missing `command`, a model the account cannot use), so no real Codex continuity run was possible | Update Codex and fix `~/.codex/config.toml` yourself, then run the check in `docs/validation/` |
| 10 | Any harvest promotion, push or pull request | Outward actions always need a yes | `harvest.mjs promote` is local only; the push commands it prints are yours to run |
