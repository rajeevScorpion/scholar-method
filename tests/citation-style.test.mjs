import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BUNDLED_APA, REPO, STYLE, run, snapshot, st, tmp } from "./helpers.mjs";

// All entries are synthetic: invented authors and titles, no real sources, no DOIs.
const BIB = `@article{verma2019, author = {Verma, Anita}, year = {2019}, title = {Synthetic study}, journal = {Journal of Synthetic Examples}, volume = {4}, number = {2}, pages = {11--29}}
@article{lindqvist2020, author = {Lindqvist, Sara and Rao, Dev}, year = {2020}, title = {Two invented authors}, journal = {J. Syn.}, volume = {7}, pages = {1--9}}
@article{baker2018, author = {Baker, Mira and Chen, Li and Duarte, Joao}, year = {2018}, title = {Three invented authors}, journal = {Annals of Imaginary Research}, volume = {12}, pages = {5--20}}
@article{smith2020a, author = {Smith, John}, year = {2020}, title = {Alpha result}, journal = {J. Syn.}, volume = {1}, pages = {1--2}}
@article{smith2020b, author = {Smith, John}, year = {2020}, title = {Beta result}, journal = {J. Syn.}, volume = {1}, pages = {3--4}}
@book{okafor2021, author = {Okafor, Chidi}, year = {2021}, title = {Notes on an Imaginary Method}, publisher = {Synthetic Press}}
`;
const proj = (extra = {}) => {
  const dir = tmp("style-");
  writeFileSync(join(dir, "refs.bib"), BIB);
  writeFileSync(join(dir, "_quarto.yml"), "project:\n  title: \"T\"\nbibliography: refs.bib\nformat:\n  html: default\n");
  for (const [f, c] of Object.entries(extra)) { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), c); }
  return dir;
};
const json = (r) => { assert.equal(r.code, 0, r.err); return JSON.parse(r.out); };

test("status warns when no CSL is configured (Pandoc would fall back to Chicago author-date)", () => {
  const s = json(st(proj(), "status", "--json"));
  assert.equal(s.configured.style, "apa-7");
  assert.equal(s.configured.assumed_default, true);
  assert.deepEqual(s.csl_in_use, []);
  assert.deepEqual(s.bibliography, ["refs.bib"]);
  assert.match(s.warnings[0], /Chicago author-date, which is not APA 7/);
  assert.equal(st(proj(), "status", "--strict").code, 1);
});

test("status reads csl from _quarto.yml, maps it to a style and flags a mismatch with citation.style", () => {
  const dir = proj({ "scholar/scholar.json": JSON.stringify({ citation: { style: "apa-7", csl: null } }) });
  writeFileSync(join(dir, "_quarto.yml"), "bibliography: refs.bib\nformat:\n  html:\n    csl: csl/ieee.csl\n");
  const s = json(st(dir, "status", "--json"));
  assert.equal(s.csl_in_use[0].style, "ieee");
  assert.ok(s.warnings.some((w) => /uses ieee\.csl \(ieee\) but citation\.style is apa-7/.test(w)));
  assert.ok(s.warnings.some((w) => /does not exist/.test(w)));
});

test("use mla-9 is a dry run by default: nothing is written, no network", () => {
  const dir = proj({ "scholar/scholar.json": JSON.stringify({ citation: { style: "apa-7", csl: null } }) });
  const before = snapshot(dir);
  const r = st(dir, "use", "mla-9");
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /dry run, nothing written/);
  assert.match(r.out, /download https:\/\/raw\.githubusercontent\.com\/citation-style-language\/styles\/f123868a[0-9a-f]+\/modern-language-association\.csl/);
  assert.deepEqual(snapshot(dir), before);
});

test("use apa-7 --apply copies the bundled CSL, appends csl: and keeps every other line byte-identical", () => {
  const dir = proj({ "scholar/scholar.json": JSON.stringify({ method_version: "0.1.3", citation: { style: "mla-9", csl: null }, keep: [1] }) });
  const before = readFileSync(join(dir, "_quarto.yml"), "utf8");
  const r = st(dir, "use", "apa-7", "--apply");
  assert.equal(r.code, 0, r.err);
  assert.equal(readFileSync(join(dir, "_quarto.yml"), "utf8"), before + "csl: csl/apa.csl\n");
  assert.equal(readFileSync(join(dir, "csl/apa.csl"), "utf8"), readFileSync(BUNDLED_APA, "utf8"));
  const cfg = JSON.parse(readFileSync(join(dir, "scholar/scholar.json"), "utf8"));
  assert.deepEqual(cfg.citation, { style: "apa-7", csl: "csl/apa.csl" });
  assert.deepEqual(cfg.keep, [1]);
  assert.match(st(dir, "status").out, /csl in use: csl\/apa\.csl/);
  assert.doesNotMatch(st(dir, "status").out, /WARN/);
});

