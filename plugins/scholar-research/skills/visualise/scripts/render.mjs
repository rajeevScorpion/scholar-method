#!/usr/bin/env node
// Render a Vega-Lite spec: validate its local data files, write a self-contained HTML viewer (data inlined,
// Vega libraries from a CDN at pinned versions), optionally export SVG headlessly, optionally write or refresh a VIS sidecar.
// Usage: node render.mjs <spec.vl.json> [--svg] [--out-dir <dir>] [--sidecar VIS-0001] [--root <repo>]
// Zero dependencies. SVG export runs `npx -y -p vega -p vega-lite vl2svg` (needs Node, npx and network on first run;
// no node-canvas is needed for SVG).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const PIN = { vega: "6.4.0", "vega-lite": "6.5.0", "vega-embed": "7.3.0" };
const posix = (p) => p.split(sep).join("/");
const fail = (m) => { console.error(`render: ${m}`); process.exit(1); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) { pos.push(argv[i]); continue; }
    const n = argv[i + 1];
    if (n === undefined || n.startsWith("--")) opt[argv[i].slice(2)] = true; else { opt[argv[i].slice(2)] = n; i++; }
  }
  return { pos, opt };
}

// Minimal CSV reader (quotes, escaped quotes, newlines in quotes). Blank lines are skipped.
function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  const t = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); if (row.some((x) => x !== "")) rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

// Every data.url in the spec (top level, layers, concat, ...), as the object that holds it.
function dataRefs(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => dataRefs(n, out));
  else if (node && typeof node === "object") {
    if (node.data && typeof node.data.url === "string") out.push(node.data);
    for (const v of Object.values(node)) dataRefs(v, out);
  }
  return out;
}

function readData(file, ref) {
  const raw = readFileSync(file, "utf8");
  const type = ref.format?.type ?? (/\.csv$/i.test(file) ? "csv" : /\.tsv$/i.test(file) ? "tsv" : "json");
  if (type === "csv") { const rows = parseCsv(raw); return { raw, rows: Math.max(rows.length - 1, 0), table: rows }; }
  if (type === "json") {
    let j; try { j = JSON.parse(raw); } catch (e) { fail(`${file} is not valid JSON: ${e.message}`); }
    const arr = ref.format?.property ? j[ref.format.property] : j;
    if (!Array.isArray(arr)) fail(`${file}: JSON data must be an array of rows (or set format.property)`);
    return { raw, rows: arr.length, values: arr };
  }
  fail(`${file}: data format "${type}" is not supported here (use csv or json)`);
}

function viewer(spec, name, top, svgName) {
  const table = top.table && top.table.length <= 201
    ? `<h2>Data (text equivalent)</h2><table><thead><tr>${top.table[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${top.table.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : `<p>${top.rows} input rows (too many to list here).</p>`;
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(spec.title?.text ?? spec.title ?? name)}</title>
<style>body{font:14px/1.45 system-ui,sans-serif;margin:16px;color:#111;background:#fff}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #ccc;padding:2px 6px;text-align:left}</style>
</head><body>
<h1>${esc(spec.title?.text ?? spec.title ?? name)}</h1>
<p>${esc(spec.description ?? "")}</p>
<div id="vis" role="img" aria-label="${esc(spec.description ?? name)}"></div>
${svgName ? `<p>Static version: <a href="${esc(svgName)}">${esc(svgName)}</a></p>` : "<p>Static version: export with <code>--svg</code>.</p>"}
${table}
<script src="https://cdn.jsdelivr.net/npm/vega@${PIN.vega}/build/vega.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-lite@${PIN["vega-lite"]}/build/vega-lite.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-embed@${PIN["vega-embed"]}/build/vega-embed.min.js"></script>
<script>vegaEmbed("#vis", ${JSON.stringify(spec).replace(/</g, "\\u003c")}, { actions: { export: true, source: false, compiled: false, editor: false } });</script>
</body></html>
`;
}

function sidecarText(id, spec, rel) {
  const q = (s) => JSON.stringify(String(s));
  const m = spec.mark ?? spec.layer?.[0]?.mark;
  const kind = (typeof m === "object" ? m?.type : m) ?? "chart";
  return `---\nid: ${id}\nstatus: exploratory\npurpose: ""\nkind: ${q("chart-" + kind)}\nevidence_class: ""\ninput_refs: [${rel.inputs.map(q).join(", ")}]\nsource_status: ""\nquestion_links: []\ntransforms: ""\nrender_spec: ${q(rel.spec)}\nlimitations: ""\nassumptions: []\nreview_status: author-review-needed\nexports: [${rel.exports.map(q).join(", ")}]\n---\n\n## Caption and notes\n\n(Write the caption and alt text here. Say what is observed, what is target or planned, and what is only hypothesis.)\n`;
}

