#!/usr/bin/env node
// Citation style helper: status, use, fetch, fields, convert, narrative. Zero dependencies, imports nothing from other skills.
// Usage: node style.mjs <status|use|fetch|fields|convert|narrative> [args] --root <repo> [--apply] [--json] [--strict]
//   status                       configured style, the CSL the project really uses, bibliography, Quarto
//   use <style|file.csl>         plan (default) or --apply: copy or fetch the CSL, set csl: in _quarto.yml, update scholar.json
//   fetch <style> [--to path]    plan (default) or --apply: download an official CSL at the pinned commit
//   fields <style>               per-style completeness of the .bib / CSL-JSON entries (never fills anything)
//   convert [files...]           propose Pandoc citekeys for hand-typed citations; --apply rewrites only `exact` ones
//   narrative --style <id> [files...]   flag wording that depends on the citation style (report only)
// Everything is report-only unless --apply is given. Exit code: 0, or 1 with --strict when something is flagged.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PIN = "f123868a546e6e7cec10e808ae04ef0e52bf2210"; // citation-style-language/styles, 2026-11-24 (see references/csl/README.md)
const RAW = "https://raw.githubusercontent.com/citation-style-language/styles";
// style id -> official CSL file name (without .csl) and how citations look. There is no plain "vancouver.csl" in the
// repository: nlm-citation-sequence (NLM/Vancouver, Citing Medicine) is the closest official file.
const STYLES = {
  "apa-7": { csl: "apa", kind: "author-date" },
  "mla-9": { csl: "modern-language-association", kind: "author-page" },
  "chicago-author-date": { csl: "chicago-author-date", kind: "author-date" },
  "chicago-notes": { csl: "chicago-notes-bibliography", kind: "note" },
  "harvard": { csl: "harvard-cite-them-right", kind: "author-date" },
  "ieee": { csl: "ieee", kind: "numeric" },
  "vancouver": { csl: "nlm-citation-sequence", kind: "numeric" },
};
const styleOfCsl = (file) => Object.entries(STYLES).find(([, s]) => s.csl === basename(file).replace(/\.csl$/i, ""))?.[0] ?? null;

const argv = process.argv.slice(2), pos = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (["--root", "--bib", "--style", "--to"].includes(argv[i])) opt[argv[i].slice(2)] = argv[++i];
  else if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = true;
  else pos.push(argv[i]);
}
const [cmd, ...args] = pos;
const root = resolve(opt.root ?? process.cwd());
const rel = (p) => relative(root, p).replaceAll("\\", "/");
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const cfgPath = join(root, "scholar", "scholar.json");
const cfg = readJson(cfgPath);
const cfgStyle = cfg?.citation?.style ?? "apa-7";
const qfile = ["_quarto.yml", "_quarto.yaml"].map((n) => join(root, n)).find(existsSync);
const qtext = qfile ? readFileSync(qfile, "utf8") : "";
const quartoVersion = () => { const r = spawnSync(process.env.SCHOLAR_QUARTO ?? "quarto", ["--version"], { encoding: "utf8", timeout: 20000 }); return r.status === 0 ? r.stdout.trim() : null; };
const lf = (s) => s.replace(/\r\n/g, "\n");

