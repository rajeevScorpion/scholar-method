#!/usr/bin/env node
// Prose linter for the Scholar writing profile. Report-only, zero dependencies.
// Usage: node lint-prose.mjs <files...> [--config scholar/scholar.json] [--json] [--strict]
// Skips (masked before any rule runs): YAML front matter, fenced and inline code, block quotes, double-quoted
// strings, Pandoc citations and cross-references, author-date citations, URLs, file paths, HTML comments,
// Quarto/Pandoc divs, attributes and shortcodes, math, link targets and the References/Bibliography section.
// Exit code: 0, or 1 with --strict when any non-advisory finding exists. Imports nothing from other skills.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const DEFAULTS = { no_dashes: true, no_oxford_comma: true, spelling: "indian", no_contractions: true, ai_register: true };

// ---------- args and config ----------
const argv = process.argv.slice(2), files = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--config") opt.config = argv[++i];
  else if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = true;
  else files.push(argv[i]);
}
if (!files.length) { console.error("usage: lint-prose.mjs <files...> [--config scholar/scholar.json] [--json] [--strict]"); process.exit(2); }

function findConfig() {
  if (opt.config) return resolve(opt.config);
  let d = resolve(dirname(files[0]));
  for (let i = 0; i < 8; i++, d = dirname(d)) if (existsSync(join(d, "scholar", "scholar.json"))) return join(d, "scholar", "scholar.json");
  return null;
}
let rules = { ...DEFAULTS };
const cfgPath = findConfig();
if (cfgPath) {
  try { rules = { ...DEFAULTS, ...(JSON.parse(readFileSync(cfgPath, "utf8")).writing ?? {}) }; }
  catch (e) { console.error(`lint-prose: cannot read ${cfgPath}: ${e.message}`); process.exit(2); }
}