function buildRecord(rows, inputPath, date) {
  return `Input rows: ${rows} (${inputPath})\nRendered: ${date} with vega@${PIN.vega}, vega-lite@${PIN["vega-lite"]}, vega-embed@${PIN["vega-embed"]}`;
}

function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  if (!pos[0]) fail("usage: render.mjs <spec.vl.json> [--svg] [--out-dir <dir>] [--sidecar VIS-0001] [--root <repo>]");
  const specPath = resolve(pos[0]);
  if (!existsSync(specPath)) fail(`spec not found: ${specPath}`);
  let spec; try { spec = JSON.parse(readFileSync(specPath, "utf8")); } catch (e) { fail(`spec is not valid JSON: ${e.message}`); }
  const refs = dataRefs(spec);
  if (!spec.data || typeof spec.data.url !== "string") fail("the spec must reference its data file with a top-level data.url (a relative path); inline data.values is not reproducible");
  const specDir = dirname(specPath), loaded = new Map();
  for (const ref of refs) {
    if (/^[a-z]+:\/\//i.test(ref.url) || isAbsolute(ref.url)) fail(`data.url "${ref.url}" must be a relative path to a local file`);
    const file = resolve(specDir, ref.url);
    if (!existsSync(file)) fail(`data file not found: ${ref.url} (resolved to ${file}; data.url is relative to the spec file)`);
    loaded.set(ref, readData(file, ref));
  }
  const top = loaded.get(spec.data);
  // inline data in a copy of the spec, for the HTML viewer only (file:// pages cannot fetch relative files)
  const inline = JSON.parse(JSON.stringify(spec));
  const inl = dataRefs(inline);
  refs.forEach((ref, i) => {
    const d = loaded.get(ref), t = inl[i];
    delete t.url;
    if (d.values) t.values = d.values; else { t.values = d.raw; t.format = { ...(t.format ?? {}), type: ref.format?.type ?? "csv" }; }
  });

  const name = basename(specPath).replace(/\.vl\.json$|\.json$/, "");
  const outDir = resolve(typeof opt["out-dir"] === "string" ? opt["out-dir"] : specDir);
  mkdirSync(outDir, { recursive: true });
  const svgPath = join(outDir, `${name}.svg`), htmlPath = join(outDir, `${name}.html`);
  if (opt.svg) {
    const cmd = `npx -y -p vega@${PIN.vega} -p vega-lite@${PIN["vega-lite"]} vl2svg "${specPath}" "${svgPath}"`;
    const r = spawnSync(cmd, { shell: true, encoding: "utf8" });
    if (r.status !== 0 || !existsSync(svgPath)) fail(`SVG export failed (needs node, npx and network on first run): ${(r.stderr || r.error || "").toString().trim().split("\n").slice(-3).join(" | ")}`);
  }
  writeFileSync(htmlPath, viewer(inline, name, top, opt.svg ? basename(svgPath) : null));
  console.log(`rendered ${basename(htmlPath)}${opt.svg ? " and " + basename(svgPath) : ""} from ${basename(specPath)}; input rows: ${top.rows}`);

  if (opt.sidecar) {
    if (typeof opt.sidecar !== "string" || !/^VIS-\d{4,}$/.test(opt.sidecar)) fail("--sidecar needs an id like VIS-0001 (allocate one with `node $SCHOLAR new visual`)");
    let root = typeof opt.root === "string" ? resolve(opt.root) : null;
    for (let d = specDir; !root; d = dirname(d)) { if (existsSync(join(d, "scholar", "scholar.json"))) root = d; else if (dirname(d) === d) break; }
    if (!root) fail("no scholar/scholar.json found above the spec; pass --root <repo>");
    const rel = (p) => posix(relative(root, p));
    const file = join(root, "scholar", "visuals", `${opt.sidecar}.md`);
    const date = new Date().toLocaleDateString("en-CA");
    const record = buildRecord(top.rows, rel(resolve(specDir, spec.data.url)), date);
    mkdirSync(dirname(file), { recursive: true });
    if (!existsSync(file)) {
      const exports = [rel(htmlPath), ...(opt.svg ? [rel(svgPath)] : [])];
      writeFileSync(file, sidecarText(opt.sidecar, spec, { inputs: refs.map((r) => rel(resolve(specDir, r.url))), spec: rel(specPath), exports }) + `\n## Build record\n\n${record}\n`);
      console.log(`created ${rel(file)} (status exploratory, author-review-needed); fill in purpose, evidence_class, limitations, caption`);
    } else {
      let t = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      t = /^Input rows: .*\nRendered: .*$/m.test(t) ? t.replace(/^Input rows: .*\nRendered: .*$/m, record) : t.replace(/\n*$/, `\n\n## Build record\n\n${record}\n`);
      writeFileSync(file, t);
      console.log(`refreshed build record in ${rel(file)}; everything else left as written`);
    }
  }
}
main();