// ---------- project files ----------
function collect(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || ["node_modules", "scholar", "promptPacks", "_book", "_site", "docs"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) collect(p, out);
    else if (/\.(qmd|md|rmd)$/i.test(e.name) && !/^(README|AGENTS|CLAUDE|CHANGELOG|CONTRIBUTING|LICENSE)/i.test(e.name)) out.push(p);
  }
  return out;
}
function targets(files) {
  if (files.length) return files.map((f) => (existsSync(resolve(f)) ? resolve(f) : resolve(root, f)));
  const d = cfg?.paths?.drafts ? join(root, cfg.paths.drafts) : root;
  return existsSync(d) ? (statSync(d).isDirectory() ? collect(d) : [d]) : [];
}
const frontMatter = (t) => lf(t).match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1] ?? "";
function yamlValues(text, key) { // scalar, inline list or block list under a key
  const out = [], lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^[ \\t]*${key}:[ \\t]*(.*?)[ \\t]*$`));
    if (!m) continue;
    const clean = (s) => s.replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
    if (m[1].startsWith("[")) out.push(...m[1].replace(/^\[|\]$/g, "").split(",").map(clean).filter(Boolean));
    else if (m[1]) out.push(clean(m[1]));
    else for (let j = i + 1; j < lines.length; j++) { const li = lines[j].match(/^[ \t]*-[ \t]+(.+)$/); if (!li) break; out.push(clean(li[1])); }
  }
  return out;
}
function bibFiles() {
  if (opt.bib) return [resolve(root, opt.bib)];
  if (cfg?.paths?.bib) return [join(root, cfg.paths.bib)];
  const found = new Set(yamlValues(qtext, "bibliography").map((b) => resolve(root, b)));
  for (const f of targets([])) for (const b of yamlValues(frontMatter(readFileSync(f, "utf8")), "bibliography")) found.add(resolve(dirname(f), b));
  return [...found];
}
function cslInUse() { // every csl: value in _quarto.yml and in document front matter
  const out = yamlValues(qtext, "csl").map((v) => ({ where: rel(qfile), value: v }));
  for (const f of targets([])) for (const v of yamlValues(frontMatter(readFileSync(f, "utf8")), "csl")) out.push({ where: rel(f), value: v });
  return out;
}
function cslDir() { // follow an existing folder, else next to the bib
  const have = ["refs/csl", "csl", "styles", "references/csl"].find((d) => existsSync(join(root, d)) && statSync(join(root, d)).isDirectory());
  if (have) return have;
  const b = bibFiles()[0];
  return b && dirname(rel(b)) !== "." ? `${dirname(rel(b))}/csl` : "csl";
}

// ---------- bibliography (BibTeX and CSL-JSON) normalised to {key, type, authors, f} ----------
const plain = (v) => String(v ?? "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
function authorsOf(raw) {
  const names = [], parts = [];
  let depth = 0, cur = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i], and = depth === 0 && raw.slice(i).match(/^\s+and\s+/);
    if (and) { parts.push(cur); cur = ""; i += and[0].length - 1; continue; }
    if (c === "{") depth++; if (c === "}") depth--;
    cur += c;
  }
  parts.push(cur);
  for (const p of parts.map((s) => s.trim()).filter(Boolean)) {
    if (p === "others") { names.etal = true; continue; }
    if (/^\{.*\}$/.test(p)) names.push({ surname: plain(p), corporate: true });
    else if (p.includes(",")) names.push({ surname: plain(p.split(",")[0]) });
    else names.push({ surname: plain(p).split(" ").pop() });
  }
  return names;
}
function parseBib(text) {
  const out = [], re = /@(\w+)\s*[{(]\s*([^,\s]+)\s*,/g;
  let m;
  while ((m = re.exec(text))) {
    const type = m[1].toLowerCase();
    if (["comment", "string", "preamble"].includes(type)) continue;
    let i = re.lastIndex;
    const f = {};
    for (;;) {
      while (i < text.length && /[\s,]/.test(text[i])) i++;
      const nm = /^([\w\-:]+)\s*=\s*/.exec(text.slice(i, i + 80));
      if (!nm) break;
      i += nm[0].length;
      let v = "";
      if (text[i] === "{") { let d = 0, j = i; for (; j < text.length; j++) { if (text[j] === "{") d++; else if (text[j] === "}" && --d === 0) break; } v = text.slice(i + 1, j); i = j + 1; }
      else if (text[i] === '"') { let j = i + 1; while (j < text.length && !(text[j] === '"' && text[j - 1] !== "\\")) j++; v = text.slice(i + 1, j); i = j + 1; }
      else { const b = /^[^,}\n]*/.exec(text.slice(i))[0]; v = b.trim(); i += b.length; }
      f[nm[1].toLowerCase()] = v;
    }
    re.lastIndex = i;
    const au = authorsOf(f.author ?? f.editor ?? "");
    for (const k of Object.keys(f)) if (k !== "author" && k !== "editor") f[k] = plain(f[k]);
    f.journal ??= f.journaltitle;
    out.push({ key: m[2], type, authors: au, f });
  }
  return out;
}
const CSLTYPE = { "article-journal": "article", book: "book", webpage: "online", "post-weblog": "online", "paper-conference": "inproceedings", chapter: "incollection", report: "report", thesis: "thesis" };
function fromCslJson(items) {
  return (Array.isArray(items) ? items : items.items ?? []).map((it) => {
    const au = (it.author ?? it.editor ?? []).map((a) => a.literal ? { surname: a.literal, corporate: true } : { surname: a.family ?? "" });
    const issued = it.issued?.["date-parts"]?.[0]?.[0] ?? it.issued?.literal ?? "";
    const type = CSLTYPE[it.type] ?? "misc";
    const f = { title: it.title, year: String(issued), volume: it.volume, number: it.issue, pages: it.page, doi: it.DOI, url: it.URL, publisher: it.publisher, urldate: it.accessed ? "yes" : undefined, address: it["publisher-place"] };
    f[type === "article" ? "journal" : type === "online" ? "website" : "booktitle"] = it["container-title"];
    for (const k of Object.keys(f)) if (f[k] === undefined || f[k] === "") delete f[k];
    return { key: it.id, type, authors: au, f };
  });
}
function loadBib() {
  const out = [];
  for (const b of bibFiles().filter(existsSync)) {
    const t = readFileSync(b, "utf8");
    const es = /\.json$/i.test(b) ? fromCslJson(JSON.parse(t)) : parseBib(lf(t));
    for (const e of es) out.push({ ...e, file: rel(b) });
  }
  return out;
}

// ---------- status ----------
function cmdStatus() {
  const warn = [], inUse = cslInUse().map((c) => ({ ...c, style: styleOfCsl(c.value) ?? "custom" }));
  const style = cfgStyle;
  if (!inUse.length) warn.push(`no csl: set in ${qfile ? rel(qfile) : "a Quarto or Pandoc config"} or in any document's front matter. Pandoc then falls back to Chicago author-date, which is not APA 7. Fix: node style.mjs use ${style === "custom" ? "<file.csl>" : style} --root . --apply`);
  for (const c of inUse) {
    if (c.style !== style) warn.push(`${c.where} uses ${basename(c.value)} (${c.style}) but citation.style is ${style}`);
    const base = qfile && c.where === rel(qfile) ? root : dirname(resolve(root, c.where));
    if (!/^https?:/.test(c.value) && !existsSync(resolve(base, c.value))) warn.push(`${c.where}: csl file ${c.value} does not exist`);
  }
  if (cfg?.profile?.citation_style && cfg?.citation) warn.push(`profile.citation_style ("${cfg.profile.citation_style}") is the older setting; citation.style wins`);
  const res = { root, configured: { style, csl: cfg?.citation?.csl ?? null, assumed_default: !cfg?.citation }, csl_in_use: inUse, bibliography: bibFiles().map(rel), quarto: quartoVersion(), warnings: warn };
  if (opt.json) console.log(JSON.stringify(res, null, 2));
  else {
    console.log(`citation.style: ${style}${res.configured.assumed_default ? " (assumed default: scholar.json has no citation block)" : ""}; csl: ${res.configured.csl ?? "none recorded"}`);
    console.log(`csl in use: ${inUse.map((c) => `${c.value} (${c.where})`).join(", ") || "none"}`);
    console.log(`bibliography: ${res.bibliography.join(", ") || "none found"}`);
    console.log(`quarto: ${res.quarto ?? "not found (render needs it; see scholar.mjs doctor)"}`);
    for (const w of warn) console.log(`WARN ${w}`);
  }
  return opt.strict && warn.length ? 1 : 0;
}

