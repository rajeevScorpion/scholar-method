import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, run, tmp } from "./helpers.mjs";

const LINT = join(REPO, "plugins/scholar-writing/skills/voice-review/scripts/lint-prose.mjs");

function lint(text, writing, name = "t.md", extra = []) {
  const dir = tmp("lint-");
  writeFileSync(join(dir, name), text);
  mkdirSync(join(dir, "scholar"));
  writeFileSync(join(dir, "scholar/scholar.json"), JSON.stringify(writing ? { writing } : {}));
  const r = run(LINT, [join(dir, name), "--json", ...extra]);
  assert.ok([0, 1].includes(r.code), r.err);
  return JSON.parse(r.out);
}
const rules = (f) => f.map((x) => x.rule);

test("true positives with line and column", () => {
  const f = lint("Line one.\nWe analyze it — and don't stop, but delve in. Apples, pears, and plums. Pages 10–20, a – b, c -- d.\n");
  const set = new Set(rules(f));
  for (const r of ["us-spelling", "em-dash", "contraction", "ai-register", "oxford-comma", "range-dash", "en-dash", "double-hyphen"]) assert.ok(set.has(r), `missing ${r}`);
  const em = f.find((x) => x.rule === "em-dash");
  assert.equal(em.line, 2);
  assert.equal(em.col, 15);
  assert.equal(f.find((x) => x.rule === "ai-register").severity, "advisory");
  assert.match(f.find((x) => x.rule === "range-dash").message, /hyphen or 'to'/);
});

test("skips YAML, code, quotes, citations, references, URLs, paths, comments, attributes", () => {
  const text = [
    "---", 'title: "A — title, with color"', "---", "# Intro", "",
    "Colour and organisation are fine here, as is analysis.",
    "The model (Rao, Iyer, and Lee, 2020) and [@rao2020, pp. 10–20] and @iyer2021 and -@lee2019 hold.",
    'A quote says "we don\'t analyze — the color" and “it\'s — ok”.',
    "Use `a — b` and see https://example.org/a—b or notes/a–b.md, <!-- color — comment -->.",
    "![A figure](img/a—b.png){#fig-a width=50% fig-alt=\"color — x\"}",
    "", "> A block quote with color — and, more, and even more.", "",
    "```r", 'x <- "color — analyze"', "```", "", "::: {.callout-note}", "Fine text.", ":::", "",
    "## References", "", "Rao, A. (2020). Color — and, more, and analyze. Journal.", "", "## After", "", "Clean ending.", "",
  ].join("\n");
  const f = lint(text);
  assert.deepEqual(f, [], JSON.stringify(f, null, 1));
});

test("the References section ends at the next heading of the same level; later prose is linted", () => {
  const f = lint("# A\n\n## References\n\ncolor\n\n## Next\n\nThe color here.\n");
  assert.deepEqual(f.map((x) => [x.rule, x.line]), [["us-spelling", 9]]);
});

test("Oxford comma: likely lists flagged, clauses not", () => {
  assert.deepEqual(rules(lint("We read books, tapes, and maps.")), ["oxford-comma"]);
  assert.deepEqual(lint("We read books, tapes and maps. Although it rained, we went out, and we were wet."), []);
  assert.deepEqual(lint("In 2020, the committee reviewed the cases, and the results were published."), []);
});

test("config switches rules off and a venue override flips the language rules", () => {
  const text = "We analyze the color, size, and shape. It's fine – really.";
  assert.ok(rules(lint(text)).includes("us-spelling"));
  assert.deepEqual(lint(text, { no_dashes: false, no_oxford_comma: false, spelling: "off", no_contractions: false, ai_register: false }), []);
  const us = lint("We analyze the color, size, and shape.", { spelling: "us" });
  assert.ok(!rules(us).includes("us-spelling") && rules(us).includes("oxford-comma"));
  const venue = { spelling: "us", no_oxford_comma: false, serial_comma: true };
  assert.deepEqual(rules(lint("The colour, size and shape were measured.", venue)).sort(), ["missing-serial-comma", "uk-spelling"]);
  assert.deepEqual(lint("The color, size, and shape were measured.", venue), []);
});

test("--strict exits 1 on hard findings only; advisory alone passes", () => {
  const dir = tmp("lint-");
  writeFileSync(join(dir, "a.md"), "We delve into it.\n");
  writeFileSync(join(dir, "b.md"), "It's here.\n");
  assert.equal(run(LINT, [join(dir, "a.md"), "--strict"]).code, 0);
  assert.equal(run(LINT, [join(dir, "b.md"), "--strict"]).code, 1);
  assert.equal(run(LINT, [join(dir, "b.md")]).code, 0);
});

test("proper names with US spelling are left alone", () => {
  assert.deepEqual(lint("The International Organization for Standardization published it."), []);
});
