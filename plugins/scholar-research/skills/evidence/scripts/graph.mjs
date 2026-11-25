#!/usr/bin/env node
// Evidence map: reads INS/CLM/SRC records under <root>/scholar and writes <out>.cyto.json, <out>.mmd, <out>.html.
// Edges come ONLY from links written in records (never inferred). Output is deterministic (sorted, no timestamps).
// Usage: node graph.mjs --root <repo> [--out scholar/visuals/evidence-map]
// Zero dependencies; imports nothing from other skills. The viewer loads Cytoscape.js from a CDN (pinned below).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const CYTOSCAPE = "3.35.0";
const DIRS = { insight: ["insights", "INS"], claim: ["claims", "CLM"], source: ["sources", "SRC"] };
const VERIFIED = new Set(["claim-checked", "approved-for-use"]);

// ---- frontmatter parser: copied from scholar-start/scripts/scholar.mjs (a test keeps these identical) ----
function splitList(s) {
  const out = []; let cur = "", quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { cur += c; if (c === "\\" && quote === '"') cur += s[++i] ?? ""; else if (c === quote) quote = null; }
    else if (c === '"' || c === "'") { quote = c; cur += c; }
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function scalar(s) {
  s = s.trim();
  if (s.startsWith('"')) { try { return JSON.parse(s); } catch { throw new Error(`bad quoted string: ${s}`); } }
  if (s.length > 1 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}
function value(v) {
  v = v.trim();
  if (v.startsWith("[")) {
    if (!v.endsWith("]")) throw new Error(`unterminated list: ${v}`);
    const inner = v.slice(1, -1).trim();
    return inner ? splitList(inner).map(scalar).filter((x) => x !== "") : [];
  }
  return scalar(v);
}
function parseRecord(text) {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter (a --- block at the top of the file)");
  const data = {};
  m[1].split("\n").forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const k = line.match(/^([A-Za-z_][A-Za-z0-9_]*):(?:\s+(.*)|\s*)$/);
    if (!k) throw new Error(`frontmatter line ${i + 2}: expected "key: value", nesting is not supported: ${line}`);
    data[k[1]] = value(k[2] ?? "");
  });
  return { data, body: m[2] };
}
// ---- end copied parser ----

const posix = (p) => p.split(sep).join("/");
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (v) => (Array.isArray(v) ? v : []);
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "..." : s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function parseArgs(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) {
    const n = argv[i + 1];
    if (n === undefined || n.startsWith("--")) opt[argv[i].slice(2)] = true; else { opt[argv[i].slice(2)] = n; i++; }
  }
  return opt;
}

function load(root) {
  const recs = [], problems = [];
  for (const [type, [dir, prefix]] of Object.entries(DIRS)) {
    const d = join(root, "scholar", dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((n) => n.startsWith(prefix + "-") && n.endsWith(".md")).sort()) {
      const path = posix(relative(root, join(d, f)));
      try { recs.push({ type, path, ...parseRecord(readFileSync(join(d, f), "utf8")) }); }
      catch (e) { problems.push(`${path}: ${e.message}`); }
    }
  }
  return { recs, problems };
}