// ---------- use / fetch ----------
async function download(name, dest) {
  const url = `${RAW}/${PIN}/${name}.csl`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const t = await r.text();
  if (!/<style\b[^>]*purl\.org\/net\/xbiblio\/csl/.test(t)) throw new Error(`${url}: not a CSL file`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, t);
}
function editQuarto(text, value) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n", v = /[\s:#]/.test(value) ? JSON.stringify(value) : value;
  let n = 0;
  const out = text.replace(/^([ \t]*csl:[ \t]*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s#][^\r\n#]*?)([ \t]*(?:#[^\r\n]*)?)$/gm, (_, a, b) => { n++; return a + v + b; });
  if (n) return { text: out, how: `replaced ${n} csl: line(s)` };
  return { text: text + (text === "" || text.endsWith("\n") ? "" : eol) + `csl: ${v}${eol}`, how: "appended a top-level csl: line" };
}
function resolveStyle(arg) {
  if (STYLES[arg]) return { id: arg, name: STYLES[arg].csl };
  if (/\.csl$/i.test(arg ?? "")) {
    const p = [resolve(arg), resolve(root, arg)].find(existsSync);
    if (!p) { console.error(`no such CSL file: ${arg}`); process.exit(2); }
    return { id: styleOfCsl(p) ?? "custom", name: basename(p, ".csl"), local: p };
  }
  console.error(`style must be one of ${Object.keys(STYLES).join(", ")} or a path to a .csl file (got ${arg ?? "nothing"})`);
  process.exit(2);
}
async function cmdUse() {
  const t = resolveStyle(args[0]), dir = cslDir();
  let dest = join(root, dir, `${t.name}.csl`), how;
  if (t.local && !relative(root, t.local).startsWith("..")) { dest = t.local; how = "already inside the project, used in place"; }
  else if (existsSync(dest)) how = "already in the project, kept as it is";
  else if (t.local) how = `copy ${t.local}`;
  else if (t.id === "apa-7") { t.local = join(here, "..", "references", "csl", "apa.csl"); how = "copy the bundled apa.csl"; }
  else how = `download ${RAW}/${PIN}/${t.name}.csl (official CSL repository, pinned commit)`;
  const relCsl = rel(dest);
  const edit = qfile ? editQuarto(qtext, relCsl) : null;
  console.log(`Plan: use ${t.id} (${t.name}.csl)${opt.apply ? "" : " (dry run, nothing written)"}`);
  console.log(`  csl file: ${relCsl}: ${how}`);
  console.log(edit ? `  ${rel(qfile)}: ${edit.how}, other lines untouched` : `  no _quarto.yml: add "csl: ${relCsl}" to your Pandoc or Quarto metadata yourself`);
  console.log(cfg ? `  scholar/scholar.json: citation = {"style": "${t.id}", "csl": "${relCsl}"}` : "  no scholar/scholar.json: nothing to record there");
  if (!opt.apply) { console.log("Re-run with --apply to do this. Then record the decision (date and source) in the project's decisions file, render and compare."); return 0; }
  if (!existsSync(dest)) {
    if (t.local) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(t.local, dest); } else await download(t.name, dest);
  }
  if (edit && edit.text !== qtext) writeFileSync(qfile, edit.text);
  if (cfg) writeFileSync(cfgPath, JSON.stringify({ ...cfg, citation: { style: t.id, csl: relCsl } }, null, 2) + "\n");
  console.log("Done. Record the decision (date and source) in the project's decisions file, then render and compare.");
  return 0;
}
async function cmdFetch() {
  const t = resolveStyle(args[0]);
  if (t.local) { console.error("fetch takes a style id, not a local file"); return 2; }
  const url = `${RAW}/${PIN}/${t.name}.csl`;
  const dest = opt.to ? (/\.csl$/i.test(opt.to) ? resolve(root, opt.to) : join(resolve(root, opt.to), `${t.name}.csl`)) : join(root, cslDir(), `${t.name}.csl`);
  console.log(`${opt.apply ? "Fetching" : "Would fetch (dry run)"} ${url}\n  to ${rel(dest)}`);
  if (existsSync(dest) && !opt.force) { console.log("  exists; kept (use --force to replace)"); return 0; }
  if (opt.apply) await download(t.name, dest);
  else console.log("Re-run with --apply after the scholar has said yes.");
  return 0;
}

