import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, SCHOLAR, run, tmp } from "./helpers.mjs";

const CITE = join(REPO, "plugins/scholar-writing/skills/cite/scripts/check-citations.mjs");
const LINT = join(REPO, "plugins/scholar-writing/skills/voice-review/scripts/lint-prose.mjs");
const EX = join(REPO, "examples/writing");

const BIB = "@article{a2020, author={A}, title={T}, year={2020}}\n@book{b2021, title={U}, year={2021}}\n@misc{unused2022, title={V}}\n";
const claim = (id, status, extra = "") => `---\nid: ${id}\nkind: source-statement\nstatus: ${status}\nsupports: []\nchallenges: [${extra}]\nrq: []\nused_in: []\n---\n\n## Statement\n\nx\n`;

function project(md, { claims = {} } = {}) {
  const dir = tmp("cite-");
  mkdirSync(join(dir, "scholar/claims"), { recursive: true });
  writeFileSync(join(dir, "scholar/scholar.json"), JSON.stringify({ paths: { bib: "refs.bib", drafts: "ms.md" } }));
  writeFileSync(join(dir, "refs.bib"), BIB);
  writeFileSync(join(dir, "ms.md"), md);
  for (const [id, body] of Object.entries(claims)) writeFileSync(join(dir, "scholar/claims", `${id}.md`), body);
  const r = run(CITE, ["--root", dir, "--json"]);
  assert.ok([0, 1].includes(r.code), r.err);
  return JSON.parse(r.out).findings;
}
const byRule = (f) => f.map((x) => x.rule).sort();

test("detects a missing key, an unused entry, a quote without a page and a raw URL", () => {
  const f = project('Known (@a2020, p. 4). Missing [@ghost2020]. As A said, "this is a long quoted passage here" (@b2021). See https://example.org/x for more.\n');
  assert.deepEqual(byRule(f), ["missing-key", "quote-no-locator", "raw-url", "unused-entry"]);
  assert.equal(f.find((x) => x.rule === "missing-key").severity, "error");
  assert.match(f.find((x) => x.rule === "unused-entry").message, /unused2022/);
});

test("a quote with a locator, cross-references, code, comments and references are not flagged", () => {
  const f = project([
    '# T', '', 'A said "this is a long quoted passage here" (@a2020, p. 4) and @b2021 and @unused2022 follow. See @fig-one and @tbl-two.', '',
    '```r', '@ghost https://x.org', '```', '', '<!-- @ghost2 https://y.org -->', '', '## References', '', 'https://doi.org/10.1/x', '',
  ].join("\n"));
  assert.deepEqual(f, []);
});

test("claims tags: under-verified, unknown, covered by a GAP marker, and unacknowledged challenge", () => {
  const claims = { "CLM-0001": claim("CLM-0001", "unverified"), "CLM-0002": claim("CLM-0002", "claim-checked", '"b2021 p.8"'), "CLM-0004": claim("CLM-0004", "metadata-checked") };
  let f = project("Text (@a2020, p. 1). <!-- claims: CLM-0001, CLM-0002, CLM-0003 -->\n", { claims });
  assert.deepEqual(byRule(f.filter((x) => x.rule.startsWith("claim") || x.rule.startsWith("challenge"))), ["challenge-unacknowledged", "claim-under-verified", "claim-unknown"]);
  f = project("Text (@a2020, p. 1) and (@b2021, p. 8). [GAP: CLM-0004 unverified] <!-- claims: CLM-0002, CLM-0004 -->\n", { claims });
  assert.deepEqual(f.filter((x) => x.rule !== "unused-entry"), []);
});

test("--strict exits 1 on errors and 0 when only advisory remains", () => {
  const dir = tmp("cite-");
  writeFileSync(join(dir, "refs.bib"), BIB);
  writeFileSync(join(dir, "ok.md"), "(@a2020, p. 1) (@b2021, p. 2)\n");
  writeFileSync(join(dir, "bad.md"), "(@ghost)\n");
  assert.equal(run(CITE, ["--root", dir, "--bib", "refs.bib", "--strict", join(dir, "ok.md")]).code, 0);
  assert.equal(run(CITE, ["--root", dir, "--bib", "refs.bib", "--strict", join(dir, "bad.md")]).code, 1);
});

test("examples 03 and 04: override changes lint only; cite gate passes and the core validator agrees", () => {
  for (const ex of ["03-journal-override", "04-evidence-to-draft"]) {
    const dir = tmp("ex-");
    cpSync(join(EX, ex), dir, { recursive: true });
    assert.equal(run(CITE, ["--root", dir, "--strict"]).code, 0, ex);
    assert.equal(run(SCHOLAR, ["validate", "--root", dir]).code, 0, ex);
  }
  const dir = tmp("ex-");
  cpSync(join(EX, "03-journal-override"), dir, { recursive: true });
  const ms = join(dir, "manuscript.md");
  assert.equal(run(LINT, [ms, "--strict"]).code, 0, "venue override: US spelling and serial comma accepted");
  const defaults = join(dir, "defaults.json");
  writeFileSync(defaults, "{}");
  const strict = run(LINT, [ms, "--config", defaults, "--json"]);
  const rules = new Set(JSON.parse(strict.out).map((x) => x.rule));
  assert.ok(rules.has("us-spelling") && rules.has("oxford-comma"), "profile defaults flag the same text");
});
