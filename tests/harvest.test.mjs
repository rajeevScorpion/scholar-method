import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCHOLAR, hv, methodCheckout, gitOut, project, run, tmp } from "./helpers.mjs";

const TARGET = "plugins/scholar-core/skills/scholar-contract";
function adopted(fixture = "paper-new") {
  const dir = project(fixture);
  run(SCHOLAR, ["init", "--apply", "--kind", "thesis", "--root", dir]);
  return dir;
}
const cfgOf = (dir) => JSON.parse(readFileSync(join(dir, "scholar/scholar.json"), "utf8"));
const setCfg = (dir, f) => { const c = cfgOf(dir); f(c); writeFileSync(join(dir, "scholar/scholar.json"), JSON.stringify(c, null, 2)); };
const idOf = (r) => r.out.trim().split(/\s+/)[0];
const pfile = (dir, id) => join(dir, "scholar/harvest/pending", `${id}.md`);
const mk = (dir, title = "Record the read status before citing a source") =>
  idOf(hv(dir, "new", "--title", title, "--category", "rule", "--target", TARGET));
function approve(dir, id) {
  const r = hv(dir, "check", id, "--pass");
  assert.equal(r.code, 0, r.out + r.err);
  const a = hv(dir, "approve", id);
  assert.equal(a.code, 0, a.out + a.err);
}

test("new writes the doc 03 fields from the template and refuses bad input", () => {
  const dir = adopted();
  const r = hv(dir, "new", "--title", "Record the read status before citing", "--category", "research-gotcha", "--target", TARGET, "--date", "2026-12-01");
  assert.equal(r.code, 0, r.err);
  const id = idOf(r);
  assert.equal(id, "HRV-2026-12-01-record-the-read-status-before-citing");
  const t = readFileSync(pfile(dir, id), "utf8");
  for (const k of ["proposal_id", "created", "source_project", "category", "problem", "observed_solution", "generalisability", "evidence_or_test", "proposed_target", "privacy_review", "review_status", "owner_approval", "upstream_status"])
    assert.match(t, new RegExp(`^${k}:`, "m"), k);
  assert.match(t, /^source_project: "generic"$/m);
  assert.match(t, /^privacy_review: pending$/m);
  assert.match(t, /^owner_approval: pending$/m);
  assert.match(t, /^upstream_status: not-submitted$/m);
  assert.equal(hv(dir, "new", "--title", "x", "--category", "poem", "--target", TARGET).code, 2);
  assert.equal(hv(dir, "new", "--title", "x", "--category", "rule", "--target", "C:/Users/me/method").code, 2);
  assert.equal(hv(dir, "new", "--title", "x", "--category", "rule", "--target", "../escape").code, 2);
  assert.equal(hv(dir, "new", "--title", "Record the read status before citing", "--category", "rule", "--target", TARGET).code, 1, "duplicate pending title");
});

