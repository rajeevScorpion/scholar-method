#!/usr/bin/env node
// Citation integrity checker. Report-only, zero dependencies, imports nothing from other skills.
// Usage: node check-citations.mjs --root <repo> [--bib refs.bib] [--json] [--strict] [files...]
// Checks: Pandoc citekeys resolve in the mapped .bib (error); .bib entries never cited (advisory); quotations
// without a page locator (warn); raw URLs in prose (warn); paragraphs tagged <!-- claims: CLM-0001, ... -->
// whose claims are unknown (error) or below claim-checked (warn); challenging sources not mentioned (advisory).
// Without files it scans paths.drafts from scholar/scholar.json, else every .qmd/.md in the repo.
// Exit code: 0, or 1 with --strict when any error or warn exists.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const argv = process.argv.slice(2), files = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--root" || argv[i] === "--bib") opt[argv[i].slice(2)] = argv[++i];
  else if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = true;
  else files.push(argv[i]);
}
const root = resolve(opt.root ?? process.cwd());
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const cfg = readJson(join(root, "scholar", "scholar.json"));
const rel = (p) => relative(root, p).replaceAll("\\", "/");

// ---------- inputs ----------
function collect(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || ["node_modules", "scholar", "promptPacks", "_book", "_site", "docs"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) collect(p, out);
    else if (/\.(qmd|md|rmd)$/i.test(e.name) && !/^(README|AGENTS|CLAUDE|CHANGELOG|CONTRIBUTING|LICENSE)/i.test(e.name)) out.push(p);
  }
  return out;
}
let targets = files.map((f) => resolve(f));
if (!targets.length) {
  const d = cfg?.paths?.drafts ? join(root, cfg.paths.drafts) : root;
  targets = existsSync(d) ? (statSync(d).isDirectory() ? collect(d) : [d]) : [];
}

function bibPaths() {
  if (opt.bib) return [resolve(root, opt.bib)];
  if (cfg?.paths?.bib) return [join(root, cfg.paths.bib)];
  const found = new Set();
  for (const f of [join(root, "_quarto.yml"), join(root, "_quarto.yaml"), ...targets]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^\s*bibliography:\s*\[?\s*["']?([^\s"',\]]+)/m);
    if (m) found.add(resolve(f.includes("_quarto") ? root : join(f, ".."), m[1]));
  }
  return [...found];
}
const bibFiles = bibPaths().filter(existsSync);
const bibKeys = new Map(); // key -> file
for (const b of bibFiles) for (const m of readFileSync(b, "utf8").matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,/g)) if (!/^(comment|string|preamble)$/i.test(m[1])) bibKeys.set(m[2], rel(b));

const RANK = ["unverified", "metadata-checked", "full-text-reviewed", "claim-checked", "approved-for-use"];
function claimInfo(id) {
  const f = join(root, "scholar", "claims", `${id}.md`);
  if (!existsSync(f)) return null;
  const fm = readFileSync(f, "utf8").replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const get = (k) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, "m"))?.[1].trim() ?? "";
  const list = (k) => [...get(k).replace(/^\[|\]$/g, "").matchAll(/"([^"]*)"|([^,\s][^,]*)/g)].map((m) => (m[1] ?? m[2]).trim().split(/\s+/)[0].replace(/^@/, ""));
  return { status: get("status"), challenges: list("challenges") };
}

