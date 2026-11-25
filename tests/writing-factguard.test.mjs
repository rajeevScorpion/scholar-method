import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, run, tmp } from "./helpers.mjs";

const GUARD = join(REPO, "plugins/scholar-writing/skills/voice-review/scripts/fact-guard.mjs");

function guard(before, after, writing) {
  const dir = tmp("guard-");
  writeFileSync(join(dir, "b.md"), before);
  writeFileSync(join(dir, "a.md"), after);
  mkdirSync(join(dir, "scholar"));
  writeFileSync(join(dir, "scholar/scholar.json"), JSON.stringify(writing ? { writing } : {}));
  const r = run(GUARD, [join(dir, "b.md"), join(dir, "a.md"), "--json"]);
  assert.equal(r.code, 0, r.err);
  return JSON.parse(r.out);
}

const BASE = 'In India, the Indian Institute of Design surveyed 42 users (Rao and Iyer, 2020) and found 12.5% agreed [@rao2020, p. 4]. As Lee (2019) put it, "design is a conversation". See https://example.org/a and 10.1234/synthetic.';

test("a pure rephrase reports nothing", () => {
  const after = 'The Indian Institute of Design surveyed 42 users, as Rao and Iyer (2020) report, and 12.5 per cent agreed [@rao2020, p. 4]. Lee (2019) put it this way: "design is a conversation". See https://example.org/a and 10.1234/synthetic.';
  const r = guard(BASE, after);
  assert.equal(r.ok, true, JSON.stringify(r.report));
});

test("changed number, dropped citation, altered quote and dropped citekey are each detected", () => {
  const after = 'The Indian Institute of Design surveyed 47 users and found 12.5% agreed. As Lee put it, "design is a dialogue". See https://example.org/b and 10.1234/synthetic.';
  const { report } = guard(BASE, after);
  assert.deepEqual(report.numbers.altered, [["42", "47"]]);
  assert.ok(report.numbers.lost.includes("4"), "page locator lost");
  assert.deepEqual(report.citations.lost.sort(), ["Lee 2019", "Rao and Iyer 2020"]);
  assert.deepEqual(report.citekeys.lost, ["@rao2020"]);
  assert.deepEqual(report.quotes.altered, [['"design is a conversation"', '"design is a dialogue"']]);
  assert.deepEqual(report.links.altered, [["https://example.org/a", "https://example.org/b"]]);
});

test("names and protected_terms from scholar.json are guarded", () => {
  const { report } = guard("The Ministry of Education wrote about GraphQL daily.", "The Education office wrote about it daily.", { protected_terms: ["GraphQL"] });
  assert.deepEqual(report.names.lost, ["Ministry of Education"]);
  assert.deepEqual(report.terms.lost, ["GraphQL"]);
});

test("sentence openers are not treated as names; YAML is ignored", () => {
  const r = guard("---\nnote: 12\n---\nIn India it rained. The Study ended.", "---\nnote: 99\n---\nIt rained in India. The study ended.");
  assert.equal(r.ok, true, JSON.stringify(r.report));
});

test("--strict exits 1 on a protected change", () => {
  const dir = tmp("guard-");
  writeFileSync(join(dir, "b.md"), "There were 5 cases.\n");
  writeFileSync(join(dir, "a.md"), "There were 6 cases.\n");
  assert.equal(run(GUARD, [join(dir, "b.md"), join(dir, "a.md"), "--strict"]).code, 1);
  assert.equal(run(GUARD, [join(dir, "b.md"), join(dir, "b.md"), "--strict"]).code, 0);
});
