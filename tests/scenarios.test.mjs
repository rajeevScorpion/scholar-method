// Demonstrations from the commission (docs 03 and 05): harvest scenarios 1 to 6 and milestones 2 and 4.
// Everything runs on temp copies of synthetic fixtures; no real project is touched.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { HARVEST, HOOK, INSTALL, REPO, SCHOLAR, gitOut, gitStatus, hv, methodCheckout, project, run, snapshot, tmp } from "./helpers.mjs";

const TARGET = "plugins/scholar-core/skills/scholar-contract";
const sch = (dir, ...a) => run(SCHOLAR, [...a, "--root", dir]);
const idOf = (r) => r.out.trim().split(/\s+/)[0];
const cfgPath = (dir) => join(dir, "scholar/scholar.json");
const setCfg = (dir, f) => { const c = JSON.parse(readFileSync(cfgPath(dir), "utf8")); f(c); writeFileSync(cfgPath(dir), JSON.stringify(c, null, 2)); };
const pfile = (dir, id) => join(dir, "scholar/harvest/pending", `${id}.md`);
const files = (dir, sub) => readdirSync(join(dir, sub)).filter((n) => n.endsWith(".md")).sort();

// a project with records of its own, adopted, with a project-specific deny list
function adopt(fixture, kind, denyTerms) {
  const dir = project(fixture);
  assert.equal(sch(dir, "init", "--apply", "--kind", kind).code, 0);
  setCfg(dir, (c) => { c.harvest.deny_terms = denyTerms; });
  return dir;
}
// a neutral proposal with the given body, taken through check, pass and approval
function approvedProposal(dir, title, body) {
  const id = idOf(hv(dir, "new", "--title", title, "--category", "rule", "--target", TARGET, "--problem", "A source was cited before anyone recorded how far it had been read.", "--solution", "Record a read status on every source and cite only what was read in full."));
  writeFileSync(pfile(dir, id), readFileSync(pfile(dir, id), "utf8") + `\n${body}\n`);
  assert.equal(hv(dir, "check", id, "--pass").code, 0);
  assert.equal(hv(dir, "approve", id).code, 0);
  return id;
}
const NEUTRAL = "Keep a read status next to each source: lead, abstract only, or read in full. A claim may rest only on sources read in full.";

test("1 and 2: harvest from a thesis and from a separate paper keep each project's records apart", () => {
  const thesis = adopt("thesis-existing", "thesis", ["Hive Placement"]);
  const paper = adopt("paper-new", "paper", ["Orchard Yield"]);
  sch(thesis, "new", "insight", "--title", "Thesis-only idea about hive placement");
  sch(paper, "new", "insight", "--title", "Paper-only idea about orchard yield");
  const a = approvedProposal(thesis, "Record a read status for every source", NEUTRAL);
  const b = approvedProposal(paper, "Check the units before comparing two tables", "Write the unit beside every column before two tables are compared.");
  assert.deepEqual(files(thesis, "scholar/harvest/pending"), [`${a}.md`]);
  assert.deepEqual(files(paper, "scholar/harvest/pending"), [`${b}.md`]);
  assert.deepEqual(files(thesis, "scholar/insights"), ["INS-0001.md"]);
  assert.match(readFileSync(join(thesis, "scholar/insights/INS-0001.md"), "utf8"), /hive placement/);
  assert.doesNotMatch(readFileSync(join(paper, "scholar/insights/INS-0001.md"), "utf8"), /hive placement/);
  // no cross-project reads: the paper's scan does not know the thesis bib key, and the thesis scan does not know the paper terms
  const cross = approvedProposalText(paper, "Mention a key that belongs to another project", "exampleauthor2020hives is only a made-up key here");
  assert.equal(hv(paper, "check", cross).code, 0, "the paper project has never seen that key");
  const cross2 = approvedProposalText(thesis, "Mention the other project term", "an orchard yield note for illustration");
  assert.equal(hv(thesis, "check", cross2).code, 0, "orchard yield is not a thesis deny term");
  assert.equal(hv(thesis, "check", approvedProposalText(thesis, "Mention an own term", "see the hive placement chapter")).code, 1);
});
function approvedProposalText(dir, title, body) {
  const id = idOf(hv(dir, "new", "--title", title, "--category", "rule", "--target", TARGET));
  writeFileSync(pfile(dir, id), readFileSync(pfile(dir, id), "utf8") + `\n${body}\n`);
  return id;
}

