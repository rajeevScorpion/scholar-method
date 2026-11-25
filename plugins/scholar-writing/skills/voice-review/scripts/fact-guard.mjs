#!/usr/bin/env node
// Editorial guard: compares the protected items of a text before and after an editing pass (Humanizer or by hand).
// Usage: node fact-guard.mjs <before> <after> [--config scholar/scholar.json] [--json] [--strict]
// Protected: numbers (decimals, percentages, years), Pandoc citekeys, author-date citations, quoted passages and
// block quotes, DOIs and URLs, capitalised multi-word names, and scholar.json writing.protected_terms.
// Report-only. Exit code 0, or 1 with --strict when anything was lost, added or altered. Zero dependencies.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2), pos = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--config") opt.config = argv[++i];
  else if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = true;
  else pos.push(argv[i]);
}
if (pos.length !== 2) { console.error("usage: fact-guard.mjs <before> <after> [--config scholar/scholar.json] [--json] [--strict]"); process.exit(2); }

let terms = [];
{
  let p = opt.config ? resolve(opt.config) : null;
  if (!p) { let d = resolve(dirname(pos[0])); for (let i = 0; i < 8 && !p; i++, d = dirname(d)) if (existsSync(join(d, "scholar", "scholar.json"))) p = join(d, "scholar", "scholar.json"); }
  if (p && existsSync(p)) { try { terms = JSON.parse(readFileSync(p, "utf8")).writing?.protected_terms ?? []; } catch { /* ignore a bad config */ } }
}

const STOP = new Set("In The This These Those However Moreover Thus Although While When For As At On By With We They It A An Such Our Their Here There Then Also Yet But And Or If Both Each Some Many Most One Two Three First Second Finally Overall Instead Hence Therefore Because Since After Before During Under Over Between Among From To Of Its His Her Whether Where What Which Who How Why Not No Any All".split(" "));
const hole = (s, i, j) => s.slice(0, i) + s.slice(i, j).replace(/[^\n]/g, " ") + s.slice(j);

function extract(raw) {
  let t = raw.replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---(?=\n|$)/, (m) => m.replace(/[^\n]/g, " "));
  const items = { numbers: [], citekeys: [], citations: [], quotes: [], links: [], names: [], terms: [] };
  const take = (re, cat, norm = (m) => m[0]) => {
    for (const m of [...t.matchAll(re)]) { const v = norm(m); if (v) items[cat].push(v); t = hole(t, m.index, m.index + m[0].length); }
  };
  take(/10\.\d{4,9}\/[^\s"”<>)\]]+/g, "links", (m) => m[0].replace(/[.,;:]+$/, ""));
  take(/https?:\/\/[^\s<>)\]"”]+/g, "links", (m) => m[0].replace(/[.,;:]+$/, ""));
  for (const term of terms) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    items.terms.push(...[...t.matchAll(re)].map(() => term));
  }
  take(/^[ \t]*>[^\n]*(?:\n[ \t]*>[^\n]*)*/gm, "quotes", (m) => "(block) " + m[0].replace(/^[ \t]*>[ \t]?/gm, "").replace(/\s+/g, " ").trim());
  take(/"(?:(?!\n[ \t]*\n)[^"])+"|“[^”]+”/g, "quotes", (m) => m[0].replace(/\s+/g, " "));
  take(/(?<![\w.])-?@([\w][\w:.#$%&\-+?<>~/]*)/g, "citekeys", (m) => "@" + m[1].replace(/[.:;,?]+$/, ""));
  take(/[A-Z][\p{L}'’-]+(?:\s+et al\.|\s+(?:and|&)\s+[A-Z][\p{L}'’-]+)?,?\s+\(?(?:19|20)\d\d[a-z]?\)?/gu, "citations",
    (m) => m[0].replace(/[(),]/g, "").replace(/\s*&\s*/g, " and ").replace(/\s+/g, " "));
  t = t.replace(/^[ \t]*\d+[.)][ \t]/gm, (m) => " ".repeat(m.length)); // list numbering is not a finding
  take(/(?<![\w.])\d[\d,]*(?:\.\d+)?(?:\s?(?:%|per\s?cent))?/g, "numbers", (m) => m[0].replace(/,/g, "").replace(/\s?(?:%|per\s?cent)/, "%"));
  // Names: capitalised words in a row, leading sentence openers dropped, so "In India" is not a name.
  const names = new Set();
  for (const m of t.matchAll(/\b[A-Z][\p{L}'’-]+(?:[ \t]+(?:(?:of|de|del|van|von|da|la|the)[ \t]+)?[A-Z][\p{L}'’-]+)+/gu)) {
    let w = m[0].split(/\s+/);
    while (w.length && STOP.has(w[0])) w.shift();
    if (w.length >= 2) names.add(w.join(" "));
  }
  items.names = [...names];
  return items;
}

const multi = (a) => { const m = new Map(); for (const x of a) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const diff = (a, b) => {
  const ma = multi(a), mb = multi(b), lost = [], added = [];
  for (const [k, n] of ma) for (let i = 0; i < n - (mb.get(k) ?? 0); i++) lost.push(k);
  for (const [k, n] of mb) for (let i = 0; i < n - (ma.get(k) ?? 0); i++) added.push(k);
  return { lost, added };
};

const A = extract(readFileSync(pos[0], "utf8")), B = extract(readFileSync(pos[1], "utf8"));
const report = {};
let total = 0;
for (const cat of Object.keys(A)) {
  const d = diff(A[cat], B[cat]);
  const altered = d.lost.length && d.added.length ? d.lost.slice(0, d.added.length).map((l, i) => [l, d.added[i]]) : [];
  report[cat] = { lost: d.lost, added: d.added, altered };
  total += d.lost.length + d.added.length;
}
if (opt.json) console.log(JSON.stringify({ ok: total === 0, report }, null, 2));
else {
  for (const [cat, r] of Object.entries(report)) {
    for (const l of r.lost) console.log(`LOST    ${cat}: ${l}`);
    for (const a of r.added) console.log(`ADDED   ${cat}: ${a}`);
    for (const [l, a] of r.altered) console.log(`ALTERED ${cat}: ${l}  ->  ${a}  (possible)`);
  }
  console.log(total ? `${total} protected change(s). Reject or justify each one.` : "No protected changes.");
}
process.exitCode = opt.strict && total ? 1 : 0;
