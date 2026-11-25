import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { HOOK, SCHOLAR, project, run } from "./helpers.mjs";

test("hook is silent without scholar/", () => {
  const dir = project("thesis-existing");
  const r = run(HOOK, [], { cwd: dir });
  assert.equal(r.code, 0);
  assert.equal(r.out, "");
});

test("hook prints handoff lines and counts with scholar/", () => {
  const dir = project("thesis-existing");
  run(SCHOLAR, ["init", "--apply", "--root", dir]);
  run(SCHOLAR, ["new", "insight", "--title", "Pending one", "--root", dir]);
  const r = run(HOOK, [], { cwd: dir });
  assert.equal(r.code, 0);
  assert.match(r.out, /scholar-contract/);
  assert.match(r.out, /Stopped at: Registered two synthetic sources/);
  assert.match(r.out, /Next step: Draft the scope paragraph/);
  assert.match(r.out, /awaiting the scholar's decision: 1\. Pending harvest proposals: 0/);
  assert.ok(r.out.trim().split("\n").length <= 6);
});

test("hook works from a subfolder of the project", () => {
  const dir = project("paper-new");
  run(SCHOLAR, ["init", "--apply", "--root", dir]);
  assert.match(run(HOOK, [], { cwd: join(dir, "scholar") }).out, /Scholar Method/);
});
