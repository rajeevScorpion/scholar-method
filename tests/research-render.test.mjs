import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { REPO, run, tmp } from "./helpers.mjs";

const RENDER = join(REPO, "plugins/scholar-research/skills/visualise/scripts/render.mjs");
const FIX = join(REPO, "tests/fixtures/research");
const setup = () => { const d = tmp(); cpSync(FIX, d, { recursive: true }); return d; };

test("a missing data file fails clearly", () => {
  const d = setup();
  const spec = JSON.parse(readFileSync(join(d, "spec.vl.json"), "utf8"));
  spec.data.url = "nope.csv";
  writeFileSync(join(d, "bad.vl.json"), JSON.stringify(spec));
  const r = run(RENDER, [join(d, "bad.vl.json")]);
  assert.equal(r.code, 1);
  assert.match(r.err, /data file not found: nope\.csv/);
  assert.ok(!existsSync(join(d, "bad.html")));
});

test("a spec without data.url, or with a remote url, is refused", () => {
  const d = setup();
  writeFileSync(join(d, "inline.vl.json"), JSON.stringify({ data: { values: [{ a: 1 }] }, mark: "bar" }));
  assert.match(run(RENDER, [join(d, "inline.vl.json")]).err, /top-level data\.url/);
  writeFileSync(join(d, "remote.vl.json"), JSON.stringify({ data: { url: "https://example.org/x.csv" }, mark: "bar" }));
  assert.match(run(RENDER, [join(d, "remote.vl.json")]).err, /relative path to a local file/);
});

test("HTML has pinned versions and inlined data; sidecar row count equals CSV rows and refresh keeps edits", () => {
  const d = setup();
  mkdirSync(join(d, "scholar"));
  writeFileSync(join(d, "scholar/scholar.json"), "{}\n");
  let r = run(RENDER, [join(d, "spec.vl.json"), "--sidecar", "VIS-0001"]);
  assert.equal(r.code, 0, r.err);
  const html = readFileSync(join(d, "spec.html"), "utf8");
  for (const m of [/vega@\d+\.\d+\.\d+\/build/, /vega-lite@\d+\.\d+\.\d+\/build/, /vega-embed@\d+\.\d+\.\d+\/build/]) assert.match(html, m);
  assert.ok(!html.includes('"url"'), "data should be inlined in the viewer");
  const csvRows = readFileSync(join(d, "data.csv"), "utf8").trim().split("\n").length - 1;
  const side = join(d, "scholar/visuals/VIS-0001.md");
  const text = readFileSync(side, "utf8");
  assert.match(text, new RegExp("^Input rows: " + csvRows + " [(]data[.]csv[)]$", "m"));
  assert.match(text, /^status: exploratory$/m);
  assert.match(text, /^review_status: author-review-needed$/m);
  // grow the data, edit the sidecar, re-render: row count refreshes, scholar's edit stays
  writeFileSync(join(d, "data.csv"), readFileSync(join(d, "data.csv"), "utf8") + "4,b\n");
  writeFileSync(side, text.replace('purpose: ""', 'purpose: "my edit"'));
  r = run(RENDER, [join(d, "spec.vl.json"), "--sidecar", "VIS-0001"]);
  assert.equal(r.code, 0, r.err);
  const after = readFileSync(side, "utf8");
  assert.match(after, /^Input rows: 4 [(]data[.]csv[)]$/m);
  assert.match(after, /purpose: "my edit"/);
});

test("SVG export via vl2svg (skipped when npx or the network is unavailable)", (t) => {
  const probe = spawnSync("npx --version", { shell: true, encoding: "utf8" });
  if (probe.status !== 0) return t.skip("npx not available");
  const d = setup();
  const r = run(RENDER, [join(d, "spec.vl.json"), "--svg"]);
  if (r.code !== 0 && /network|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|registry/i.test(r.err)) return t.skip(`network unavailable: ${r.err.trim()}`);
  assert.equal(r.code, 0, r.err);
  const svg = readFileSync(join(d, "spec.svg"), "utf8");
  assert.match(svg, /^<svg /);
  assert.match(svg, /Period|group/);
});