function buildGraph(root) {
  const cfg = readJson(join(root, "scholar", "scholar.json"));
  const { recs, problems } = load(root);
  const byId = new Map(recs.map((r) => [r.data.id, r]));
  const byKey = new Map(recs.filter((r) => r.data.citekey).map((r) => [r.data.citekey, r]));
  const ext = new Set(list(cfg?.external_ids).map((s) => String(s).replace(/^@/, "")));
  const bib = cfg?.paths?.bib;
  if (bib && existsSync(join(root, bib))) for (const m of readFileSync(join(root, bib), "utf8").matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)) ext.add(m[1]);

  const nodes = new Map(), edges = new Map(), dangling = [];
  const text = (r) => {
    const m = r.body.match(/##\s*Statement\s*\n+([^\n]+)/);
    return r.type === "claim" ? (m ? m[1].trim() : r.data.id) : r.data.title || r.data.citekey || r.data.id;
  };
  for (const r of recs) {
    const d = r.data;
    if (!d.id) continue;
    const state = r.type === "insight" ? `${d.kind}, ${d.author_decision}` : r.type === "claim" ? `${d.kind}, ${d.status}` : String(d.read_status ?? "");
    const classes = [r.type];
    if (r.type === "insight" && d.kind === "hypothesis") classes.push("hypothesis");
    if (r.type === "claim") classes.push(VERIFIED.has(d.status) ? "verified" : "unchecked");
    nodes.set(d.id, { data: { id: d.id, type: r.type, label: `${d.id} ${text(r)}`, state, path: r.path, fields: d }, classes: classes.join(" ") });
  }
  const node = (id, type, label, extra = {}) => { if (!nodes.has(id)) nodes.set(id, { data: { id, type, label, state: "", path: null, fields: {}, ...extra }, classes: type }); };
  const link = (r, field, rel, claimStatus) => {
    for (const tok of list(r.data[field])) {
      const [key, ...loc] = String(tok).trim().split(/\s+/);
      const bare = key.replace(/^@/, "");
      let target = byId.has(key) ? key : byKey.get(bare)?.data.id;
      if (!target && ext.has(bare)) { target = `ext:${bare}`; node(target, "external", bare); }
      if (!target) { dangling.push({ record: r.data.id, field, token: String(tok) }); continue; }
      const certainty = r.type === "claim" && VERIFIED.has(claimStatus) && (rel === "supports" || rel === "challenges") ? "verified" : "tentative";
      const id = `${r.data.id}|${rel}|${target}`;
      const e = edges.get(id) ?? { data: { id, source: r.data.id, target, rel, certainty, locators: [], declared_in: r.path, field }, classes: `${rel} ${certainty}` };
      if (loc.length) e.data.locators.push(loc.join(" "));
      edges.set(id, e);
    }
  };
  for (const r of recs) {
    if (!r.data.id) continue;
    if (r.type === "insight") { link(r, "sources", "lead"); link(r, "claims", "claim"); link(r, "related", "related"); }
    if (r.type === "claim") { link(r, "supports", "supports", r.data.status); link(r, "challenges", "challenges", r.data.status); }
    if (r.type !== "source") for (const q of list(r.data.rq)) {
      const id = `rq:${q}`;
      node(id, "rq", String(q));
      edges.set(`${r.data.id}|addresses|${id}`, { data: { id: `${r.data.id}|addresses|${id}`, source: r.data.id, target: id, rel: "addresses", certainty: "tentative", locators: [], declared_in: r.path, field: "rq" }, classes: "addresses tentative" });
    }
  }
  const byKeyId = (a, b) => (a.data.id < b.data.id ? -1 : a.data.id > b.data.id ? 1 : 0);
  dangling.sort((a, b) => (a.record + a.field + a.token).localeCompare(b.record + b.field + b.token));
  return { nodes: [...nodes.values()].sort(byKeyId), edges: [...edges.values()].sort(byKeyId), dangling, problems };
}

// Cytoscape stylesheet: tentative = dashed, verified = solid and thick, challenge = red, dash-dot, tee arrow
// (colour is never the only cue: dash pattern, width and arrow shape differ too).
const STYLE = [
  { selector: "node", style: { label: "data(label)", "text-wrap": "wrap", "text-max-width": "150px", "font-size": "10px", "text-valign": "center", color: "#111", "background-color": "#f2f2f2", "border-width": 1.5, "border-color": "#555", shape: "round-rectangle", width: "label", height: "label", padding: "8px" } },
  { selector: "node.insight", style: { shape: "round-tag", "background-color": "#e8eefc" } },
  { selector: "node.source", style: { shape: "barrel", "background-color": "#f7f0dc" } },
  { selector: "node.rq", style: { shape: "hexagon", "background-color": "#e6f4ea" } },
  { selector: "node.external", style: { shape: "rectangle", "border-style": "dotted", "background-color": "#ffffff" } },
  { selector: "node.hypothesis", style: { "border-style": "dashed" } },
  { selector: "node.claim.unchecked", style: { "border-style": "dashed" } },
  { selector: "edge", style: { width: 1.5, "curve-style": "bezier", "target-arrow-shape": "triangle", "line-color": "#6b7280", "target-arrow-color": "#6b7280", label: "data(label)", "font-size": "9px", "text-background-color": "#fff", "text-background-opacity": 0.9, "text-background-padding": "2px", "text-rotation": "autorotate" } },
  { selector: "edge.tentative", style: { "line-style": "dashed", "line-dash-pattern": [6, 4] } },
  { selector: "edge.verified", style: { "line-style": "solid", width: 3.5, "line-color": "#1b5e20", "target-arrow-color": "#1b5e20" } },
  { selector: "edge.challenges", style: { "line-color": "#b3261e", "target-arrow-color": "#b3261e", "target-arrow-shape": "tee", "line-style": "dashed", "line-dash-pattern": [12, 3, 2, 3] } },
  { selector: "edge.challenges.verified", style: { width: 3.5 } },
];

