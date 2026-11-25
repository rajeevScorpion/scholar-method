import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INSTALL, REPO, run, snapshot, tmp, homeEnv } from "./helpers.mjs";

const SKILLS = ["scholar-contract", "scholar-start", "catch-up", "check-out", "harvest", "forge"]; // core only (--packs core)
const ALL16 = [...SKILLS, "reflect", "research", "evidence", "analyse", "visualise", "draft", "voice-review", "cite", "build", "submission-check"];

test("dry run writes nothing", () => {
  const target = tmp("scholar-codex-");
  const before = snapshot(target);
  const r = run(INSTALL, ["--agent", "codex", "--target", target, "--dry-run"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /\[dry run\] install scholar-contract/);
  assert.deepEqual(snapshot(target), before);
});

test("install, update, then uninstall only what it owns", () => {
  const target = tmp("scholar-codex-");
  mkdirSync(join(target, "checkout"));
  writeFileSync(join(target, "checkout/SKILL.md"), "someone else's skill\n");
  let r = run(INSTALL, ["--agent", "codex", "--target", target]);
  assert.equal(r.code, 0, r.err);
  for (const s of ALL16) {
    const marker = JSON.parse(readFileSync(join(target, s, ".scholar-method.json"), "utf8"));
    assert.match(marker.pack, /^scholar-(core|research|writing|publish)$/);
    assert.equal(marker.skill, s);
    assert.equal(marker.version, JSON.parse(readFileSync(join(REPO, "plugins", marker.pack, ".claude-plugin", "plugin.json"), "utf8")).version);
    assert.equal(marker.source, REPO);
    assert.ok(existsSync(join(target, s, "SKILL.md")));
  }
  assert.ok(existsSync(join(target, "scholar-start/scripts/scholar.mjs")));
  assert.match(r.out, /## Scholar Method/); // prints the AGENTS.md snippet, writes none
  assert.doesNotMatch(r.out, /coming later|no skills yet/);
  r = run(INSTALL, ["--agent", "codex", "--target", target]);
  assert.match(r.out, /update catch-up/);
  r = run(INSTALL, ["--agent", "codex", "--target", target, "--uninstall"]);
  assert.equal(r.code, 0);
  for (const s of ALL16) assert.ok(!existsSync(join(target, s)));
  assert.equal(readFileSync(join(target, "checkout/SKILL.md"), "utf8"), "someone else's skill\n");
});

test("refuses to overwrite a same-named folder without the marker", () => {
  const target = tmp("scholar-codex-");
  mkdirSync(join(target, "catch-up"));
  writeFileSync(join(target, "catch-up/SKILL.md"), "mine\n");
  const r = run(INSTALL, ["--agent", "codex", "--target", target]);
  assert.equal(r.code, 1);
  assert.match(r.err, /COLLISION catch-up/);
  assert.equal(readFileSync(join(target, "catch-up/SKILL.md"), "utf8"), "mine\n");
  assert.ok(existsSync(join(target, "check-out/.scholar-method.json"))); // the others still install
  run(INSTALL, ["--agent", "codex", "--target", target, "--uninstall"]);
  assert.equal(readFileSync(join(target, "catch-up/SKILL.md"), "utf8"), "mine\n");
});

test("--project uses .agents/skills; --global prefers an existing ~/.codex/skills; --packs filters", () => {
  const proj = tmp("scholar-proj-");
  run(INSTALL, ["--agent", "codex", "--project", proj, "--packs", "core"]);
  assert.ok(existsSync(join(proj, ".agents/skills/scholar-contract/.scholar-method.json")));
  const home = tmp("scholar-home-");
  run(INSTALL, ["--agent", "codex", "--global"], { env: homeEnv(home) });
  assert.ok(existsSync(join(home, ".agents/skills/forge")));
  const home2 = tmp("scholar-home-");
  mkdirSync(join(home2, ".codex/skills"), { recursive: true });
  run(INSTALL, ["--agent", "codex", "--global", "--packs", "scholar-core"], { env: homeEnv(home2) });
  assert.ok(existsSync(join(home2, ".codex/skills/forge")));
  assert.equal(run(INSTALL, ["--agent", "codex", "--target", proj, "--packs", "nope"]).code, 2);
});
