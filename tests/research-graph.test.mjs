import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, run, tmp } from "./helpers.mjs";

const GRAPH = join(REPO, "plugins/scholar-research/skills/evidence/scripts/graph.mjs");
const EXAMPLE = join(REPO, "examples/research");

function build(dir = tmp()) {
  cpSync(EXAMPLE, dir, { recursive: true });
  return dir;
}
const gen = (dir, out = "map") => {
  const r = run(GRAPH, ["--root", dir, "--out", join(dir, out)]);
  assert.equal(r.code, 0, r.err);
  return { r, cyto: JSON.parse(readFileSync(join(dir, `${out}.cyto.json`), "utf8")), mmd: readFileSync(join(dir, `${out}.mmd`), "utf8"), html: readFileSync(join(dir, `${out}.html`), "utf8") };
};

test("verified, tentative and challenge edges are styled differently in cyto.json and mmd", () => {
  const { cyto, mmd } = gen(build());
  const edges = cyto.elements.edges;
  const cls = (id) => edges.find((e) => e.data.id === id).classes;
  assert.match(cls("CLM-0001|supports|SRC-0001"), /\bverified\b/);
  assert.match(cls("CLM-0002|supports|SRC-0002"), /\btentative\b/);
  assert.match(cls("CLM-0003|challenges|SRC-0003"), /\bchallenges\b/);
  const sheet = (sel) => cyto.style.find((s) => s.selector === sel).style;
  assert.equal(sheet("edge.verified")["line-style"], "solid");
  assert.equal(sheet("edge.tentative")["line-style"], "dashed");
  assert.notEqual(sheet("edge.challenges")["line-color"], sheet("edge.tentative")["line-color"]);
  assert.notDeepEqual(sheet("edge.challenges")["line-dash-pattern"], sheet("edge.tentative")["line-dash-pattern"]);
  assert.match(mmd, /CLM_0001 -->\|"supports p\.4"\| SRC_0001/);
  assert.match(mmd, /CLM_0002 -\.->\|"supports\?"\| SRC_0002/);
  assert.match(mmd, /CLM_0003 -\.-x\|"challenges\? p\.2"\| SRC_0003/);
  assert.match(mmd, /linkStyle .*stroke-dasharray:8 3 2 3/);
  assert.match(mmd, /subgraph Legend/);
});

test("every edge comes from a link in a record; node metadata carries the record path", () => {
  const dir = build();
  const { cyto } = gen(dir);
  for (const e of cyto.elements.edges) {
    const rec = readFileSync(join(dir, e.data.declared_in), "utf8");
    const line = rec.split("\n").find((l) => l.startsWith(`${e.data.field}:`));
    assert.ok(line, `${e.data.id}: field ${e.data.field} missing in ${e.data.declared_in}`);
    if (e.data.field !== "rq") assert.ok(line.includes(e.data.target), `${e.data.id}: target not in the record's ${e.data.field} list`);
  }
  assert.equal(cyto.elements.nodes.find((n) => n.data.id === "CLM-0001").data.path, "scholar/claims/CLM-0001.md");
  // no link between INS-0001 and anything but RQ1: nothing is inferred
  assert.deepEqual(cyto.elements.edges.filter((e) => e.data.source === "INS-0001").map((e) => e.data.target), ["rq:RQ1"]);
  assert.equal(cyto.elements.edges.filter((e) => e.data.target === "INS-0001").length, 1);
});

test("dangling ids are reported, not invented", () => {
  const dir = build();
  const p = join(dir, "scholar/claims/CLM-0002.md");
  writeFileSync(p, readFileSync(p, "utf8").replace('supports: ["SRC-0002"]', 'supports: ["SRC-0002", "SRC-9999 p.1"]'));
  const { r, cyto, mmd } = gen(dir);
  assert.deepEqual(cyto.meta.dangling, [{ record: "CLM-0002", field: "supports", token: "SRC-9999 p.1" }]);
  assert.ok(!cyto.elements.nodes.some((n) => n.data.id === "SRC-9999"));
  assert.ok(!cyto.elements.edges.some((e) => e.data.target === "SRC-9999"));
  assert.match(r.out, /WARN dangling link not drawn: CLM-0002 supports SRC-9999 p\.1/);
  assert.match(mmd, /%% dangling link not drawn: CLM-0002 supports SRC-9999/);
});

test("output is deterministic and the committed example outputs are current", () => {
  const dir = build();
  const a = gen(dir, "a"), b = gen(dir, "b");
  assert.equal(a.mmd, b.mmd);
  assert.equal(JSON.stringify(a.cyto), JSON.stringify(b.cyto));
  assert.equal(a.html, b.html);
  assert.match(a.html, /cytoscape@3\.35\.0\/dist\/cytoscape\.min\.js/);
  for (const ext of ["mmd", "cyto.json", "html"]) {
    assert.equal(readFileSync(join(dir, `a.${ext}`), "utf8"), readFileSync(join(EXAMPLE, `scholar/visuals/evidence-map.${ext}`), "utf8"), `example evidence-map.${ext} is stale: re-run graph.mjs`);
  }
});

test("copied frontmatter parser stays identical to scholar.mjs", () => {
  const fn = (src, n) => src.match(new RegExp(String.raw`^function ${n}\([\s\S]*?\n}\n`, "m"))?.[0];
  const core = readFileSync(join(REPO, "plugins/scholar-core/skills/scholar-start/scripts/scholar.mjs"), "utf8");
  for (const f of [GRAPH]) {
    const src = readFileSync(f, "utf8");
    for (const n of ["splitList", "scalar", "value", "parseRecord"]) {
      assert.ok(fn(core, n), `${n} not found in scholar.mjs`);
      assert.equal(fn(src, n), fn(core, n), `${n} differs in ${f}`);
    }
  }
});