test("3: an approved item is shared without project material", () => {
  const dir = adopt("thesis-existing", "thesis", ["Hive Placement", "Exampleauthor"]);
  sch(dir, "new", "insight", "--title", "Hive placement may follow light");
  // a first draft that leaks: blocked, then rewritten neutrally
  const leaky = approvedProposalText(dir, "Record a read status for every source", "In the hive placement study INS-0001 cited exampleauthor2020hives from C:\\Users\\someone\\thesis.");
  const r = hv(dir, "check", leaky);
  assert.equal(r.code, 1);
  for (const rule of ["deny-term", "project-id", "local-path"]) assert.match(r.out, new RegExp(rule));
  assert.equal(hv(dir, "check", leaky, "--pass").code, 1);
  hv(dir, "decline", leaky, "--reason", "rewritten as a neutral proposal");
  const id = approvedProposal(dir, "Record a read status on sources before citing them", NEUTRAL);
  const out = join(tmp(), "bundle.md");
  const b = hv(dir, "bundle", id, "--out", out);
  assert.equal(b.code, 0, b.err);
  const text = readFileSync(out, "utf8");
  for (const forbidden of ["INS-0001", "exampleauthor", "Exampleauthor", "hive placement", "Hive Placement", dir, "Uncommitted edit", "scholar.json"]) assert.ok(!text.toLowerCase().includes(forbidden.toLowerCase()), `bundle leaks ${forbidden}`);
  assert.ok(text.includes(NEUTRAL));
});

test("4: a declined or unapproved item never bundles or promotes and is not offered again", () => {
  const dir = adopt("paper-new", "paper", []);
  const keep = approvedProposal(dir, "Approved lesson about source status", NEUTRAL);
  const never = approvedProposalText(dir, "Rejected lesson about colours", "Use blue everywhere.");
  const unapproved = approvedProposalText(dir, "Idea nobody approved yet", "Maybe a new template.");
  hv(dir, "decline", never, "--reason", "the scholar said no");
  const m = methodCheckout();
  const out = join(tmp(), "b.md");
  assert.equal(hv(dir, "bundle", never, "--out", out).code, 1);
  assert.equal(hv(dir, "promote", never, "--method", m).code, 1);
  assert.equal(hv(dir, "bundle", unapproved, "--out", out).code, 1);
  assert.equal(hv(dir, "promote", unapproved, "--method", m).code, 1);
  assert.equal(hv(dir, "bundle", "--out", out).code, 0);
  const t = readFileSync(out, "utf8");
  assert.ok(t.includes(keep) && !t.includes("Rejected lesson") && !t.includes("Idea nobody approved"));
  assert.equal(gitOut(m, "branch", "--list", "harvest/*"), "");
  assert.equal(hv(dir, "new", "--title", "Rejected lesson about colours", "--category", "rule", "--target", TARGET).code, 1, "not re-offered");
  assert.match(hv(dir, "list").out, /Rejected lesson about colours/);
});

test("5: no upstream permission: promote stays local and never pushes; a contributor exports a bundle", () => {
  const dir = adopt("paper-new", "paper", []);
  const id = approvedProposal(dir, "Approved lesson about source status", NEUTRAL);
  const m = methodCheckout();
  const r = hv(dir, "promote", id, "--method", m);
  assert.equal(r.code, 0, r.err);
  assert.equal(gitOut(m, "remote"), "", "no remote was configured or added");
  assert.match(readFileSync(pfile(dir, id), "utf8"), /^upstream_status: branch harvest\/.* \(local, not pushed\)$/m);
  assert.doesNotMatch(readFileSync(join(REPO, "plugins/scholar-core/skills/harvest/scripts/harvest.mjs"), "utf8"), /git\([^)]*"push"/, "the script contains no push call");
  // the contributor route: no checkout at all, just a bundle, and nothing outside the temp dir is written
  const contributor = adopt("paper-new", "paper", []);
  const cid = approvedProposal(contributor, "Approved lesson about source status", NEUTRAL);
  const out = join(tmp(), "bundle.md");
  assert.equal(hv(contributor, "bundle", cid, "--out", out).code, 0);
  assert.match(readFileSync(out, "utf8"), /issue or a pull request from your fork/);
  assert.match(readFileSync(pfile(contributor, cid), "utf8"), /^upstream_status: bundle-exported$/m);
});

