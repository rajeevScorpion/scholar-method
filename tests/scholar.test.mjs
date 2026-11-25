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
  assert.equal(cfg.project.kind, "journal-paper");
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

test("detect maps numbered folders, Markdown chapters, visual ledger, asset register and Excalidraw boards", () => {
  const dir = tmp("scholar-detect-");
  const w = (p, c = "x\n") => { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), c); };
  w("02_chapters/ch01_intro.md"); w("02_chapters/ch02_review.md"); w("04_assets/asset_register.md"); w("04_assets/visual_asset_ledger.md");
  w("04_assets/boards/work.excalidraw", "{}"); w("04_assets/figures/a.png");
  const r = sch(dir, "init", "--dry-run");
  assert.match(r.out, /drafts\s+-> 02_chapters\b/);
  assert.match(r.out, /assets\s+-> 04_assets\b/);
  assert.match(r.out, /visual_ledger\s+-> 04_assets\/visual_asset_ledger\.md/);
  assert.match(r.out, /asset_register\s+-> 04_assets\/asset_register\.md/);
  assert.match(r.out, /boards\s+-> 04_assets\/boards/);
});

test("init lists IDs already in the project's own register as external_ids", () => {
  const dir = tmp("scholar-ext-");
  mkdirSync(join(dir, "refs"), { recursive: true });
  writeFileSync(join(dir, "refs/source_register.md"), "| SRC-0001 | a |\n| SRC-0017 | b |\n| not-an-id | c |\n");
  sch(dir, "init", "--apply");
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "scholar/scholar.json"), "utf8")).external_ids, ["SRC-0001", "SRC-0017"]);
});

// ---------- project-type detection ----------
const detect = (dir) => JSON.parse(sch(dir, "detect", "--json").out);
const cfgOf = (dir) => JSON.parse(readFileSync(join(dir, "scholar/scholar.json"), "utf8"));

test("detect names the kind of each fixture and is write-free", () => {
  const t = project("thesis-existing"), before = snapshot(t), st = gitStatus(t);
  const d = detect(t);
  assert.equal(d.kind, "thesis");
  assert.ok(["high", "medium"].includes(d.confidence));
  assert.ok(d.signals.length >= 1);
  assert.deepEqual(snapshot(t), before);
  assert.equal(gitStatus(t), st);
  assert.equal(detect(project("paper-existing")).kind, "journal-paper");
  assert.equal(detect(project("review-existing")).kind, "review");
});

test("detect on a near-empty folder is low confidence and offers alternatives", () => {
  const d = detect(project("paper-new"));
  assert.equal(d.confidence, "low");
  assert.ok(d.alternatives.length >= 2);
  assert.equal(detect(tmp()).confidence, "low");
});

test("init --dry-run and doctor --json include the detection", () => {
  const dir = project("thesis-existing");
  assert.match(sch(dir, "init", "--dry-run").out, /Detected project type: thesis/);
  const doc = JSON.parse(sch(dir, "doctor", "--json").out);
  assert.equal(doc.detected.kind, "thesis");
  assert.equal(doc.project, null);
});

test("init --apply without --kind records no kind and reminds; re-run with --kind fills it once", () => {
  const dir = project("thesis-existing");
  const r = sch(dir, "init", "--apply");
  assert.match(r.out, /Reminder: the project kind is not recorded/);
  assert.equal(cfgOf(dir).project.kind, null);
  assert.match(sch(dir, "init", "--apply", "--kind", "thesis").out, /Recording project kind thesis/);
  assert.deepEqual(cfgOf(dir).project, { kind: "thesis", kind_source: "detected-confirmed" });
  assert.match(sch(dir, "init", "--apply", "--kind", "review").out, /Kept the confirmed project kind/);
  assert.equal(cfgOf(dir).project.kind, "thesis");
});

test("init --kind records detected-confirmed or owner-defined; paper is an alias", () => {
  const a = project("paper-existing");
  sch(a, "init", "--apply", "--kind", "paper");
  assert.deepEqual(cfgOf(a).project, { kind: "journal-paper", kind_source: "detected-confirmed" });
  const b = project("review-existing");
  assert.equal(sch(b, "init", "--apply", "--kind", "other", "--describe", "A living evidence map, not a review").code, 0);
  assert.deepEqual(cfgOf(b).project, { kind: "other", kind_source: "owner-defined", description: "A living evidence map, not a review" });
  assert.equal(sch(project("paper-new"), "init", "--apply", "--kind", "novel").code, 2);
  assert.equal(sch(b, "validate").code, 0);
});

test("validate rejects a bad project kind", () => {
  const dir = project("thesis-existing");
  sch(dir, "init", "--apply", "--kind", "thesis");
  const c = cfgOf(dir); c.project.kind = "memoir";
  writeFileSync(join(dir, "scholar/scholar.json"), JSON.stringify(c));
  const r = sch(dir, "validate");
  assert.equal(r.code, 1);
  assert.match(r.out, /project\.kind is "memoir"/);
});

test("init writes citation defaults (APA 7, no csl yet); validate type-checks citation", () => {
  const dir = adopted();
  const cfg = cfgOf(dir);
  assert.deepEqual(cfg.citation, { style: "apa-7", csl: null });
  assert.equal(cfg.profile.citation_style, undefined);
  assert.equal(sch(dir, "validate").code, 0);
  const p = join(dir, "scholar/scholar.json");
  writeFileSync(p, JSON.stringify({ ...cfg, citation: { style: "nature-2099", csl: 3 } }));
  const v = sch(dir, "validate");
  assert.equal(v.code, 1);
  assert.match(v.out, /WARN .*citation\.style "nature-2099" is not a known style id/);
  assert.match(v.out, /citation\.csl must be null or a path string/);
  writeFileSync(p, JSON.stringify({ ...cfg, citation: { style: "custom", csl: null } }));
  assert.match(sch(dir, "validate").out, /WARN .*"custom" but citation\.csl names no file/);
  writeFileSync(p, JSON.stringify({ ...cfg, citation: "apa" }));
  assert.match(sch(dir, "validate").out, /"citation" must be an object/);
});