// ---------- fields ----------
const CLASS = { article: "article", book: "book", booklet: "book", mvbook: "book", inproceedings: "inproceedings", conference: "inproceedings", incollection: "incollection", inbook: "incollection", online: "online", electronic: "online", www: "online", webpage: "online", techreport: "report", report: "report", thesis: "thesis", phdthesis: "thesis", mastersthesis: "thesis" };
const ALIAS = { year: ["year", "date"], pages: ["pages", "eid", "articleno"], number: ["number", "issue"], publisher: ["publisher", "institution", "school", "organization"], container: ["website", "journal", "booktitle", "publisher", "organization", "institution", "site"] };
function need(id, c) {
  const req = ["author", "year", "title"], rec = [];
  const k = STYLES[id]?.kind;
  if (c === "article") {
    req.push("journal");
    if (id === "mla-9") { req.push("pages"); rec.push("volume", "number"); }
    else { req.push("volume", "pages"); rec.push("number"); if (id === "apa-7") rec.push("doi|url"); }
  } else if (c === "book") { req.push("publisher"); if (id.startsWith("chicago")) rec.push("address"); }
  else if (c === "inproceedings") { req.push("booktitle"); (k === "numeric" || id === "mla-9" ? req : rec).push("pages"); }
  else if (c === "incollection") { req.push("booktitle", "publisher"); (k === "numeric" || id === "mla-9" ? req : rec).push("pages"); }
  else if (c === "report" || c === "thesis") req.push("publisher");
  else if (c === "online") { req.push("url"); if (id === "mla-9") rec.push("urldate", "container"); if (k === "numeric") req.push("urldate"); if (id === "apa-7") rec.push("container"); }
  return { req, rec };
}
function cmdFields() {
  const id = args[0] ?? cfgStyle;
  if (!STYLES[id] && id !== "custom") { console.error(`style must be one of ${Object.keys(STYLES).join(", ")}`); return 2; }
  const entries = loadBib();
  if (!entries.length) { console.error("no .bib or CSL-JSON entries found (use --bib or set paths.bib)"); return 2; }
  const has = (e, n) => n.split("|").some((a) => (ALIAS[a] ?? [a]).some((x) => x === "author" ? e.authors.length : e.f[x]));
  const res = [];
  for (const e of entries) {
    const c = CLASS[e.type] ?? (e.f.url ? "online" : "misc");
    const { req, rec } = need(id, c);
    const missing = req.filter((n) => !has(e, n)), recommended = rec.filter((n) => !has(e, n));
    if (missing.length || recommended.length) res.push({ key: e.key, file: e.file, type: e.type, missing, recommended });
  }
  if (opt.json) console.log(JSON.stringify({ style: id, entries: entries.length, gaps: res }, null, 2));
  else {
    for (const r of res) console.log(`${r.file}:${r.key} [${r.type}] ${r.missing.length ? "missing: " + r.missing.join(", ") : ""}${r.missing.length && r.recommended.length ? " | " : ""}${r.recommended.length ? "recommended: " + r.recommended.join(", ") : ""}`);
    console.log(`${res.length} of ${entries.length} entries have gaps for ${id}. Nothing was filled in: copy missing values from the source itself, never from memory.`);
  }
  return opt.strict && res.some((r) => r.missing.length) ? 1 : 0;
}

