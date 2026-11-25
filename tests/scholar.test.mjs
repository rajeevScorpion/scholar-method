import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCHOLAR, project, run, snapshot, gitStatus, tmp, homeEnv } from "./helpers.mjs";

const sch = (dir, ...a) => run(SCHOLAR, [...a, "--root", dir]);
const outsideScholar = (s) => s.split("\n").filter((l) => !l.includes("scholar/")).join("\n");

test("init --dry-run writes nothing", () => {
  const dir = project("thesis-existing");
  const before = snapshot(dir), st = gitStatus(dir);
  const r = sch(dir, "init", "--dry-run");
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Would create/);
  assert.deepEqual(snapshot(dir), before);
  assert.equal(gitStatus(dir), st);
});

test("init --apply on an existing thesis maps equivalents and touches nothing else", () => {
  const dir = project("thesis-existing");
  const before = snapshot(dir), st = gitStatus(dir);
  const r = sch(dir, "init", "--apply", "--kind", "thesis");
  assert.equal(r.code, 0, r.err);
  const after = snapshot(dir);
  for (const [p, h] of Object.entries(before)) assert.equal(after[p], h, `${p} changed`);
  for (const p of Object.keys(after)) if (!(p in before)) assert.ok(p.startsWith("scholar/"), `${p} created outside scholar/`);
  const cfg = JSON.parse(readFileSync(join(dir, "scholar/scholar.json"), "utf8"));
  assert.equal(cfg.paths.status, "notes/project_state.md");
  assert.equal(cfg.paths.handoff, "notes/session_handoff.md");
  assert.equal(cfg.paths.decisions, "notes/decision_log.md");
  assert.equal(cfg.paths.sources, "refs/source_register.md");
  assert.equal(cfg.paths.bib, "refs/library.bib");
  assert.equal(cfg.paths.drafts, "chapters");
  assert.equal(cfg.paths.agents_md, "AGENTS.md");
  for (const dup of ["STATUS.md", "HANDOFF.md", "DECISIONS.md"]) assert.ok(!existsSync(join(dir, "scholar", dup)), `${dup} duplicated`);
  assert.ok(!existsSync(join(dir, "scholar/sources")), "sources folder created despite a register");
  assert.ok(existsSync(join(dir, "scholar/PROJECT_MAP.md")));
  assert.equal(outsideScholar(gitStatus(dir)), outsideScholar(st)); // the uncommitted change is still there, unchanged
});

test("second --apply changes nothing", () => {
  const dir = project("thesis-existing");
  sch(dir, "init", "--apply");
  const snap = snapshot(dir);
  const r = sch(dir, "init", "--apply");
  assert.match(r.out, /No changes/);
  assert.deepEqual(snapshot(dir), snap);
});

test("new paper project gets its own status, handoff, decisions and sources", () => {
  const dir = project("paper-new");
  const r = sch(dir, "init", "--apply", "--kind", "paper");
  assert.equal(r.code, 0, r.err);
  for (const f of ["STATUS.md", "HANDOFF.md", "DECISIONS.md", "scholar.json", "PROJECT_MAP.md", "harvest/declined.md"]) assert.ok(existsSync(join(dir, "scholar", f)), f);
  const cfg = JSON.parse(readFileSync(join(dir, "scholar/scholar.json"), "utf8"));
  assert.equal(cfg.profile.kind, "paper");
  assert.equal(cfg.paths.status, "scholar/STATUS.md");
  assert.equal(cfg.paths.sources, "scholar/sources/");
  assert.match(sch(dir, "init", "--apply").out, /No changes/);
});

function adopted() {
  const dir = project("paper-new");
  sch(dir, "init", "--apply", "--kind", "paper");
  return dir;
}

test("new allocates sequential ids and validate passes on good records", () => {
  const dir = adopted();
  assert.match(sch(dir, "new", "insight", "--title", "Hive placement may follow light").out, /INS-0001/);
  assert.match(sch(dir, "new", "insight", "--title", 'A "quoted" idea').out, /INS-0002/);
  assert.match(sch(dir, "new", "claim", "--title", "Placement affects yield").out, /CLM-0001/);
  assert.match(sch(dir, "new", "source", "--title", "A synthetic source").out, /SRC-0001/);
  assert.match(sch(dir, "new", "visual", "--title", "Placement by season").out, /VIS-0001/);
  const v = sch(dir, "validate");
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, /5 record\(s\) checked: 0 error/);
  const s = sch(dir, "status");
  assert.match(s.out, /INS-0001/);
  assert.match(s.out, /pending 2/);
});

