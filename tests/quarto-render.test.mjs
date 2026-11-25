import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import { join } from "node:path";
import { REPO, SCHOLAR, hasQuarto, run, st, tmp } from "./helpers.mjs";

// Real renders with the installed Quarto, from the synthetic project in tests/fixtures/quarto-styles (invented
// authors and titles, no DOIs). Each test renders in its own temp copy, which is removed afterwards.
const skip = hasQuarto ? false : "quarto is not on PATH: install it from https://quarto.org/docs/get-started/ to run the render tests";
const fixture = () => { const d = tmp("quarto-styles-"); cpSync(join(REPO, "tests/fixtures/quarto-styles"), d, { recursive: true }); return d; };
const cleanup = (d) => { try { rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch { /* a tool may still hold a file; the temp folder is harmless */ } };
const render = (d, file, ...args) => {
  const r = spawnSync("quarto", ["render", file, ...args], { cwd: d, encoding: "utf8", timeout: 240000 });
  assert.equal(r.status, 0, `quarto render failed:\n${r.stdout}\n${r.stderr}`);
};
const decode = (s) => s.replace(/<\/(?:p|div|h\d|li|section|header)>|<br\s*\/?>|<w:tab\/>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const htmlText = (d, f = "index.html") => decode(readFileSync(join(d, f), "utf8").match(/<main[\s\S]*<\/main>/)[0]);
// a .docx is a zip: read one entry (stored or deflated) from its central directory
function zipEntry(file, name) {
  const b = readFileSync(file);
  let e = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = b.readUInt32LE(e + 16);
  for (let n = b.readUInt16LE(e + 10); n--;) {
    const len = b.readUInt16LE(p + 28), extra = b.readUInt16LE(p + 30), comment = b.readUInt16LE(p + 32);
    if (b.toString("utf8", p + 46, p + 46 + len) === name) {
      const o = b.readUInt32LE(p + 42), method = b.readUInt16LE(p + 10), size = b.readUInt32LE(p + 20);
      const data = b.subarray(o + 30 + b.readUInt16LE(o + 26) + b.readUInt16LE(o + 28), o + 30 + b.readUInt16LE(o + 26) + b.readUInt16LE(o + 28) + size);
      return (method === 0 ? data : inflateRawSync(data)).toString("utf8");
    }
    p += 46 + len + extra + comment;
  }
  throw new Error(`${name} not in ${file}`);
}

test("APA 7 (bundled apa.csl): HTML and DOCX show (Author, Year) citations and an APA reference list", { skip }, () => {
  const d = fixture();
  try {
    assert.equal(st(d, "use", "apa-7", "--apply").code, 0);
    render(d, "index.qmd", "--to", "html");
    const h = htmlText(d);
    assert.match(h, /\(Verma, 2019, p\. 14\)/);
    assert.match(h, /Okafor \(2021\) describes the method/);
    assert.match(h, /\(Lindqvist & Rao, 2020\)/);
    assert.match(h, /\(Baker et al\., 2018; Verma, 2019\)/);
    assert.match(h, /Verma, A\. \(2019\)\. A synthetic study of citation rendering\. Journal of Synthetic Examples, 4\(2\), 11.29\./);
    assert.match(h, /Baker, M\., Chen, L\., & Duarte, J\. \(2018\)\./);
    render(d, "index.qmd", "--to", "docx");
    const x = decode(zipEntry(join(d, "index.docx"), "word/document.xml"));
    assert.match(x, /\(Verma, 2019, p\. 14\)/);
    assert.match(x, /\(Baker et al\., 2018; Verma, 2019\)/);
    assert.match(x, /Lindqvist, S\., & Rao, D\. \(2020\)\. Two invented authors\./);
  } finally { cleanup(d); }
});

test("switching to a numeric CSL (IEEE, vendored in the fixture) changes only the style: [1] markers and a numbered list", { skip }, () => {
  const d = fixture();
  try {
    const source = readFileSync(join(d, "index.qmd"), "utf8");
    assert.equal(st(d, "use", "csl/ieee.csl", "--apply").code, 0);
    render(d, "index.qmd", "--to", "html");
    const h = htmlText(d);
    assert.match(h, /A page citation \[1, p\. 14\]/);
    assert.match(h, /\[2\] describes the method/); // the narrative form loses the author name in numeric styles
    assert.match(h, /\[1\], \[4\]/);
    assert.match(h, /\[1\] A\. Verma, .A synthetic study of citation rendering,. Journal of Synthetic Examples, vol\. 4, no\. 2, pp\. 11.29, 2019\./);
    assert.equal(readFileSync(join(d, "index.qmd"), "utf8"), source, "the source text must not change when the style changes");
    render(d, "index.qmd", "--to", "docx");
    assert.match(decode(zipEntry(join(d, "index.docx"), "word/document.xml")), /A page citation \[1, p\. 14\]/);
  } finally { cleanup(d); }
});

test("hand-typed citations convert to citekeys and render to the same text under APA", { skip }, () => {
  const d = fixture();
  try {
    const typed = "A page citation (Verma, 2019, p. 14). Two authors (Lindqvist & Rao, 2020). A group (Baker et al., 2018; Verma, 2019).\n";
    writeFileSync(join(d, "typed.qmd"), `---\ntitle: "Typed"\n---\n\n${typed}\n## References\n`);
    assert.equal(st(d, "use", "apa-7", "--apply").code, 0);
    assert.equal(st(d, "convert", "typed.qmd", "--apply").code, 0);
    assert.match(readFileSync(join(d, "typed.qmd"), "utf8"), /\[@verma2019, p\. 14\]/);
    render(d, "typed.qmd", "--to", "html");
    assert.ok(htmlText(d, "typed.html").includes(typed.trim()), htmlText(d, "typed.html"));
  } finally { cleanup(d); }
});

test("PDF through Typst (bundled with Quarto): a PDF is produced and the CSL reaches the Typst source", { skip }, () => {
  const d = fixture();
  try {
    assert.equal(st(d, "use", "apa-7", "--apply").code, 0);
    render(d, "index.qmd", "--to", "typst", "-M", "keep-typ:true");
    assert.equal(readFileSync(join(d, "index.pdf")).subarray(0, 5).toString(), "%PDF-");
    assert.match(readFileSync(join(d, "index.typ"), "utf8"), /#set bibliography\(style: "csl\/apa\.csl"\)/);
  } finally { cleanup(d); }
});

test("doctor reports Quarto, its Pandoc and PDF readiness", { skip }, () => {
  const j = JSON.parse(run(SCHOLAR, ["doctor", "--json", "--root", tmp("doc-")]).out).quarto;
  assert.equal(j.present, true);
  assert.match(j.version, /^\d+\.\d+/);
  assert.match(j.pandoc, /pandoc/i);
  assert.equal(j.install, null);
  assert.equal(j.pdf_ready, Boolean(j.typst || j.tinytex));
});

test("doctor with Quarto missing prints the official install route and never installs", () => {
  const r = run(SCHOLAR, ["doctor", "--json", "--root", tmp("doc-")], { env: { SCHOLAR_QUARTO: "quarto-that-does-not-exist" } });
  const q = JSON.parse(r.out).quarto;
  assert.equal(q.present, false);
  assert.equal(q.pdf_ready, false);
  assert.equal(q.install.docs, "https://quarto.org/docs/get-started/");
  assert.equal(q.install.windows, "winget install --id Posit.Quarto");
  assert.match(q.install.note, /needs the scholar's yes/);
  const text = run(SCHOLAR, ["doctor", "--root", tmp("doc-")], { env: { SCHOLAR_QUARTO: "quarto-that-does-not-exist" } }).out;
  assert.match(text, /Quarto: not found\. Official install: https:\/\/quarto\.org\/docs\/get-started\//);
});