// ---------- scanning hand-typed citations ----------
const NAME = String.raw`(?:(?:de|van|von|der|den|di|da|del|la|le|bin|al|el|ten|ter)\s+)*\p{Lu}[\p{L}'’\-]*`;
const AUTH = String.raw`(?:${NAME}(?:,\s+${NAME})*,?\s+(?:&|and)\s+${NAME}|${NAME}\s+et\s+al\.|${NAME})`;
const LOC = String.raw`(?:pp?\.|paras?\.|chaps?\.|ch\.|secs?\.|figs?\.|tables?)\s*[\w\-–]+`;
const PIECE = new RegExp(String.raw`^(?:(see(?: also)?|e\.g\.,?|cf\.|compare)\s+)?(${AUTH}),?\s+(\d{4})([a-z])?(?:,\s*(${LOC}))?$`, "u");
const NARR = new RegExp(String.raw`(?<![\p{L}\p{N}])(${AUTH})\s+\((\d{4})([a-z])?(?:,\s*(${LOC}))?\)`, "gu");
const normName = (s) => { const n = s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, ""); return n || s.toLowerCase(); };
const sortTitle = (t) => normName(String(t).replace(/^(a|an|the)\s+/i, ""));
const RANK = { exact: 0, likely: 1, ambiguous: 2, unmatched: 3 };

