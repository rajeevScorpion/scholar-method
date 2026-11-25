import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, run, tmp } from "./helpers.mjs";

const PRE = join(REPO, "plugins/scholar-publish/skills/build/scripts/preflight.mjs");
const vis = (id, status, exp) => `---\nid: ${id}\nstatus: ${status}\npurpose: "p"\nkind: chart\nevidence_class: empirical\ninput_refs: [data.csv]\nsource_status: ok\nquestion_links: []\ntransforms: ""\nrender_spec: ""\nlimitations: ""\nassumptions: []\nreview_status: ok\nexports: [${exp}]\n---\n\n## Caption\n`;

function project(md, sidecars = {}, extra = []) {
  const dir = tmp("pre-");
  mkdirSync(join(dir, "scholar/visuals"), { recursive: true });
  writeFileSync(join(dir, "ms.qmd"), md);
  writeFileSync(join(dir, "_quarto.yml"), "project:\n  type: manuscript\n");
  for (const [id, body] of Object.entries(sidecars)) writeFileSync(join(dir, "scholar/visuals", `${id}.md`), body);
  const r = run(PRE, ["--root", dir, "--json", ...extra, join(dir, "ms.qmd")]);
  assert.ok([0, 1].includes(r.code), r.err);
  return { ...JSON.parse(r.out), code: r.code };
}

test("GAP markers warn in a draft build and fail a submission build; code samples are ignored", () => {
  const md = "A claim. [GAP: CLM-0004 unverified]\n\n```text\n[GAP: only in code]\n```\n";
  const draft = project(md, {}, ["--strict"]);
  assert.deepEqual(draft.findings.filter((f) => f.rule === "gap-marker").map((f) => [f.severity, f.line]), [["warn", 1]]);
  assert.equal(draft.code, 1);
  const sub = project(md, {}, ["--submission"]);
  assert.equal(sub.findings.find((f) => f.rule === "gap-marker").severity, "error");
  assert.equal(project("Clean text.\n", {}, ["--strict", "--submission"]).code, 0);
});

test("figures with a sidecar must be approved or manuscript-ready; others are advisory", () => {
  const md = "![a](figs/a.png)\n\n![b](figs/b.png)\n\n![c](figs/c.png)\n\nSee VIS-0009.\n";
  const r = project(md, { "VIS-0001": vis("VIS-0001", "exploratory", "figs/a.png"), "VIS-0002": vis("VIS-0002", "manuscript-ready", "figs/b.png") });
  const by = (rule) => r.findings.filter((f) => f.rule === rule);
  assert.equal(by("figure-not-approved").length, 1);
  assert.match(by("figure-not-approved")[0].message, /VIS-0001/);
  assert.equal(by("figure-no-sidecar").length, 1);
  assert.equal(by("figure-no-sidecar")[0].severity, "advisory");
  assert.equal(by("figure-sidecar-missing").length, 1);
  assert.equal(r.findings.filter((f) => f.message.includes("VIS-0002")).length, 0);
});

test("detects the Quarto build without running it and finds the writing-pack scripts", () => {
  const r = project("Text.\n");
  assert.match(r.build, /quarto render/);
  assert.equal(r.run_first.length, 2);
  assert.match(r.run_first[0], /lint-prose\.mjs/);
  assert.match(r.run_first[1], /check-citations\.mjs/);
});

test("example 04: preflight flags the GAP and nothing else", () => {
  const dir = tmp("pre-");
  cpSync(join(REPO, "examples/writing/04-evidence-to-draft"), dir, { recursive: true });
  const r = run(PRE, ["--root", dir, "--json", "--strict", join(dir, "draft.md")]);
  assert.equal(r.code, 1);
  assert.deepEqual(JSON.parse(r.out).findings.map((f) => f.rule), ["gap-marker"]);
});

test("preflight warns when a bibliography has no csl, or the csl differs from citation.style", () => {
  const run1 = (yml, cfg) => {
    const dir = tmp("pre-");
    writeFileSync(join(dir, "ms.qmd"), "Text.\n");
    writeFileSync(join(dir, "_quarto.yml"), yml);
    if (cfg) { mkdirSync(join(dir, "scholar"), { recursive: true }); writeFileSync(join(dir, "scholar/scholar.json"), JSON.stringify(cfg)); }
    return JSON.parse(run(PRE, ["--root", dir, "--json", join(dir, "ms.qmd")]).out).findings.map((f) => f.rule);
  };
  assert.ok(run1("bibliography: refs.bib\n").includes("no-csl"));
  assert.ok(!run1("project:\n  type: manuscript\n").includes("no-csl")); // no bibliography, nothing to style
  assert.deepEqual(run1("bibliography: refs.bib\ncsl: csl/apa.csl\n", { citation: { style: "apa-7", csl: null } }).filter((r) => r.startsWith("csl")), ["csl-missing-file"]);
  assert.ok(run1("bibliography: refs.bib\ncsl: csl/ieee.csl\n", { citation: { style: "apa-7", csl: null } }).includes("csl-mismatch"));
  assert.ok(!run1("bibliography: refs.bib\ncsl: csl/ieee.csl\n", { citation: { style: "ieee", csl: "csl/ieee.csl" } }).includes("csl-mismatch"));
});