// ---------- masking: same length, skipped regions become spaces, newlines stay ----------
function mask(text) {
  let t = text;
  const blank = (re) => { t = t.replace(re, (m) => m.replace(/[^\n]/g, " ")); };
  blank(/^---\n[\s\S]*?\n---(?=\n|$)/); // YAML front matter, only at the very top
  blank(/<!--[\s\S]*?-->/g);
  blank(/^(```|~~~)[^\n]*\n[\s\S]*?(?:\n\1[^\n]*|(?![\s\S]))/gm); // fenced code
  // References / Bibliography section: to the next heading of the same or higher level
  const lines = t.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(references|bibliography)\b/i);
    if (!h) continue;
    let j = i + 1;
    while (j < lines.length) { const n = lines[j].match(/^(#{1,6})\s/); if (n && n[1].length <= h[1].length) break; j++; }
    for (let k = i; k < j; k++) lines[k] = lines[k].replace(/[^\n]/g, " ");
  }
  t = lines.join("\n");
  t = t.split("\n").map((l) => (/^\s*(>|:::)/.test(l) ? l.replace(/[^\n]/g, " ") : l)).join("\n"); // block quotes, divs
  blank(/\{\{<[\s\S]*?>\}\}/g); // Quarto shortcodes
  blank(/\{[^{}\n]*\}/g); // attributes {#fig-a .class}
  blank(/(`+)[^`]*?\1/g); // inline code
  blank(/\$\$[\s\S]*?\$\$/g);
  blank(/(?<![\w$])\$(?=\S)[^$\n]*\S\$(?![\w$])/g);
  blank(/\]\([^)\n]*\)/g); // link and image targets
  blank(/<?(?:https?:\/\/|www\.)[^\s>)\]]+>?/g); // URLs
  blank(/[\w.+-]+@[\w-]+\.[\w.-]+/g); // emails
  blank(/\[[^\]]{0,400}?@[^\]]*?\]/g); // [@key, p. 3]
  blank(/(?<![\w])-?@[\w][\w:.#$%&\-+?<>~/]*/g); // @key, @fig-x
  blank(/\([^()]*[A-Z][^()]*\b\d{4}[a-z]?\b[^()]*\)/g); // (Smith, 2020; Rao and Iyer, 2021)
  blank(/\b[\w.–—-]+(?:[\\/][\w.–—-]+)+/g); // paths (also masks and/or)
  blank(/\b[\w-]+\.(?:md|qmd|bib|csv|json|png|jpe?g|svg|pdf|ya?ml|mjs|js|txt|docx|tex|html)\b/gi);
  blank(/"(?:(?!\n[ \t]*\n)[^"])*"/g); // "quoted strings" within a paragraph
  blank(/“[^”]{0,1500}”/g);
  return t;
}

// ---------- rule data ----------
const AI = [
  /\bdelv(?:e|es|ed|ing)\b/gi, /\blandscapes?\b/gi, /\brobust\b/gi, /\bpivotal\b/gi, /\btransformative\b/gi,
  /\bit is (?:important|worth) to note\b/gi, /\bin conclusion\b/gi, /\btapestry\b/gi, /\bmultifaceted\b/gi,
  /\bplays? an? (?:crucial|vital|key|pivotal) role\b/gi, /\bever-evolving\b/gi, /\bshed(?:s|ding)? light on\b/gi,
  /\bunderscor(?:e|es|ed|ing)\b/gi, /\bleverag(?:e|es|ed|ing)\b/gi,
];
const Z = "analyz organiz recogniz realiz emphasiz summariz utiliz prioritiz minimiz maximiz categoriz characteriz conceptualiz generaliz hypothesiz standardiz normaliz visualiz optimiz synthesiz theoriz criticiz operationaliz formaliz customiz finaliz stabiliz mobiliz centraliz digitiz authoriz capitaliz internaliz institutionaliz legitimiz rationaliz socializ specializ harmoniz globaliz localiz personaliz commercializ contextualiz problematiz".split(" ");
const Zs = Z.map((z) => z.slice(0, -1) + "s");
const SUFFIX = "(e|es|ed|ing|ation|ations|er|ers)";
const OUR = "colo|favo|behavio|hono|labo|neighbo|humo|rumo|flavo|harbo|endeavo";
const OUR_SUF = "(s|ed|ing|ite|ites|able|al|hood|ful|less)?";
const LL = "model|label|travel|cancel|fuel|signal";
// Each family: [US regex, US -> Indian/British, British regex, British -> US]. Ambiguous words (program, license) are left out.
const FAM = [
  [new RegExp(`\\b(${Z.join("|")})${SUFFIX}\\b`, "gi"), (m, x, y) => x.slice(0, -1) + "s" + y,
    new RegExp(`\\b(${Zs.join("|")})${SUFFIX}\\b`, "gi"), (m, x, y) => x.slice(0, -1) + "z" + y],
  [new RegExp(`\\b(${OUR})r${OUR_SUF}\\b`, "gi"), (m, x, y = "") => x + "ur" + y,
    new RegExp(`\\b(${OUR})ur${OUR_SUF}\\b`, "gi"), (m, x, y = "") => x + "r" + y],
  [/\b(cent|fib|theat)er(s)?\b/gi, (m, x, y = "") => x + "re" + y, /\b(cent|fib|theat)re(s)?\b/gi, (m, x, y = "") => x + "er" + y],
  [/\b(defen|offen)se(s)?\b/gi, (m, x, y = "") => x + "ce" + y, /\b(defen|offen)ce(s)?\b/gi, (m, x, y = "") => x + "se" + y],
  [new RegExp(`\\b(${LL})(ed|ing|er|ers)\\b`, "gi"), (m, x, y) => x + "l" + y, new RegExp(`\\b(${LL})l(ed|ing|er|ers)\\b`, "gi"), (m, x, y) => x + y],
  [/\bcatalog(s|ed|ing)?\b/gi, (m, y = "") => "catalogue" + y, /\bcatalogue(s|d)?\b/gi, (m, y = "") => "catalog" + y],
  [/\bgray\b/gi, () => "grey", /\bgrey\b/gi, () => "gray"],
  [/\bskeptic(s|al)?\b/gi, (m, y = "") => "sceptic" + y, /\bsceptic(s|al)?\b/gi, (m, y = "") => "skeptic" + y],
  [/\bfulfill(s|ed|ing)?\b/gi, (m, y = "") => "fulfil" + y, /\bfulfil(s|led|ling)?\b/gi, (m, y = "") => "fulfill" + y],
  [/\benrollments?\b/gi, () => "enrolment", /\benrolments?\b/gi, () => "enrollment"],
];
const CONTR = [
  /\b\w+n['’]t\b/gi,
  /\b(?:I|we|you|they|he|she|it|that|there|who|what)['’](?:ll|re|ve|d|m)\b/gi,
  /\b(?:it|that|there|here|what|who|he|she|let|where|how)['’]s\b/gi,
];
const STOP_AFTER = /^(?:we|they|it|he|she|i|you|this|that|these|those|there|which|who|but|so)\b/i;
const SUB = /^(?:although|when|if|because|while|since|as|after|before|once|unless|whereas)\b/i;
const VERB = /\b(?:is|are|was|were|has|have|had|will|would|can|could|should|may|might|did|do|does|been|being)\b/i;
const BOUNDARY = /[.!?;:](?=\s)|[—–]|\n[ \t]*\n|\n(?=[ \t]*(?:#|[-*+]\s|\d+[.)]\s|\|))/g;

// ---------- lint ----------
function lint(file) {
  const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const t = mask(raw), out = [];
  const starts = [0];
  for (let i = 0; i < raw.length; i++) if (raw[i] === "\n") starts.push(i + 1);
  const pos = (o) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= o) lo = m; else hi = m - 1; } return { line: lo + 1, col: o - starts[lo] + 1 }; };
  const add = (o, len, rule, severity, msg) => {
    const p = pos(o), ls = starts[p.line - 1], le = raw.indexOf("\n", ls);
    const lineText = raw.slice(ls, le < 0 ? raw.length : le);
    const from = Math.max(0, p.col - 1 - 25);
    out.push({ file, ...p, rule, severity, message: msg, excerpt: lineText.slice(from, p.col - 1 + Math.max(len, 1) + 25).trim() });
  };
  const each = (re, fn) => { re.lastIndex = 0; for (const m of t.matchAll(re)) fn(m); };
  const segments = () => {
    const b = [0];
    for (const m of t.matchAll(BOUNDARY)) b.push(m.index + 1);
    b.push(t.length);
    return b.slice(0, -1).map((s, i) => [s, t.slice(s, b[i + 1])]);
  };

  if (rules.no_dashes) {
    each(/—/g, (m) => add(m.index, 1, "em-dash", "error", "em dash: rewrite with a comma, colon, brackets or a new sentence"));
    each(/–/g, (m) => {
      if (/\d/.test(t[m.index - 1] ?? "") && /\d/.test(t[m.index + 1] ?? "")) add(m.index, 1, "range-dash", "error", "range: use hyphen or 'to'");
      else add(m.index, 1, "en-dash", "error", "en dash: use a hyphen for compounds or rewrite");
    });
    each(/(?<=\s)--(?=\s)|(?<=\w)--(?=\w)/g, (m) => add(m.index, 2, "double-hyphen", "error", "'--' used as a dash: rewrite"));
  }
  if (rules.no_contractions) for (const re of CONTR) each(re, (m) => add(m.index, m[0].length, "contraction", "error", `contraction "${m[0]}": write it out in formal prose`));
  if (rules.spelling === "indian" || rules.spelling === "us") {
    const us = rules.spelling === "us";
    for (const f of FAM) each(us ? f[2] : f[0], (m) => {
      const before = t.slice(0, m.index).match(/([A-Za-z]+)\s+$/)?.[1] ?? "", after = t.slice(m.index + m[0].length).match(/^\s+([A-Za-z]+)/)?.[1] ?? "";
      const cap = (w) => /^[A-Z]/.test(w);
      if (cap(m[0]) && (cap(before) || cap(after) || (before && !/[.!?:]\s*$/.test(t.slice(0, m.index))))) return; // part of a proper name, for example "International Organization"
      add(m.index, m[0].length, us ? "uk-spelling" : "us-spelling", "error", `${us ? "British" : "US"} spelling "${m[0]}": use "${(us ? f[3] : f[1])(...m)}"`);
    });
  }
  if (rules.ai_register) for (const re of AI) each(re, (m) => add(m.index, m[0].length, "ai-register", "advisory", `generic AI register "${m[0]}": keep only if it carries meaning`));

  // Lists of three or more: "A, B, and C" (Oxford) or "A, B and C" (serial comma missing). Heuristic, so "likely".
  if (rules.no_oxford_comma || rules.serial_comma) {
    for (const [base, seg] of segments()) {
      const wc = (s) => s.trim().split(/\s+/).filter(Boolean).length;
      // items before the conjunction must be short phrases; with two pieces the first one still holds the sentence lead
      const itemsOk = (pieces) => { const p = pieces.map((x) => x.trim()), it = p.length === 2 ? [p[1]] : p.slice(-2); return p.length >= 2 && !SUB.test(p[0]) && it.every((x) => x && wc(x) <= 4 && !STOP_AFTER.test(x) && !/\b(?:and|or)\b/i.test(x)); };
      if (rules.no_oxford_comma) for (const m of seg.matchAll(/,\s+(and|or)\s+/g)) {
        const pieces = seg.slice(0, m.index).split(",");
        const after = seg.slice(m.index + m[0].length).split(/[,;]/)[0].split(VERB)[0].trim();
        if (!itemsOk(pieces)) continue;
        if (!after || wc(after) > 4 || STOP_AFTER.test(after)) continue;
        add(base + m.index, 1, "oxford-comma", "likely", `likely Oxford comma before "${m[1]}": remove it unless it prevents ambiguity`);
      }
      if (rules.serial_comma) for (const m of seg.matchAll(/(?<=[^,\s])\s+(and|or)\s+/g)) {
        const pieces = seg.slice(0, m.index).split(",");
        const after = seg.slice(m.index + m[0].length).split(/[,;]/)[0].split(VERB)[0].trim();
        if (!itemsOk(pieces)) continue;
        if (!after || wc(after) > 4 || STOP_AFTER.test(after)) continue;
        add(base + m.index, 1, "missing-serial-comma", "likely", `likely missing serial comma before "${m[1]}": this venue requires it`);
      }
    }
  }
  return out.sort((a, b) => a.line - b.line || a.col - b.col);
}

const findings = [];
for (const f of files) {
  if (!existsSync(f)) { console.error(`lint-prose: no such file ${f}`); process.exit(2); }
  findings.push(...lint(f));
}
if (opt.json) console.log(JSON.stringify(findings, null, 2));
else {
  for (const f of findings) console.log(`${f.file}:${f.line}:${f.col} ${f.rule} [${f.severity}] ${f.message} | ${f.excerpt}`);
  const hard = findings.filter((f) => f.severity !== "advisory").length;
  console.log(`${files.length} file(s): ${hard} finding(s), ${findings.length - hard} advisory.`);
}
process.exitCode = opt.strict && findings.some((f) => f.severity !== "advisory") ? 1 : 0;