const edgeLabel = (e) => {
  const t = e.data.certainty === "tentative" && (e.data.rel === "supports" || e.data.rel === "challenges") ? "?" : "";
  return `${e.data.rel}${t}${e.data.locators.length ? " " + e.data.locators.join(", ") : ""}`;
};

function cytoscapeJson(g) {
  const edges = g.edges.map((e) => ({ ...e, data: { ...e.data, label: edgeLabel(e) } }));
  return {
    meta: { generator: "scholar-research evidence/scripts/graph.mjs", note: "Edges exist only where a record states the link. tentative = dashed, verified = solid (claim status claim-checked or approved-for-use), challenges = red dash-dot with tee arrow.", cytoscape: CYTOSCAPE, dangling: g.dangling, unreadable: g.problems },
    style: STYLE,
    elements: { nodes: g.nodes, edges },
  };
}

const mid = (id) => id.replace(/[^A-Za-z0-9]/g, "_");
function mermaid(g) {
  const lab = (s) => cut(s, 70).replace(/"/g, "#quot;").replace(/[<>]/g, "");
  const shape = { insight: ["([", "])"], claim: ["[", "]"], source: ["[(", ")]"], rq: ["{{", "}}"], external: ["[/", "/]"] };
  const L = ["%% Evidence map. Generated by graph.mjs from scholar/ records; edges exist only where a record states the link.",
    "%% Legend: solid arrow = verified (claim-checked or approved-for-use); dotted arrow = tentative; red dash-dot line with cross head = challenges.",
    "flowchart LR"];
  const ids = new Map(g.nodes.map((n) => [n.data.id, mid(n.data.id)]));
  for (const n of g.nodes) {
    const [a, b] = shape[n.data.type];
    const plain = n.data.type === "rq" || n.data.type === "external";
    const text = plain ? lab(n.data.label) : `${n.data.id}${n.data.state ? " (" + n.data.state + ")" : ""}<br/>${lab(n.data.label.slice(n.data.id.length + 1))}`;
    L.push(`  ${ids.get(n.data.id)}${a}"${text}"${b}`);
  }
  for (const n of g.nodes) for (const c of n.classes.split(" ")) if (["insight", "claim", "source", "rq", "external", "hypothesis", "unchecked"].includes(c)) L.push(`  class ${ids.get(n.data.id)} ${c}`);
  const idx = { verified: [], tentative: [], challenge: [] };
  const arrow = (e, i) => {
    const lbl = `|"${lab(edgeLabel(e))}"|`;
    if (e.data.rel === "challenges") { idx.challenge.push(i); return e.data.certainty === "verified" ? `--x${lbl}` : `-.-x${lbl}`; }
    if (e.data.certainty === "verified") { idx.verified.push(i); return `-->${lbl}`; }
    idx.tentative.push(i); return `-.->${lbl}`;
  };
  g.edges.forEach((e, i) => L.push(`  ${ids.get(e.data.source)} ${arrow(e, i)} ${ids.get(e.data.target)}`));
  const n = g.edges.length;
  L.push("  subgraph Legend");
  L.push('    LEG_A["verified claim"] -->|"supports"| LEG_B["source"]');
  L.push('    LEG_C["unchecked claim"] -.->|"supports?"| LEG_D["source"]');
  L.push('    LEG_E["claim"] -.-x|"challenges?"| LEG_F["source"]');
  L.push("  end");
  idx.verified.push(n); idx.tentative.push(n + 1); idx.challenge.push(n + 2);
  L.push("  classDef insight fill:#e8eefc,stroke:#446", "  classDef claim fill:#f2f2f2,stroke:#555", "  classDef source fill:#f7f0dc,stroke:#8a7a3c",
    "  classDef rq fill:#e6f4ea,stroke:#2e7d32", "  classDef external fill:#fff,stroke:#777,stroke-dasharray:2 2",
    "  classDef hypothesis stroke-dasharray:6 3,stroke-width:2px", "  classDef unchecked stroke-dasharray:6 3");
  if (idx.verified.length) L.push(`  linkStyle ${idx.verified.join(",")} stroke:#1b5e20,stroke-width:3px`);
  if (idx.tentative.length) L.push(`  linkStyle ${idx.tentative.join(",")} stroke:#6b7280,stroke-width:1.5px`);
  if (idx.challenge.length) L.push(`  linkStyle ${idx.challenge.join(",")} stroke:#b3261e,stroke-width:2px,stroke-dasharray:8 3 2 3`);
  for (const d of g.dangling) L.push(`%% dangling link not drawn: ${d.record} ${d.field} ${d.token.replace(/[\r\n]/g, " ")}`);
  return L.join("\n") + "\n";
}

function html(c) {
  const json = JSON.stringify({ elements: c.elements, style: c.style }).replace(/</g, "\\u003c");
  const rows = c.elements.edges.map((e) => `<tr><td>${esc(e.data.source)}</td><td>${esc(e.data.label)}</td><td>${esc(e.data.target)}</td><td>${esc(e.data.certainty)}</td><td>${esc(e.data.declared_in)}</td></tr>`).join("\n");
  const dang = c.meta.dangling.map((d) => `<li>${esc(d.record)} ${esc(d.field)}: ${esc(d.token)}</li>`).join("");
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Evidence map</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:16px;color:#111;background:#fff}
#cy{height:520px;border:1px solid #bbb} #info{border:1px solid #bbb;padding:8px;margin:8px 0;min-height:3em;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px}
table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #ccc;padding:2px 6px;text-align:left}
.leg span{display:inline-block;margin-right:16px}.leg svg{vertical-align:middle}
</style></head><body>
<h1>Evidence map</h1>
<p>Built only from links written in the records under <code>scholar/</code>. Dashed = tentative. Solid thick = verified (claim-checked or approved-for-use). Red dash-dot with a flat end = challenges. Click a node or edge for its record.</p>
<p class="leg"><span><svg width="50" height="10"><line x1="0" y1="5" x2="50" y2="5" stroke="#1b5e20" stroke-width="3.5"/></svg> verified</span>
<span><svg width="50" height="10"><line x1="0" y1="5" x2="50" y2="5" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="6 4"/></svg> tentative</span>
<span><svg width="50" height="10"><line x1="0" y1="5" x2="50" y2="5" stroke="#b3261e" stroke-width="2" stroke-dasharray="12 3 2 3"/></svg> challenges</span>
<span>dashed node border = hypothesis or unchecked claim</span></p>
<div id="cy" role="img" aria-label="Evidence network of insights, claims, sources and research questions. The same edges are listed in the table below."></div>
<div id="info" aria-live="polite">Select a node or edge.</div>
<h2>Edges (text equivalent)</h2>
<table><thead><tr><th>From</th><th>Relation</th><th>To</th><th>Certainty</th><th>Declared in</th></tr></thead><tbody>
${rows}
</tbody></table>
${dang ? `<h2>Dangling links (not drawn)</h2><ul>${dang}</ul>` : ""}
<script src="https://cdn.jsdelivr.net/npm/cytoscape@${CYTOSCAPE}/dist/cytoscape.min.js"></script>
<script id="graph" type="application/json">${json}</script>
<script>
const g = JSON.parse(document.getElementById("graph").textContent);
const cy = cytoscape({ container: document.getElementById("cy"), elements: g.elements, style: g.style, layout: { name: "cose", randomize: false, animate: false, nodeRepulsion: 40000 } });
const show = (ev) => { const d = ev.target.data(); document.getElementById("info").textContent = (d.path || d.declared_in ? "record: " + (d.path || d.declared_in) + "\\n" : "") + JSON.stringify(d.fields || d, null, 2); };
cy.on("tap", "node", show); cy.on("tap", "edge", show);
</script></body></html>
`;
}

const opt = parseArgs(process.argv.slice(2));
const root = resolve(typeof opt.root === "string" ? opt.root : process.cwd());
if (!existsSync(join(root, "scholar"))) { console.error(`graph: no scholar/ folder under ${root}`); process.exit(1); }
const outArg = typeof opt.out === "string" ? opt.out : "scholar/visuals/evidence-map";
const out = isAbsolute(outArg) ? outArg : join(root, outArg);
const g = buildGraph(root), c = cytoscapeJson(g);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(`${out}.cyto.json`, JSON.stringify(c, null, 2) + "\n");
writeFileSync(`${out}.mmd`, mermaid(g));
writeFileSync(`${out}.html`, html(c));
const n = (k) => g.edges.filter((e) => e.data.certainty === k).length;
console.log(`evidence map: ${g.nodes.length} nodes, ${g.edges.length} edges (${n("verified")} verified, ${n("tentative")} tentative, ${g.edges.filter((e) => e.data.rel === "challenges").length} challenges) -> ${posix(relative(root, out))}.{cyto.json,mmd,html}`);
for (const d of g.dangling) console.log(`WARN dangling link not drawn: ${d.record} ${d.field} ${d.token}`);
for (const p of g.problems) console.log(`WARN unreadable record skipped: ${p}`);
