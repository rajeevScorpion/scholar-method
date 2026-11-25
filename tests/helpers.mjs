import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

export const HARVEST = join(REPO, "plugins/scholar-core/skills/harvest/scripts/harvest.mjs");
export const hv = (dir, ...a) => run(HARVEST, [...a, "--root", dir]);

// A throwaway method checkout: a git repo that looks like Scholar Method, no remote.
export function methodCheckout() {
  const dir = tmp("scholar-method-co-");
  mkdirSync(join(dir, ".claude-plugin"));
  writeFileSync(join(dir, ".claude-plugin/marketplace.json"), JSON.stringify({ name: "scholar-method", plugins: [] }));
  writeFileSync(join(dir, "README.md"), "method\n");
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  git("init", "-q"); git("config", "user.email", "m@example.org"); git("config", "user.name", "Maintainer");
  git("add", "-A"); git("commit", "-q", "-m", "init");
  return dir;
}
export const gitOut = (dir, ...a) => execFileSync("git", a, { cwd: dir }).toString().trim();

export const STYLE = join(REPO, "plugins/scholar-writing/skills/cite/scripts/style.mjs");
export const BUNDLED_APA = join(REPO, "plugins/scholar-writing/skills/cite/references/csl/apa.csl");
export const st = (dir, ...a) => run(STYLE, [...a, "--root", dir]);
export const hasQuarto = spawnSync("quarto", ["--version"], { encoding: "utf8" }).status === 0;
