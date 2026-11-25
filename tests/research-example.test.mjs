import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, SCHOLAR, run } from "./helpers.mjs";

const EX = join(REPO, "examples/research");

test("example project validates with the core CLI", () => {
  const r = run(SCHOLAR, ["validate", "--root", EX]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /0 error\(s\), 0 warning\(s\)/);
});

test("example is plainly synthetic and its acquired data has no target rows", () => {
  for (const d of ["scholar/insights", "scholar/claims", "scholar/sources", "scholar/visuals"])
    for (const f of readdirSync(join(EX, d)).filter((n) => n.endsWith(".md")))
      assert.match(readFileSync(join(EX, d, f), "utf8"), /synthetic/i, `${d}/${f} must say synthetic`);
  for (const f of readdirSync(join(EX, "scholar/sources")).filter((n) => n.endsWith(".md"))) assert.match(readFileSync(join(EX, "scholar/sources", f), "utf8"), /^doi: ""$/m);
  const rows = readFileSync(join(EX, "data/synthetic_artefacts.csv"), "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
  assert.ok(rows.every((r) => r[4] === "acquired"));
  assert.ok(!rows.some((r) => r[1] === "P3" && r[2] === "editorial"), "target-only cell must have no rows");
  const sidecar = readFileSync(join(EX, "scholar/visuals/VIS-0001.md"), "utf8");
  assert.match(sidecar, new RegExp(`^Input rows: ${rows.length} `, "m"));
});