function index() {
  return loadBib().map((e) => ({ key: e.key, n: e.authors.length + (e.authors.etal ? 1 : 0), surnames: e.authors.map((a) => normName(a.surname)), year: (e.f.year ?? e.f.date ?? "").match(/\d{4}/)?.[0] ?? "", ysuf: (e.f.year ?? "").match(/\d{4}([a-z])\b/)?.[1] ?? "", title: e.f.title ?? "", first: e.authors[0]?.surname ?? "", f: e.f }));
}
function lookup(ix, names, etal, year, suf) {
  const label = `${names.join(" & ")}${etal ? " et al." : ""} ${year}${suf}`;
  const base = ix.filter((e) => e.year === year && e.surnames[0] === normName(names[0]));
  let c = base.filter((e) => names.every((n, i) => e.surnames[i] === normName(n))), partial = "";
  if (!etal) { const full = c.filter((e) => e.n === names.length); if (full.length) c = full; else if (c.length) partial = "the bib entry has more authors than the text lists"; }
  else { const many = c.filter((e) => e.n >= 3); if (many.length) c = many; else if (c.length) partial = "et al. used for a work with two authors"; }
  if (!c.length) return { status: "unmatched", reason: base.length ? `${label}: the bib has this surname and year only with other authors (${base.map((e) => e.key).join(", ")})` : `no bib entry for ${label}` };
  if (c.length === 1) {
    if (partial) return { status: "likely", key: c[0].key, reason: partial };
    if (suf && c[0].ysuf !== suf) return { status: "likely", key: c[0].key, reason: `text has suffix "${suf}", bib year has none` };
    return { status: "exact", key: c[0].key, reason: "surname and year match one entry" };
  }
  if (suf) {
    const bySuf = c.filter((e) => e.ysuf === suf);
    if (bySuf.length === 1) return { status: "exact", key: bySuf[0].key, reason: `year suffix ${suf} stored in the bib` };
    const sorted = [...c].sort((a, b) => sortTitle(a.title).localeCompare(sortTitle(b.title)));
    const pick = sorted[suf.charCodeAt(0) - 97];
    if (pick) return { status: "likely", key: pick.key, reason: `${label}: a/b follows title order in APA; check the rendered list` };
  }
  return { status: "ambiguous", cands: c.map((e) => e.key), reason: `${c.length} entries for ${label} (${c.map((e) => e.key).join(", ")}): ${suf ? "cannot tell which is " + suf : "text needs a/b"}` };
}
function mask(text) {
  let t = text;
  const blank = (re) => { t = t.replace(re, (m) => m.replace(/[^\n]/g, " ")); };
  blank(/^---\n[\s\S]*?\n---(?=\n|$)/);
  blank(/<!--[\s\S]*?-->/g);
  blank(/^(```|~~~)[^\n]*\n[\s\S]*?(?:\n\1[^\n]*|(?![\s\S]))/gm);
  blank(/(`+)[^`]*?\1/g);
  blank(/https?:\/\/[^\s)>\]]+/g);
  blank(/"(?:(?!\n[ \t]*\n)[^"])+"|“[^”]+”/g);
  blank(/^[ \t]*>[^\n]*(?:\n[ \t]*>[^\n]*)*/gm);
  return t;
}
function refRange(text) { // [start, end) of the References section, or null
  const lines = text.split("\n");
  let off = 0;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(references|bibliography)\b/i);
    if (h) {
      let j = i + 1, end = off + lines[i].length + 1;
      for (; j < lines.length; j++) { const n = lines[j].match(/^(#{1,6})\s/); if (n && n[1].length <= h[1].length) break; end += lines[j].length + 1; }
      return [off, end];
    }
    off += lines[i].length + 1;
  }
  return null;
}
const namesOf = (s) => s.replace(/\s+et\s+al\.$/, "").split(/,?\s+(?:&|and)\s+|,\s+/).map((x) => x.trim()).filter(Boolean);

function scan(text) { // text is LF-normalised; returns items sorted by start
  const ix = index(), items = [];
  let t = mask(text);
  const rr = refRange(text);
  const numbered = new Map();
  if (rr) {
    for (const m of text.slice(rr[0], rr[1]).matchAll(/^[ \t]*(?:\[(\d+)\]|(\d+)[.)])[ \t]+(.+)$/gm)) {
      const n = normName(m[3]), hits = ix.filter((e) => e.surnames[0] && n.includes(e.surnames[0]) && e.year && m[3].includes(e.year));
      numbered.set(Number(m[1] ?? m[2]), hits.length === 1 ? { key: hits[0].key } : { reason: hits.length ? `reference ${m[1] ?? m[2]} matches several entries` : `reference ${m[1] ?? m[2]} matches no bib entry` });
    }
    t = t.slice(0, rr[0]) + t.slice(rr[0], rr[1]).replace(/[^\n]/g, " ") + t.slice(rr[1]);
  }
  const line = (o) => text.slice(0, o).split("\n").length;
  const push = (start, end, proposed, status, reason, kind) => items.push({ start, end, line: line(start), original: text.slice(start, end), proposed, status, reason, kind });
  const one = (names, etal, y, s) => lookup(ix, names, etal, y, s ?? "");
  // (Smith, 2020), (Smith & Jones, 2019, p. 4), (Smith et al., 2021; Lee, 2018)
  for (const m of t.matchAll(/\(([^()]{3,300})\)/g)) {
    if (/\n[ \t]*\n/.test(m[1])) continue;
    const pieces = m[1].replace(/\s+/g, " ").split(/;\s*/).map((p) => p.trim()), parts = [];
    for (const p of pieces) {
      const g = p.match(PIECE);
      if (!g) { parts.push({ orig: p, bad: true }); continue; }
      const r = one(namesOf(g[2]), /et al\.$/.test(g[2]), g[3], g[4]);
      parts.push({ orig: p, r, prefix: g[1], loc: g[5] });
    }
    if (!parts.some((p) => !p.bad)) continue;
    const worst = parts.reduce((w, p) => Math.max(w, p.bad ? 3 : RANK[p.r.status]), 0);
    const status = Object.keys(RANK)[worst];
    const prop = parts.map((p) => p.bad ? `?(${p.orig})` : p.r.key ? `${p.prefix ? p.prefix + " " : ""}@${p.r.key}${p.loc ? ", " + p.loc : ""}` : `?(${p.orig})`).join("; ");
    const reason = parts.filter((p) => p.bad || p.r.status !== "exact").map((p) => p.bad ? `"${p.orig}" is not an author-date citation` : p.r.reason).join("; ") || parts.map((p) => p.r.reason)[0];
    push(m.index, m.index + m[0].length, `[${prop}]`, status, reason, "parenthetical");
  }
  // [3], [2, 5], [4-6]
  for (const m of t.matchAll(/(?<![\w\]])\[(\d+(?:\s*[-–,]\s*\d+)*)\](?![(:])/g)) {
    const nums = [];
    for (const p of m[1].split(/\s*,\s*/)) { const r = p.split(/\s*[-–]\s*/).map(Number); for (let n = r[0]; n <= (r[1] ?? r[0]) && nums.length < 60; n++) nums.push(n); }
    if (!numbered.size) { push(m.index, m.index + m[0].length, "?", "unmatched", "numeric citation, but no numbered reference list to map it", "numeric"); continue; }
    const got = nums.map((n) => numbered.get(n) ?? { reason: `no reference numbered ${n}` });
    const ok = got.every((g) => g.key);
    push(m.index, m.index + m[0].length, ok ? `[${got.map((g) => "@" + g.key).join("; ")}]` : "?", ok ? "exact" : "unmatched", ok ? "mapped through the numbered reference list (delete that hand-typed list afterwards; Quarto builds it)" : got.filter((g) => !g.key).map((g) => g.reason).join("; "), "numeric");
  }
  // Smith (2020), Smith and Jones (2019), Smith et al. (2021)
  for (const m of t.matchAll(NARR)) {
    const r = one(namesOf(m[1]), /et al\.$/.test(m[1]), m[2], m[3]);
    const loc = m[4] ? ` [${m[4]}]` : "";
    push(m.index, m.index + m[0].length, r.key ? `@${r.key}${loc}` : r.cands ? `@?(${r.cands.join("|")})${loc}` : "?", r.status, r.reason, "narrative");
  }
  items.sort((a, b) => a.start - b.start);
  const out = [];
  for (const it of items) if (!out.length || it.start >= out[out.length - 1].end) out.push(it);
  return out;
}

function cmdConvert() {
  const files = targets(args), all = [];
  if (!loadBib().length) { console.error("no .bib or CSL-JSON entries found (use --bib or set paths.bib)"); return 2; }
  for (const f of files) {
    if (!existsSync(f)) { console.error(`style: no such file ${f}`); return 2; }
    const raw = readFileSync(f, "utf8"), text = lf(raw);
    for (const it of scan(text)) all.push({ file: rel(f), ...it, abs: f, raw, text });
  }
  const view = all.map(({ file, line, original, proposed, status, reason }) => ({ at: `${file}:${line}`, original: original.replace(/\s+/g, " "), proposed, confidence: status, reason }));
  if (opt.json) console.log(JSON.stringify(view, null, 2));
  else {
    console.log("| file:line | original | proposed | confidence | reason |\n|---|---|---|---|---|");
    for (const v of view) console.log(`| ${v.at} | ${v.original} | ${v.proposed} | ${v.confidence} | ${v.reason} |`);
    const c = (s) => all.filter((a) => a.status === s).length;
    console.log(`${all.length} hand-typed citation(s): ${c("exact")} exact, ${c("likely")} likely, ${c("ambiguous")} ambiguous, ${c("unmatched")} unmatched. Only exact ones are applied; the rest are for you.`);
  }
  if (!opt.apply) return opt.strict && all.some((a) => a.status !== "exact") ? 1 : 0;
  const log = [`# style.mjs convert --apply ${new Date().toISOString()}`, "# each block: file:line, the original text (-), what replaced it (+). Reverse by swapping them back."];
  let changed = 0;
  for (const f of new Set(all.filter((a) => a.status === "exact").map((a) => a.abs))) {
    const mine = all.filter((a) => a.abs === f && a.status === "exact"), { raw, text } = mine[0];
    const crlf = raw.includes("\r\n");
    if (crlf && /(^|[^\r])\n/.test(raw)) { console.error(`skipped ${rel(f)}: mixed line endings`); continue; }
    let out = text;
    for (const it of [...mine].sort((a, b) => b.start - a.start)) { out = out.slice(0, it.start) + it.proposed + out.slice(it.end); }
    for (const it of mine) log.push(`--- ${rel(f)}:${it.line}`, `- ${it.original.replace(/\n/g, "\\n")}`, `+ ${it.proposed}`);
    writeFileSync(f, crlf ? out.replace(/\n/g, "\r\n") : out);
    changed += mine.length;
  }
  if (changed) {
    const dir = join(root, "scholar", "backups"), file = join(dir, `convert-${new Date().toISOString().replace(/[:.]/g, "-")}.diff`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, log.join("\n") + "\n");
    console.log(`Applied ${changed} exact conversion(s). Backup diff: ${rel(file)}. Now run check-citations.mjs, render, and compare.`);
  } else console.log("Nothing exact to apply.");
  return 0;
}

// ---------- narrative ----------
const VERBS = "shows?|showed|argues?|argued|found|finds|notes?|noted|suggests?|suggested|reports?|reported|demonstrates?|demonstrated|claims?|claimed|states?|stated|observes?|observed";
function cmdNarrative() {
  const id = typeof opt.style === "string" ? opt.style : cfgStyle, kind = STYLES[id]?.kind;
  if (!kind) { console.error(`--style must be one of ${Object.keys(STYLES).join(", ")}`); return 2; }
  const out = [];
  for (const f of targets(args)) {
    const text = lf(readFileSync(f, "utf8")), t = mask(text);
    const add = (o, rule, msg) => out.push({ file: rel(f), line: text.slice(0, o).split("\n").length, rule, message: msg });
    for (const m of t.matchAll(new RegExp(String.raw`(?:\[@[^\]]+\]|^\[\d+\])\s+(?:${VERBS})\b`, "gm"))) add(m.index, "citation-as-subject", "a bracketed citation is the sentence subject; use the narrative form @key so the author is named in every style");
    if (kind === "numeric") { // @key outside brackets is the narrative form: numeric styles print only [n] for it
      const open = t.replace(/\[[^\]\n]*@[^\]\n]*\]/g, (x) => " ".repeat(x.length));
      for (const m of open.matchAll(/(?<![\w@\[;\-])@(?!(?:fig|tbl|lst|eq|sec|thm|lem|cor|prp|cnj|def|exm|exr)-)\w[\w:.#$%&\-+?<>~/]*/g)) add(m.index, "narrative-loses-author", `${m[0]} renders as [n] in ${id}, with no author name: name the author in words and cite with [${m[0]}]`);
    }
    for (const m of t.matchAll(/[^.!?\n]+(?:[.!?]+(?=\s|$)|$)/gm)) {
      const s = m[0];
      if ((kind === "numeric" || kind === "note" || kind === "author-page") && /\b(?:in|since|by|from|until)\s+\d{4}\b/i.test(s) && /@[\w]/.test(s))
        add(m.index, "year-wording", `${id} does not print the year in text (${{ numeric: "numbers", note: "footnotes", "author-page": "author and page" }[kind]}): a sentence that leans on the year in the prose and on a citation may need rewording or a locator`);
      if (kind === "note" && /^#{1,6}\s/.test(s.trim()) && /@[\w]/.test(s)) add(m.index, "note-in-heading", "a citation in a heading becomes a footnote there; move it into the paragraph");
      if (kind === "note" && /^\s*\|.*@[\w]/.test(s)) add(m.index, "note-in-table", "a citation in a table cell becomes a footnote; cite below the table instead");
    }
    for (const it of scan(text)) {
      if (it.kind === "numeric" && kind !== "numeric") add(it.start, "numeric-citation", `[n] markers do not exist in ${id}; convert them to citekeys first`);
      else if (it.kind !== "numeric") add(it.start, "hand-typed-author-date", `"${it.original.replace(/\s+/g, " ")}" is typed by hand; run convert so ${id} formats it`);
    }
  }
  if (kind === "note") out.push({ file: "", line: 0, rule: "note-style", message: "every citation will print as a footnote: check parenthetical asides and that the project wants notes plus a bibliography" });
  out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  if (opt.json) console.log(JSON.stringify(out, null, 2));
  else { for (const o of out) console.log(`${o.file ? o.file + ":" + o.line + " " : ""}${o.rule} ${o.message}`); console.log(`${out.length} point(s) for ${id}. Report only: the scholar decides what to reword.`); }
  return opt.strict && out.length ? 1 : 0;
}

// ---------- main ----------
const HELP = `style.mjs: status | use <style|file.csl> | fetch <style> | fields <style> | convert [files] | narrative --style <id> [files]
  options: --root <repo> --apply --json --strict --bib <file> --to <path> --force
  styles: ${Object.keys(STYLES).join(", ")}`;
const run = { status: cmdStatus, use: cmdUse, fetch: cmdFetch, fields: cmdFields, convert: cmdConvert, narrative: cmdNarrative }[cmd];
if (!run) { console.log(HELP); process.exit(cmd ? 2 : 0); }
try { process.exitCode = await run(); } catch (e) { console.error(`style: ${e.message}`); process.exitCode = 1; }