test("use replaces an existing csl: value in place, keeps a comment and CRLF endings, follows an existing csl folder", () => {
  const dir = proj({ "refs/csl/ieee.csl": readFileSync(join(REPO, "tests/fixtures/quarto-styles/csl/ieee.csl"), "utf8") });
  const original = "title: x\r\nformat:\r\n  html:\r\n    csl:   old.csl   # was this\r\n  pdf: default\r\nbibliography: refs.bib";
  writeFileSync(join(dir, "_quarto.yml"), original);
  const r = st(dir, "use", "ieee", "--apply");
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /already in the project, kept as it is/);
  assert.equal(readFileSync(join(dir, "_quarto.yml"), "utf8"), original.replace("old.csl", "refs/csl/ieee.csl"));
});

test("use with no Quarto config says what to add instead; an unknown style is refused", () => {
  const dir = tmp("style-");
  writeFileSync(join(dir, "refs.bib"), BIB);
  writeFileSync(join(dir, "my-uni.csl"), "<style xmlns=\"http://purl.org/net/xbiblio/csl\"></style>\n");
  const r = st(dir, "use", "my-uni.csl", "--apply");
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /no _quarto\.yml: add "csl: my-uni\.csl"/);
  assert.ok(!existsSync(join(dir, "_quarto.yml")));
  assert.equal(st(dir, "use", "not-a-style").code, 2);
});

test("fields reports different gaps per style and never invents values", () => {
  const dir = tmp("style-");
  writeFileSync(join(dir, "refs.bib"), `@article{a1, author = {A, B}, year = {2020}, title = {T}, journal = {J}}
@article{a2, author = {A, B}, year = {2020}, title = {T}, journal = {J}, volume = {1}, pages = {1--2}}
@book{b1, author = {A, B}, year = {2020}, title = {T}}
@online{w1, author = {A, B}, year = {2020}, title = {T}, url = {https://example.org/synthetic}}
@misc{m1, title = {Untitled things}}
`);
  const gaps = (style) => Object.fromEntries(json(st(dir, "fields", style, "--json", "--bib", "refs.bib")).gaps.map((g) => [g.key, g]));
  const ieee = gaps("ieee"), apa = gaps("apa-7"), mla = gaps("mla-9");
  assert.deepEqual(ieee.a1.missing, ["volume", "pages"]);
  assert.deepEqual(ieee.a2.missing, []); // only the issue number is advice
  assert.deepEqual(apa.a1.missing, ["volume", "pages"]);
  assert.deepEqual(apa.a2.recommended, ["number", "doi|url"]); // issue and DOI or URL are advice for APA
  assert.deepEqual(mla.a1.missing, ["pages"]);
  assert.deepEqual(mla.b1.missing, ["publisher"]);
  assert.deepEqual(ieee.w1.missing, ["urldate"]);
  assert.deepEqual(mla.w1.recommended, ["urldate", "container"]);
  assert.deepEqual(apa.m1.missing, ["author", "year"]);
  assert.equal(st(dir, "fields", "ieee", "--strict", "--bib", "refs.bib").code, 1);
  assert.equal(readFileSync(join(dir, "refs.bib"), "utf8").includes("doi"), false);
});

test("fields reads CSL-JSON too", () => {
  const dir = tmp("style-");
  writeFileSync(join(dir, "refs.json"), JSON.stringify([{ id: "j1", type: "article-journal", author: [{ family: "Zed", given: "Q" }], issued: { "date-parts": [[2021]] }, title: "T", "container-title": "J", volume: "3" }]));
  const g = json(st(dir, "fields", "ieee", "--bib", "refs.json", "--json")).gaps;
  assert.deepEqual(g[0].missing, ["pages"]);
});

