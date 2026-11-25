import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { REPO, run } from "./helpers.mjs";

const V = join(REPO, "plugins/scholar-writing/skills/voice-review/scripts");
const EX = join(REPO, "examples/writing");
const lint = (f, ...a) => run(join(V, "lint-prose.mjs"), [join(EX, f), ...a]);
const guard = (a, b, ...x) => run(join(V, "fact-guard.mjs"), [join(EX, a), join(EX, b), ...x]);

test("example 01: before is flagged, after is clean, no protected change", () => {
  const before = JSON.parse(lint("01-ai-sounding-abstract/before.md", "--json").out).map((x) => x.rule);
  for (const r of ["em-dash", "oxford-comma", "contraction", "ai-register"]) assert.ok(before.includes(r), r);
  assert.equal(lint("01-ai-sounding-abstract/after.md", "--strict").code, 0);
  const g = guard("01-ai-sounding-abstract/before.md", "01-ai-sounding-abstract/after.md", "--strict");
  assert.equal(g.code, 0, g.out);
  assert.match(g.out, /No protected changes/);
});

test("example 02: fact-guard catches the altered number and the dropped citation", () => {
  const g = guard("02-citation-number-preservation/before.md", "02-citation-number-preservation/after.md", "--strict");
  assert.equal(g.code, 1);
  assert.match(g.out, /ALTERED numbers: 42%\s+->\s+24%/);
  assert.match(g.out, /LOST\s+citations: Narang and Bose 2019/);
});