test("6: a fresh session on another agent recovers the pending proposal and the provisional insight from repo files", () => {
  const dir = adopt("thesis-existing", "thesis", ["Hive Placement"]);
  sch(dir, "new", "insight", "--title", "Hive placement may follow light");
  const ins = join(dir, "scholar/insights/INS-0001.md");
  writeFileSync(ins, readFileSync(ins, "utf8").replace("kind: observation", "kind: hypothesis"));
  const hid = approvedProposalText(dir, "Record a read status before citing", NEUTRAL);
  const h = join(dir, "notes/session_handoff.md");
  writeFileSync(h, "# Session handoff\n\n**Stopped at:** Captured one hypothesis and one harvest proposal.\n\n**Next step:** Ask the scholar whether to accept the hypothesis.\n");
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  git("add", "scholar", "notes"); git("commit", "-q", "-m", "checkout");
  // the "other computer or agent": a plain clone, which carries only committed repo files
  const clone = tmp("scholar-clone-");
  execFileSync("git", ["clone", "-q", dir, clone]);
  const hook = run(HOOK, [], { cwd: clone }).out;
  assert.match(hook, /Stopped at: Captured one hypothesis/);
  assert.match(hook, /Next step: Ask the scholar whether to accept/);
  assert.match(hook, /awaiting the scholar's decision: 1/);
  assert.ok(hook.includes(hid), "hook names the pending proposal");
  assert.match(hook, /never present a hypothesis as a finding/);
  const status = sch(clone, "status").out;
  assert.match(status, /INS-0001 {2}\(hypothesis, evidence none\)/);
  assert.match(status, /insights by decision: pending 1/);
  assert.ok(status.includes(hid));
  assert.doesNotMatch(status, /supported|verified/i);
  assert.equal(sch(clone, "validate").code, 0);
  // a different agent: Codex skills installed into a temp skills dir, run from the installed copy
  const skills = tmp("scholar-codex-skills-");
  assert.equal(run(INSTALL, ["--agent", "codex", "--target", skills]).code, 0);
  const names = readdirSync(skills).filter((n) => existsSync(join(skills, n, ".scholar-method.json")));
  assert.equal(names.length, 16, names.join(", "));
  for (const n of names) assert.ok(existsSync(join(skills, n, "SKILL.md")), n);
  const installed = run(join(skills, "scholar-start/scripts/scholar.mjs"), ["status", "--root", clone]);
  assert.match(installed.out, /INS-0001/);
  const list = run(join(skills, "harvest/scripts/harvest.mjs"), ["list", "--root", clone]);
  assert.match(list.out, new RegExp(hid), "the installed harvest script reads the same pending proposal");
  assert.equal(run(join(skills, "harvest/scripts/harvest.mjs"), ["new", "--title", "Installed copy check", "--category", "rule", "--target", TARGET, "--root", clone]).code, 0, "template resolves from the installed folder");
});

test("milestone 2: adoption is idempotent and the scholar's uncommitted change survives", () => {
  const dir = project("thesis-existing");
  const before = snapshot(dir), st = gitStatus(dir);
  assert.equal(sch(dir, "init", "--dry-run").code, 0);
  assert.deepEqual(snapshot(dir), before, "nothing written before confirmation");
  sch(dir, "init", "--apply", "--kind", "thesis");
  const once = snapshot(dir), content = (p) => readFileSync(join(dir, p), "utf8");
  for (const [p, h] of Object.entries(before)) assert.equal(once[p], h, `${p} changed`);
  assert.match(content("AGENTS.md"), /Uncommitted edit/); // the project helper edits the first .md file
  assert.match(sch(dir, "init", "--apply").out, /No changes/);
  assert.deepEqual(snapshot(dir), once);
  const outside = (s) => s.split("\n").filter((l) => !l.includes("scholar/")).join("\n");
  assert.equal(outside(gitStatus(dir)), outside(st), "still one modified file and one untracked file, as before");
});

test("milestone 4: after a simulated new session an insight is still a hypothesis, never a finding", () => {
  const dir = tmp("scholar-example-");
  cpSync(join(REPO, "examples/research"), dir, { recursive: true });
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  git("init", "-q"); git("config", "user.email", "t@example.org"); git("config", "user.name", "T"); git("add", "-A"); git("commit", "-q", "-m", "x");
  const hook = run(HOOK, [], { cwd: dir }).out;
  assert.match(hook, /Do not write the influence claim up as a finding|Stopped at: Synthetic test fixture/);
  assert.match(hook, /awaiting the scholar's decision: 1/);
  const status = sch(dir, "status").out;
  assert.match(status, /INS-0001 {2}\(hypothesis, evidence none\)/);
  const ins = readFileSync(join(dir, "scholar/insights/INS-0002.md"), "utf8");
  assert.match(ins, /author_decision: accepted/);
  assert.match(ins, /kind: hypothesis/);
  assert.doesNotMatch(ins, /evidence_status: supported/);
  assert.equal(sch(dir, "validate").code, 0);
});