const DRAFT = `---
title: "Draft"
bibliography: refs.bib
note: (Verma, 2019) stays in YAML
---

Plain (Verma, 2019) and (Lindqvist & Rao, 2020, p. 104) and (Baker et al., 2018; Verma, 2019).

Narrative: Verma (2019) shows it, Lindqvist and Rao (2020, pp. 4-8) agree, and Baker et al. (2018) too. See (see Okafor, 2021).

Ambiguous (Smith, 2020), suffixed (Smith, 2020b), unmatched (Nobody, 2001), mixed (Verma, 2019; see Table 2).

A quote "as (Verma, 2019) said" and \`(Verma, 2019)\` in code.

> A block quote mentioning (Verma, 2019).

\`\`\`
(Verma, 2019)
\`\`\`

## References

Verma, A. (2019). Synthetic study. Journal of Synthetic Examples, 4(2), 11-29.
(Verma, 2019) is also typed in the reference section.
`;
const conv = (dir, ...a) => json(st(dir, "convert", "--json", ...a));
const by = (rows, original) => rows.find((r) => r.original === original);

test("convert proposes the right keys for author-date patterns and flags ambiguous and unmatched ones", () => {
  const dir = proj({ "draft.md": DRAFT });
  const rows = conv(dir, "draft.md");
  const eq = (o, p, c) => { const r = by(rows, o); assert.ok(r, `no row for ${o}`); assert.equal(r.proposed, p); assert.equal(r.confidence, c, `${o}: ${r.reason}`); };
  eq("(Verma, 2019)", "[@verma2019]", "exact");
  eq("(Lindqvist & Rao, 2020, p. 104)", "[@lindqvist2020, p. 104]", "exact");
  eq("(Baker et al., 2018; Verma, 2019)", "[@baker2018; @verma2019]", "exact");
  eq("Verma (2019)", "@verma2019", "exact");
  eq("Lindqvist and Rao (2020, pp. 4-8)", "@lindqvist2020 [pp. 4-8]", "exact");
  eq("Baker et al. (2018)", "@baker2018", "exact");
  eq("(see Okafor, 2021)", "[see @okafor2021]", "exact");
  eq("(Smith, 2020b)", "[@smith2020b]", "likely"); // a/b by APA title order: never exact
  const amb = by(rows, "(Smith, 2020)");
  assert.equal(amb.confidence, "ambiguous");
  assert.match(amb.reason, /smith2020a, smith2020b.*needs a\/b/);
  assert.equal(by(rows, "(Nobody, 2001)").confidence, "unmatched");
  assert.equal(by(rows, "(Verma, 2019; see Table 2)").confidence, "unmatched"); // mixed group: never guessed
  // YAML, quotes, code, block quotes and the reference list are not scanned (lines 4, 13, 15, 17-19, 24)
  const lines = rows.map((r) => Number(r.at.split(":")[1]));
  assert.ok(lines.every((l) => [7, 9, 11].includes(l)), JSON.stringify(rows.map((r) => r.at)));
});

test("convert --apply rewrites only exact items, leaves everything else byte-identical and writes a backup diff", () => {
  const dir = proj({ "draft.md": DRAFT });
  const r = st(dir, "convert", "draft.md", "--apply");
  assert.equal(r.code, 0, r.err);
  const after = readFileSync(join(dir, "draft.md"), "utf8");
  assert.match(after, /Plain \[@verma2019\] and \[@lindqvist2020, p\. 104\] and \[@baker2018; @verma2019\]\./);
  assert.match(after, /Narrative: @verma2019 shows it, @lindqvist2020 \[pp\. 4-8\] agree, and @baker2018 too\. See \[see @okafor2021\]\./);
  assert.match(after, /Ambiguous \(Smith, 2020\), suffixed \(Smith, 2020b\), unmatched \(Nobody, 2001\), mixed \(Verma, 2019; see Table 2\)\./);
  for (const keep of ["note: (Verma, 2019) stays in YAML", 'A quote "as (Verma, 2019) said" and `(Verma, 2019)` in code.', "> A block quote mentioning (Verma, 2019).", "```\n(Verma, 2019)\n```", "(Verma, 2019) is also typed in the reference section."]) assert.ok(after.includes(keep), keep);
  const bdir = join(dir, "scholar/backups"), diff = readFileSync(join(bdir, readdirSync(bdir)[0]), "utf8");
  assert.match(diff, /--- draft\.md:7\n- \(Verma, 2019\)\n\+ \[@verma2019\]/);
  assert.match(st(dir, "convert", "draft.md", "--apply").out, /Nothing exact to apply/);
});