test("validate fails with clear messages on bad enums, dangling links, duplicate ids", () => {
  const dir = adopted();
  sch(dir, "new", "insight", "--title", "One");
  sch(dir, "new", "insight", "--title", "Two");
  sch(dir, "new", "claim", "--title", "A claim");
  const ins = join(dir, "scholar/insights/INS-0001.md");
  writeFileSync(ins, readFileSync(ins, "utf8").replace("maturity: captured", "maturity: finished").replace("sources: []", "sources: [SRC-0099]"));
  const two = join(dir, "scholar/insights/INS-0002.md");
  writeFileSync(two, readFileSync(two, "utf8").replace("id: INS-0002", "id: INS-0001"));
  const clm = join(dir, "scholar/claims/CLM-0001.md");
  writeFileSync(clm, readFileSync(clm, "utf8").replace("supports: []", 'supports: ["externalkey2020 p.12"]'));
  const v = sch(dir, "validate");
  assert.equal(v.code, 1);
  assert.match(v.out, /"maturity" is "finished", allowed: captured \| explored/);
  assert.match(v.out, /dangling link in "sources": SRC-0099/);
  assert.match(v.out, /duplicate id INS-0001/);
  assert.match(v.out, /file name must be INS-0001\.md/);
  assert.match(v.out, /dangling link in "supports": externalkey2020 p\.12/);
  // declaring the external id in scholar.json makes that link valid
  const cfgPath = join(dir, "scholar/scholar.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  cfg.external_ids = ["externalkey2020"];
  writeFileSync(cfgPath, JSON.stringify(cfg));
  assert.doesNotMatch(sch(dir, "validate").out, /externalkey2020/);
});

test("validate resolves bib citekeys, rejects nesting, warns on a hypothesis used as a data result", () => {
  const dir = project("thesis-existing");
  sch(dir, "init", "--apply");
  sch(dir, "new", "insight", "--title", "H");
  sch(dir, "new", "claim", "--title", "C");
  const ins = join(dir, "scholar/insights/INS-0001.md");
  writeFileSync(ins, readFileSync(ins, "utf8").replace("kind: observation", "kind: hypothesis").replace("sources: []", "sources: [exampleauthor2020hives]"));
  const clm = join(dir, "scholar/claims/CLM-0001.md");
  writeFileSync(clm, readFileSync(clm, "utf8").replace("kind: source-statement", "kind: data-result").replace("supports: []", "supports: [INS-0001]"));
  let v = sch(dir, "validate");
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, /WARN .*hypothesis INS-0001/);
  writeFileSync(ins, readFileSync(ins, "utf8").replace("rq: []", "rq:\n  nested: 1"));
  v = sch(dir, "validate");
  assert.equal(v.code, 1);
  assert.match(v.out, /nesting is not supported/);
});

test("new source is refused when the project keeps its own register", () => {
  const dir = project("thesis-existing");
  sch(dir, "init", "--apply");
  const r = sch(dir, "new", "source", "--title", "x");
  assert.equal(r.code, 1);
  assert.match(r.err, /own source register/);
});

test("doctor reports Humanizer provenance and studio-core", () => {
  const home = tmp("scholar-home-"), dir = adopted();
  mkdirSync(join(home, ".claude/plugins"), { recursive: true });
  writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ version: 2, plugins: { "studio-core@studio-method": [{}], "humanizer@someone-else": [{}] } }));
  mkdirSync(join(home, ".codex/skills/humanizer"), { recursive: true });
  writeFileSync(join(home, ".codex/skills/humanizer/SKILL.md"), "---\nname: humanizer\n---\n");
  let j = JSON.parse(run(SCHOLAR, ["doctor", "--json", "--root", dir], { env: homeEnv(home) }).out);
  assert.equal(j.humanizer.status, "other-or-unverified");
  assert.equal(j.studio_core.installed_in_claude, true);
  assert.equal(j.studio_core.disabled_in_this_project, false);
  assert.ok(j.humanizer.found.some((f) => /not blader/.test(f.source)));
  assert.ok(j.humanizer.found.some((f) => f.agent === "codex" && /unverified/.test(f.source)));
  // official plugin id and a project-level disable
  writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ plugins: { "studio-core@studio-method": [{}], "humanizer@humanizer": [{}] } }));
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "studio-core@studio-method": false } }));
  j = JSON.parse(run(SCHOLAR, ["doctor", "--json", "--root", dir], { env: homeEnv(home) }).out);
  assert.equal(j.humanizer.status, "blader-present");
  assert.equal(j.studio_core.disabled_in_this_project, true);
  // empty home: absent
  j = JSON.parse(run(SCHOLAR, ["doctor", "--json", "--root", dir], { env: homeEnv(tmp("scholar-empty-")) }).out);
  assert.equal(j.humanizer.status, "absent");
});

test("init writes the default writing object; writing profile stays opt-in; validate type-checks writing", () => {
  const dir = adopted();
  const cfgPath = join(dir, "scholar/scholar.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  assert.deepEqual(cfg.writing, { no_dashes: true, no_oxford_comma: true, serial_comma: false, spelling: "indian", no_contractions: true, ai_register: true, protected_terms: [] });
  assert.equal(cfg.profile.writing_profile, null);
  assert.equal(sch(dir, "validate").code, 0);
  cfg.writing.no_dashes = "yes"; cfg.writing.protected_terms = "x"; cfg.writing.mystery = 1;
  writeFileSync(cfgPath, JSON.stringify(cfg));
  const v = sch(dir, "validate");
  assert.equal(v.code, 1);
  assert.match(v.out, /writing\.no_dashes must be a boolean/);
  assert.match(v.out, /writing\.protected_terms must be an array/);
  assert.match(v.out, /WARN .*unknown writing key "mystery"/);
});
