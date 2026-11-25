#!/usr/bin/env node
// Build preflight. Report-only, zero dependencies, imports nothing from other skills. It never builds anything.
// Usage: node preflight.mjs --root <repo> [--submission] [--json] [--strict] [files...]
// Checks: [GAP: ...] markers left in the manuscript (error with --submission, else warn); figures that have a VIS
// sidecar but are not approved or manuscript-ready (warn); figures with no sidecar (advisory); the project's build
// command as detected; whether the lint and citation scripts of scholar-writing are findable (and the commands to run).
// Exit code: 0, or 1 with --strict when any error or warn exists.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2), files = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--root") opt.root = argv[++i];
  else if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = true;
  else files.push(argv[i]);
}
const root = resolve(opt.root ?? process.cwd());
const rel = (p) => relative(root, p).replaceAll("\\", "/");
let cfg = null;
try { cfg = JSON.parse(readFileSync(join(root, "scholar", "scholar.json"), "utf8")); } catch { /* optional */ }

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

const out = [];
const add = (file, line, rule, severity, message) => out.push({ file, line, rule, severity, message });
const sev = opt.submission ? "error" : "warn";

// ---------- sidecars: VIS id -> status and export basenames ----------
const sidecars = [];
const vdir = join(root, "scholar", "visuals");
if (existsSync(vdir)) for (const f of readdirSync(vdir).filter((n) => /^VIS-\d+\.md$/.test(n))) {
  const fm = readFileSync(join(vdir, f), "utf8").replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const get = (k) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, "m"))?.[1].trim().replace(/^"|"$/g, "") ?? "";
  const exportsList = [...get("exports").replace(/^\[|\]$/g, "").matchAll(/"([^"]*)"|([^,\s][^,]*)/g)].map((m) => (m[1] ?? m[2]).trim());
  sidecars.push({ id: f.slice(0, -3), status: get("status"), names: exportsList.map((e) => e.split(/[\\/]/).pop()) });
}
const OK = ["approved", "manuscript-ready"];

// ---------- manuscript scan ----------
for (const file of targets) {
  if (!existsSync(file)) { console.error(`preflight: no such file ${file}`); process.exit(2); }
  let t = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  t = t.replace(/^(```|~~~)[^\n]*\n[\s\S]*?(?:\n\1[^\n]*|(?![\s\S]))/gm, (m) => m.replace(/[^\n]/g, " ")).replace(/(`+)[^`]*?\1/g, (m) => m.replace(/[^\n]/g, " "));
  const line = (o) => t.slice(0, o).split("\n").length;
  for (const m of t.matchAll(/\[GAP:[^\]]*\]/g)) add(rel(file), line(m.index), "gap-marker", sev, `${m[0]} is still in the manuscript${opt.submission ? ": a submission build must have none" : ""}`);
  const seen = new Set();
  const refs = [...t.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)].map((m) => ({ o: m.index, path: m[1], name: m[1].split(/[\\/]/).pop() }));
  for (const m of t.matchAll(/\bVIS-\d{4,}\b/g)) refs.push({ o: m.index, vis: m[0] });
  for (const r of refs) {
    const hit = sidecars.find((s) => (r.vis ? s.id === r.vis : s.names.includes(r.name)));
    const key = `${rel(file)}|${r.vis ?? r.path}`;
    if (seen.has(key)) continue; seen.add(key);
    if (r.vis && !hit) add(rel(file), line(r.o), "figure-sidecar-missing", "warn", `${r.vis} is mentioned but has no sidecar in scholar/visuals`);
    else if (!hit) add(rel(file), line(r.o), "figure-no-sidecar", "advisory", `${r.path} has no VIS sidecar (fine for a concept sketch or untracked image; confirm rights and approval)`);
    else if (!OK.includes(hit.status)) add(rel(file), line(r.o), "figure-not-approved", "warn", `${hit.id} (${r.vis ?? r.path}) is "${hit.status}", not approved or manuscript-ready`);
  }
}

// ---------- build command and sibling scripts ----------
const here = dirname(fileURLToPath(import.meta.url)); // .../build/scripts
const roots = [
  join(here, "..", "..", "voice-review"), // Codex: skills side by side
  join(here, "..", "..", "..", "..", "scholar-writing", "skills", "voice-review"), // this repository
];
const cacheDir = join(here, "..", "..", "..", "..", "..", "scholar-writing"); // Claude plugin cache: <pack>/<version>/skills/...
if (existsSync(cacheDir)) for (const v of readdirSync(cacheDir).sort().reverse()) roots.push(join(cacheDir, v, "skills", "voice-review"));
const voice = roots.find((r) => existsSync(join(r, "scripts", "lint-prose.mjs")));
const cite = voice && [join(voice, "..", "cite")].find((r) => existsSync(join(r, "scripts", "check-citations.mjs")));
const q = (p) => `node "${p}"`;
const build = existsSync(join(root, "_quarto.yml")) || existsSync(join(root, "_quarto.yaml")) ? "quarto render (from _quarto.yml; check AGENTS.md or the project's own instructions first)" : null;
const next = [];
if (voice) next.push(`${q(join(voice, "scripts", "lint-prose.mjs"))} ${targets.map(rel).join(" ")} --strict`);
if (cite) next.push(`${q(join(cite, "scripts", "check-citations.mjs"))} --root "${root}" --strict`);
if (!voice || !cite) add("", 0, "scripts-missing", "advisory", "lint-prose.mjs or check-citations.mjs not found beside this skill: install scholar-writing, then run both before building");

const summary = { root, build, manuscript: targets.map(rel), run_first: next, findings: out };
if (opt.json) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(`Build preflight for ${root}`);
  console.log(`  detected build: ${build ?? "none recognised: follow the project's own instructions, never invent a pipeline"}`);
  console.log(`  manuscript files: ${targets.length}`);
  for (const n of next) console.log(`  run first: ${n}`);
  for (const f of out) console.log(`${f.file}${f.line ? ":" + f.line : ""} ${f.rule} [${f.severity}] ${f.message}`);
  const hard = out.filter((f) => f.severity !== "advisory").length;
  console.log(`${hard} finding(s), ${out.length - hard} advisory.${opt.submission ? " (submission mode)" : ""}`);
}
process.exitCode = opt.strict && out.some((f) => f.severity === "error" || f.severity === "warn") ? 1 : 0;