test("convert --apply keeps CRLF endings and refuses a file with mixed endings", () => {
  const dir = proj({ "a.md": "A (Verma, 2019) line.\r\nSecond line.\r\n", "b.md": "A (Verma, 2019) line.\r\nMixed.\n" });
  st(dir, "convert", "a.md", "b.md", "--apply");
  assert.equal(readFileSync(join(dir, "a.md"), "utf8"), "A [@verma2019] line.\r\nSecond line.\r\n");
  assert.equal(readFileSync(join(dir, "b.md"), "utf8"), "A (Verma, 2019) line.\r\nMixed.\n");
});

test("numeric [n] citations map through a numbered reference list; without one they are only flagged", () => {
  const withList = proj({ "n.md": "See [1] and [1, 2].\n\n## References\n\n[1] Verma, A. (2019). Synthetic study.\n[2] Okafor, C. (2021). Notes.\n" });
  assert.deepEqual(conv(withList, "n.md").map((r) => [r.original, r.proposed, r.confidence]), [["[1]", "[@verma2019]", "exact"], ["[1, 2]", "[@verma2019; @okafor2021]", "exact"]]);
  const without = proj({ "n.md": "See [3] here, and a [link](http://example.org) and [x][ref].\n" });
  assert.deepEqual(conv(without, "n.md").map((r) => [r.original, r.confidence]), [["[3]", "unmatched"]]);
  const before = readFileSync(join(without, "n.md"), "utf8");
  st(without, "convert", "n.md", "--apply");
  assert.equal(readFileSync(join(without, "n.md"), "utf8"), before);
});

test("narrative flags wording that depends on the style", () => {
  const dir = proj({ "t.md": "[@verma2019] shows the effect. @okafor2021 describes the method. In 2020 the work of [@lindqvist2020] changed things.\n\n(Verma, 2019) typed by hand.\n\n| a |\n|---|\n| [@verma2019] |\n\n## Heading [@verma2019]\n" });
  const rules = (style) => json(st(dir, "narrative", "--style", style, "t.md", "--json")).map((o) => o.rule);
  const ieee = rules("ieee");
  for (const r of ["citation-as-subject", "narrative-loses-author", "year-wording", "hand-typed-author-date"]) assert.ok(ieee.includes(r), `ieee: ${r}`);
  assert.ok(!rules("apa-7").includes("narrative-loses-author"));
  assert.ok(!rules("apa-7").includes("year-wording"));
  const notes = rules("chicago-notes");
  assert.ok(notes.includes("note-style") && notes.includes("note-in-heading"));
  assert.ok(rules("mla-9").includes("year-wording"));
});

test("fetch is a dry run without --apply (no network); the pinned commit is in the URL", () => {
  const dir = proj();
  const r = st(dir, "fetch", "ieee");
  assert.match(r.out, /Would fetch \(dry run\) https:\/\/raw\.githubusercontent\.com\/.*\/f123868a546e6e7cec10e808ae04ef0e52bf2210\/ieee\.csl/);
  assert.ok(!existsSync(join(dir, "csl")));
});

test("use mla-9 --apply downloads at the pinned commit (SCHOLAR_NET_TESTS=1 only)", { skip: process.env.SCHOLAR_NET_TESTS === "1" ? false : "set SCHOLAR_NET_TESTS=1 to run the network test" }, () => {
  const dir = proj();
  const r = st(dir, "use", "mla-9", "--apply");
  assert.equal(r.code, 0, r.err);
  const csl = readFileSync(join(dir, "csl/modern-language-association.csl"), "utf8");
  assert.match(csl, /xmlns="http:\/\/purl\.org\/net\/xbiblio\/csl"/);
  assert.match(csl, /Modern Language Association/);
  assert.match(readFileSync(join(dir, "_quarto.yml"), "utf8"), /^csl: csl\/modern-language-association\.csl$/m);
});

test("style.mjs usage: no arguments print help; unknown command exits 2", () => {
  assert.equal(run(STYLE, []).code, 0);
  assert.equal(run(STYLE, ["nope"]).code, 2);
});