test("check flags private material and passes clean text", () => {
  const dir = adopted("thesis-existing");
  setCfg(dir, (c) => { c.harvest = { allow_domains: [], deny_terms: ["Zebrafinch", "Hive Placement"] }; });
  writeFileSync(join(dir, "chapters/ch1.qmd"), "---\ntitle: x\n---\n\nThe bees were placed near the eastern orchard because the morning light reached the boxes first and stayed there until noon.\n");
  const id = mk(dir);
  const base = readFileSync(pfile(dir, id), "utf8");
  const quote = Array.from({ length: 30 }, (_, i) => "word" + i).join(" ");
  const bad = base + `
Contact a.person@example.org or +91 98765 43210. Files at C:\\Users\\someone\\thesis and /Users/someone/thesis and /home/x/y.
See https://example.com/paper and 10.1234/abcd.5678.
She wrote "${quote}" which is long.
Zebrafinch and the hive placement study. Records exampleauthor2020hives and S-01.
The bees were placed near the eastern orchard because the morning light reached the boxes first.
`;
  writeFileSync(pfile(dir, id), bad);
  const r = hv(dir, "check", id);
  assert.equal(r.code, 1);
  for (const rule of ["email", "phone", "local-path", "long-quote", "deny-term", "project-id", "manuscript-overlap"]) assert.match(r.out, new RegExp(` ${rule} \\[BLOCK\\]`), rule);
  assert.match(r.out, / url \[advisory\]/);
  assert.match(r.out, / doi \[advisory\]/);
  assert.match(r.out, /exampleauthor2020hives/);
  assert.match(r.out, /\bS-01\b/);
  assert.match(r.out, /Zebrafinch/);
  assert.match(r.out, /C:\\Users/);
  assert.match(r.out, /\/Users\/someone/);
  // clean text: only the advisory (URL) remains, exit 0
  writeFileSync(pfile(dir, id), base + "\nSee https://example.com for background.\n");
  const c = hv(dir, "check", id);
  assert.equal(c.code, 0, c.out);
  assert.match(c.out, / url \[advisory\]/);
  assert.doesNotMatch(c.out, /local-path/, "https:// must not look like a drive path");
  // an allow list makes allowed hosts silent and others blocking
  setCfg(dir, (cfg) => { cfg.harvest.allow_domains = ["docs.example.org"]; });
  writeFileSync(pfile(dir, id), base + "\nSee https://docs.example.org/guide and https://elsewhere.net/x.\n");
  const a = hv(dir, "check", id);
  assert.equal(a.code, 1);
  assert.match(a.out, /elsewhere\.net/);
  assert.doesNotMatch(a.out, /docs\.example\.org\/guide/);
  // dates and short numbers are not phones
  writeFileSync(pfile(dir, id), base + "\nChecked on 2026-12-01 with 12 items and version 0.1.0.\n");
  assert.equal(hv(dir, "check", id).code, 0);
});

test("privacy pass is bound to the text; approval needs it; any edit invalidates", () => {
  const dir = adopted();
  const id = mk(dir);
  assert.equal(hv(dir, "approve", id).code, 1, "approve before a passed check");
  // advisory hits need the scholar to say yes
  writeFileSync(pfile(dir, id), readFileSync(pfile(dir, id), "utf8") + "\nSee https://example.com.\n");
  let r = hv(dir, "check", id, "--pass");
  assert.equal(r.code, 1);
  assert.match(readFileSync(pfile(dir, id), "utf8"), /^privacy_review: pending$/m);
  r = hv(dir, "check", id, "--pass", "--accept-advisory");
  assert.equal(r.code, 0, r.out);
  assert.match(readFileSync(pfile(dir, id), "utf8"), /^privacy_review: passed$/m);
  assert.equal(hv(dir, "approve", id).code, 0);
  assert.match(readFileSync(pfile(dir, id), "utf8"), /^owner_approval: yes$/m);
  // an edit after the pass breaks the gate
  writeFileSync(pfile(dir, id), readFileSync(pfile(dir, id), "utf8") + "\nOne more line.\n");
  const b = hv(dir, "bundle", id, "--out", join(tmp(), "b.md"));
  assert.equal(b.code, 1);
  assert.match(b.err, /text changed after the privacy check/);
  // blocking hits cannot be passed
  const id2 = mk(dir, "A second lesson about dates");
  writeFileSync(pfile(dir, id2), readFileSync(pfile(dir, id2), "utf8") + "\nwrite to me@example.org\n");
  assert.equal(hv(dir, "check", id2, "--pass").code, 1);
  assert.match(readFileSync(pfile(dir, id2), "utf8"), /^privacy_review: pending$/m);
});

