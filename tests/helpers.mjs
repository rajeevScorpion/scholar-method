import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SCHOLAR = join(REPO, "plugins/scholar-core/skills/scholar-start/scripts/scholar.mjs");
export const HOOK = join(REPO, "plugins/scholar-core/hooks/session-start.mjs");
export const INSTALL = join(REPO, "install/install.mjs");

export const tmp = (p = "scholar-test-") => mkdtempSync(join(tmpdir(), p));

export function run(script, args, { cwd = REPO, env = {} } = {}) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// Copy a fixture to a temp dir, git init, commit it, then leave one uncommitted change and one untracked file.
export function project(fixture) {
  const dir = tmp();
  cpSync(join(REPO, "tests/fixtures", fixture), dir, { recursive: true });
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  git("init", "-q");
  git("config", "user.email", "t@example.org");
  git("config", "user.name", "Test");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");
  const first = readdirSync(dir).find((n) => n.endsWith(".md")) ?? "README.md";
  writeFileSync(join(dir, first), readFileSync(join(dir, first), "utf8") + "\nUncommitted edit.\n");
  writeFileSync(join(dir, "scratch.txt"), "untracked\n");
  return dir;
}

// path -> sha1 of every file outside .git
export function snapshot(dir) {
  const out = {};
  (function rec(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) rec(p);
      else out[relative(dir, p).replaceAll("\\", "/")] = createHash("sha1").update(readFileSync(p)).digest("hex");
    }
  })(dir);
  return out;
}

export const gitStatus = (dir) => execFileSync("git", ["status", "--short"], { cwd: dir }).toString();
export const homeEnv = (home) => ({ HOME: home, USERPROFILE: home });
