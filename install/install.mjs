#!/usr/bin/env node
// Scholar Method installer for Codex (zero dependencies). Claude Code installs through the plugin marketplace instead.
//
// Codex skill locations, checked 2026-11-25:
//  - Official docs (https://developers.openai.com/codex/skills, now https://learn.chatgpt.com/docs/build-skills):
//    repository level is `.agents/skills` (scanned from the working directory up to the repo root),
//    user level is `$HOME/.agents/skills`, admin level is `/etc/codex/skills`.
//  - This machine: codex-cli 0.29.0 and an existing `~/.codex/skills` folder, so older installs use `~/.codex/skills`.
//  So: --project writes `<repo>/.agents/skills`; --global writes `~/.codex/skills` if that folder exists, else `~/.agents/skills`.
//  `--target <dir>` overrides both (used by tests and for unusual setups).
//
// Usage: node install/install.mjs --agent codex (--project <repo> | --global | --target <dir>)
//          [--packs core,research,writing,publish] [--dry-run] [--uninstall]
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = ".scholar-method.json";
const ALL_PACKS = ["core", "research", "writing", "publish"];
const SNIPPET = join(REPO, "plugins", "scholar-core", "skills", "scholar-start", "references", "agents-snippet.md");

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith("--")) continue;
  const n = args[i + 1];
  opt[args[i].slice(2)] = n === undefined || n.startsWith("--") ? true : (i++, n);
}
const fail = (m) => { console.error(`install: ${m}`); process.exit(2); };

if (opt.agent === "claude") {
  console.log("Claude Code installs through the plugin marketplace:\n  /plugin marketplace add <path-or-git-url-of-this-repo>\n  /plugin install scholar-core@scholar-method");
  process.exit(0);
}
if (opt.agent !== "codex") fail("use --agent codex (or --agent claude for the Claude commands)");

let target;
if (typeof opt.target === "string") target = resolve(opt.target);
else if (typeof opt.project === "string") target = join(resolve(opt.project), ".agents", "skills");
else if (opt.global) target = existsSync(join(homedir(), ".codex", "skills")) ? join(homedir(), ".codex", "skills") : join(homedir(), ".agents", "skills");
else fail("choose --project <repo>, --global or --target <dir>");

const packs = (typeof opt.packs === "string" ? opt.packs.split(",") : ALL_PACKS).map((p) => p.trim().replace(/^scholar-/, ""));
for (const p of packs) if (!ALL_PACKS.includes(p)) fail(`unknown pack "${p}" (choose from ${ALL_PACKS.join(", ")})`);

const dry = !!opt["dry-run"];
const say = (m) => console.log(dry ? `[dry run] ${m}` : m);
const readMarker = (dir) => { try { return JSON.parse(readFileSync(join(dir, MARKER), "utf8")); } catch { return null; } };
const owned = (m) => m?.name === "scholar-method";
let collisions = 0;

if (opt.uninstall) {
  console.log(`Uninstalling Scholar Method skills from ${target}`);
  for (const n of existsSync(target) ? readdirSync(target) : []) {
    const dir = join(target, n), m = readMarker(dir);
    if (!owned(m) || !packs.includes(m.pack.replace(/^scholar-/, ""))) continue;
    say(`remove ${n} (${m.pack} ${m.version})`);
    if (!dry) rmSync(dir, { recursive: true, force: true });
  }
  process.exit(0);
}

console.log(`Installing Scholar Method skills into ${target}`);
if (!dry) mkdirSync(target, { recursive: true });
for (const p of packs) {
  const pack = `scholar-${p}`, pdir = join(REPO, "plugins", pack);
  const version = JSON.parse(readFileSync(join(pdir, ".claude-plugin", "plugin.json"), "utf8")).version;
  const sdir = join(pdir, "skills");
  const skills = existsSync(sdir) ? readdirSync(sdir).filter((n) => existsSync(join(sdir, n, "SKILL.md"))) : [];
  if (!skills.length) { console.log(`${pack}: no skills yet (coming later)`); continue; }
  for (const name of skills) {
    const dest = join(target, name), m = readMarker(dest);
    if (existsSync(dest) && !owned(m)) {
      console.error(`COLLISION ${name}: ${dest} exists and is not a Scholar Method install (no ${MARKER}); left untouched.`);
      collisions++;
      continue;
    }
    say(`${existsSync(dest) ? "update" : "install"} ${name} (${pack} ${version})`);
    if (dry) continue;
    rmSync(dest, { recursive: true, force: true });
    cpSync(join(sdir, name), dest, { recursive: true });
    writeFileSync(join(dest, MARKER), JSON.stringify({ name: "scholar-method", pack, version, source: REPO, skill: name }, null, 2) + "\n");
  }
}

console.log("\nNothing was written to your project's AGENTS.md. Adoption (scholar-start) adds this snippet after you approve it:\n");
console.log(existsSync(SNIPPET) ? readFileSync(SNIPPET, "utf8") : "(snippet file missing)");
if (collisions) console.error(`${collisions} skill(s) not installed because of name collisions. Rename or remove the other folder yourself, then re-run.`);
process.exit(collisions ? 1 : 0);