test("decline logs the title, deletes the file, and the item is never re-offered", () => {
  const dir = adopted();
  const id = mk(dir, "Always ask before quoting a source");
  const d = hv(dir, "decline", id, "--reason", "already covered by the contract");
  assert.equal(d.code, 0, d.err);
  assert.ok(!existsSync(pfile(dir, id)));
  const log = readFileSync(join(dir, "scholar/harvest/declined.md"), "utf8");
  assert.match(log, /^- \d{4}-\d{2}-\d{2} \| HRV-.*-always-ask-before-quoting-a-source \| Always ask before quoting a source \| already covered by the contract$/m);
  const l = JSON.parse(hv(dir, "list", "--json").out);
  assert.equal(l.pending.length, 0);
  assert.equal(l.declined[0].title, "Always ask before quoting a source");
  // same title, different case and punctuation: refused
  const again = hv(dir, "new", "--title", "always ask before quoting a source!", "--category", "rule", "--target", TARGET);
  assert.equal(again.code, 1);
  assert.match(again.err, /already declined/);
  // a candidate with no file can be declined by title
  assert.equal(hv(dir, "decline", "--title", "Colour palettes", "--reason", "project specific").code, 0);
  assert.equal(hv(dir, "new", "--title", "Colour palettes", "--category", "rule", "--target", TARGET).code, 1);
  assert.match(hv(dir, "list").out, /Declined, do not offer again \(2\)/);
});

test("bundle exports approved items only and sends nothing", () => {
  const dir = adopted();
  const a = mk(dir, "Approved lesson about source status");
  const b = mk(dir, "Unapproved lesson about dates");
  approve(dir, a);
  const out = join(tmp(), "bundle.md");
  assert.equal(hv(dir, "bundle", b, "--out", out).code, 1, "unapproved id refused");
  assert.ok(!existsSync(out));
  const r = hv(dir, "bundle", "--out", out);
  assert.equal(r.code, 0, r.err);
  const t = readFileSync(out, "utf8");
  assert.match(t, /^# Scholar Method harvest bundle/);
  assert.match(t, /harvest-inbox\//);
  assert.ok(t.includes(`<!-- harvest-proposal: ${a} -->`));
  assert.ok(!t.includes(b));
  assert.match(readFileSync(pfile(dir, a), "utf8"), /^upstream_status: bundle-exported$/m);
  assert.match(readFileSync(pfile(dir, b), "utf8"), /^upstream_status: not-submitted$/m);
});

test("promote: local branch and commit in a method checkout, never a push; refuses unsafe targets", () => {
  const dir = adopted();
  const id = mk(dir, "Approved lesson for promotion");
  const m = methodCheckout();
  assert.equal(hv(dir, "promote", id, "--method", m).code, 1, "unapproved");
  approve(dir, id);
  const branch0 = gitOut(m, "branch", "--show-current");
  assert.equal(hv(dir, "promote", id, "--method", tmp("not-method-")).code, 1, "not a method checkout");
  writeFileSync(join(m, "dirty.txt"), "x"); // an untracked file counts as dirty
  assert.equal(hv(dir, "promote", id, "--method", m).code, 1, "dirty checkout");
  assert.equal(gitOut(m, "branch", "--list", `harvest/${id}`), "");
  unlinkSync(join(m, "dirty.txt"));
  const r = hv(dir, "promote", id, "--method", m);
  assert.equal(r.code, 0, r.err + r.out);
  assert.equal(gitOut(m, "branch", "--show-current"), branch0, "the maintainer checkout stays on its own branch");
  assert.equal(gitOut(m, "log", `harvest/${id}`, "-1", "--format=%s"), "harvest: Approved lesson for promotion");
  assert.doesNotMatch(gitOut(m, "log", `harvest/${id}`, "-1", "--format=%B"), /Co-Authored|Generated with/);
  assert.ok(gitOut(m, "show", `harvest/${id}:harvest-inbox/${id}.md`).includes("proposal_id"));
  assert.equal(gitOut(m, "remote"), "", "no remote exists or was added");
  assert.match(readFileSync(pfile(dir, id), "utf8"), new RegExp(`^upstream_status: branch harvest/${id} \\(local, not pushed\\)$`, "m"));
  assert.match(r.out, /git -C .* push -u origin harvest\//); // printed for the owner, not run
  assert.match(r.out, /fork/);
  assert.match(r.out, /bundle/);
  assert.equal(hv(dir, "promote", id, "--method", m).code, 1, "branch already exists");
});