// ---------- masking (same length) ----------
function mask(text, { keepComments = false } = {}) {
  let t = text;
  const blank = (re) => { t = t.replace(re, (m) => m.replace(/[^\n]/g, " ")); };
  blank(/^---\n[\s\S]*?\n---(?=\n|$)/);
  if (!keepComments) blank(/<!--[\s\S]*?-->/g);
  blank(/^(```|~~~)[^\n]*\n[\s\S]*?(?:\n\1[^\n]*|(?![\s\S]))/gm);
  blank(/(`+)[^`]*?\1/g);
  blank(/\{[^{}\n]*\}/g);
  return t;
}
function refSection(t) {
  const lines = t.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(references|bibliography)\b/i);
    if (!h) continue;
    let j = i + 1;
    while (j < lines.length) { const n = lines[j].match(/^(#{1,6})\s/); if (n && n[1].length <= h[1].length) break; j++; }
    for (let k = i; k < j; k++) lines[k] = lines[k].replace(/[^\n]/g, " ");
  }
  return lines.join("\n");
}

// ---------- checks ----------
const out = [], cited = new Set();
const CROSSREF = /^(fig|tbl|lst|eq|sec|thm|lem|cor|prp|cnj|def|exm|exr)-/;
const LOCATOR = /\b(?:pp?\.|paras?\.|fig(?:ure)?s?\.?|tables?|chap(?:ter)?s?\.?|sec(?:tion)?s?\.?|loc\.)\s*\d|§\s*\d/i;

for (const file of targets) {
  if (!existsSync(file)) { console.error(`check-citations: no such file ${file}`); process.exit(2); }
  const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const starts = [0];
  for (let i = 0; i < raw.length; i++) if (raw[i] === "\n") starts.push(i + 1);
  const at = (o) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= o) lo = m; else hi = m - 1; } return { line: lo + 1, col: o - starts[lo] + 1 }; };
  const add = (o, rule, severity, message) => out.push({ file: rel(file), ...at(o), rule, severity, message });

  const t = refSection(mask(raw));
  // citekeys
  for (const m of t.matchAll(/(?<![\w.])-?@([\w][\w:.#$%&\-+?<>~/]*)/g)) {
    const key = m[1].replace(/[.:;,?]+$/, "");
    if (CROSSREF.test(key) || key === "*") continue;
    cited.add(key);
    if (!bibKeys.has(key)) add(m.index, "missing-key", "error", `citekey @${key} is not in ${bibFiles.length ? bibFiles.map(rel).join(", ") : "any .bib (none found)"}`);
  }
  // raw URLs in prose
  for (const m of t.matchAll(/(?:https?:\/\/|www\.)[^\s>)\]]+/g)) add(m.index, "raw-url", "warn", `raw URL in prose (${m[0].slice(0, 40)}): keep links in the bibliography unless the venue asks for them inline`);
  // quotations without a page locator
  const quotes = [...t.matchAll(/"(?:(?!\n[ \t]*\n)[^"])+"|“[^”]+”/g)].map((m) => ({ o: m.index, len: m[0].length, words: m[0].split(/\s+/).length }));
  for (const m of t.matchAll(/^[ \t]*>[^\n]*(?:\n[ \t]*>[^\n]*)*/gm)) quotes.push({ o: m.index, len: m[0].length, words: m[0].split(/\s+/).length, block: true });
  for (const q of quotes) {
    if (q.words < 3) continue;
    const paraStart = Math.max(t.lastIndexOf("\n\n", q.o) + 2, q.o - 200), end = q.o + q.len;
    let paraEnd = t.indexOf("\n\n", end); paraEnd = paraEnd < 0 ? t.length : paraEnd;
    const win = t.slice(paraStart, Math.min(paraEnd, end + (q.block ? 200 : 120)));
    if (!LOCATOR.test(win)) add(q.o, "quote-no-locator", "warn", "quotation without a page or figure locator nearby (and cited source?)");
  }
  // claims comments, paragraph by paragraph
  let off = 0;
  for (const para of mask(raw, { keepComments: true }).split(/(\n[ \t]*\n)/)) {
    if (/^\n[ \t]*\n$/.test(para)) { off += para.length; continue; }
    const c = para.match(/<!--\s*claims:\s*([^>]*?)-->/i);
    if (c) {
      const pt = refSection(mask(para));
      const keysHere = new Set([...pt.matchAll(/(?<![\w.])-?@([\w][\w:.#$%&\-+?<>~/]*)/g)].map((m) => m[1].replace(/[.:;,?]+$/, "")));
      const o = off + (c.index ?? 0);
      for (const id of c[1].split(/[,\s]+/).filter(Boolean)) {
        const info = claimInfo(id);
        if (!info) { add(o, "claim-unknown", "error", `${id} is not a record in scholar/claims`); continue; }
        if (RANK.indexOf(info.status) < RANK.indexOf("claim-checked") && !para.includes(`[GAP: ${id}`)) add(o, "claim-under-verified", "warn", `${id} is ${info.status || "unknown"}: below claim-checked, so the paragraph needs a [GAP: ...] marker instead of a citation`);
        for (const ch of info.challenges) if (!/^SRC-\d+$/.test(ch) && !keysHere.has(ch)) add(o, "challenge-unacknowledged", "advisory", `${id} is challenged by ${ch}, which this paragraph does not cite`);
      }
    }
    off += para.length;
  }
}

if (targets.length && bibFiles.length) {
  const unused = [...bibKeys].filter(([k]) => !cited.has(k));
  for (const [k, f] of unused) out.push({ file: f, line: 0, col: 0, rule: "unused-entry", severity: "advisory", message: `${k} is in the .bib but not cited in ${files.length ? "the files given" : "the manuscript files"}` });
}
out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
if (opt.json) console.log(JSON.stringify({ bib: bibFiles.map(rel), files: targets.map(rel), findings: out }, null, 2));
else {
  console.log(`bib: ${bibFiles.map(rel).join(", ") || "none found"} (${bibKeys.size} keys); ${targets.length} file(s)`);
  for (const f of out) console.log(`${f.file}:${f.line}:${f.col} ${f.rule} [${f.severity}] ${f.message}`);
  const hard = out.filter((f) => f.severity !== "advisory").length;
  console.log(`${hard} finding(s), ${out.length - hard} advisory.`);
}
process.exitCode = opt.strict && out.some((f) => f.severity !== "advisory") ? 1 : 0;
