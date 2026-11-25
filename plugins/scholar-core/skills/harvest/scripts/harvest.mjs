#!/usr/bin/env node
// Scholar Method harvest: new, check, approve, decline, list, bundle, promote. Zero dependencies, self-contained.
// Every command takes --root <project> (default: git top-level or cwd). It never pushes and never adds a remote.
// Usage: node harvest.mjs <new|check|approve|decline|list|bundle|promote> [options]   (no arguments: help)
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORIES = ["rule", "skill-fix", "new-skill", "research-gotcha", "template"];
const STATE_KEYS = ["privacy_review", "privacy_hash", "review_status", "owner_approval", "upstream_status"]; // excluded from the text hash
const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..", "references", "proposal-template.md");

const today = () => new Date().toLocaleDateString("en-CA");
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const q = (s) => JSON.stringify(String(s));
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lf = (s) => s.replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha1").update(s).digest("hex");
const die = (m, code = 1) => { console.error(`harvest: ${m}`); process.exit(code); };

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) { const n = argv[i + 1]; if (n === undefined || n.startsWith("--")) opt[a.slice(2)] = true; else { opt[a.slice(2)] = n; i++; } }
    else pos.push(a);
  }
  return { pos, opt };
}
function findRoot(opt) {
  if (typeof opt.root === "string") return resolve(opt.root);
  try { return resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()); } catch { return process.cwd(); }
}
const git = (cwd, ...a) => execFileSync("git", a, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

// ---------- proposal files ----------
function fm(text) {
  const m = lf(text).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const d = {};
  for (const line of m[1].split("\n")) {
    const k = line.match(/^([A-Za-z_]\w*):\s*(.*)$/);
    if (!k) continue;
    let v = k[2].trim();
    if (v.startsWith('"')) { try { v = JSON.parse(v); } catch { /* keep raw */ } }
    d[k[1]] = v;
  }
  return d;
}
const setField = (text, key, val) => lf(text).replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${val}`);
const textHash = (text) => sha(lf(text).split("\n").filter((l) => !STATE_KEYS.some((k) => l.startsWith(k + ":"))).join("\n"));

const pendingDir = (root) => join(root, "scholar", "harvest", "pending");
const declinedFile = (root) => join(root, "scholar", "harvest", "declined.md");
function pending(root) {
  const dir = pendingDir(root);
  return (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith(".md")).sort() : []).map((f) => {
    const path = join(dir, f), text = readFileSync(path, "utf8");
    return { id: f.slice(0, -3), file: f, path, text, d: fm(text) ?? {} };
  });
}
function declined(root) {
  const f = declinedFile(root);
  if (!existsSync(f)) return [];
  return lf(readFileSync(f, "utf8")).split("\n").filter((l) => l.startsWith("- ")).map((l) => {
    const p = l.slice(2).split(" | ").map((s) => s.trim());
    return p.length >= 4 ? { date: p[0], id: p[1], title: p[2], reason: p.slice(3).join(" | ") } : { date: "", id: "", title: p[0], reason: p.slice(1).join(" | ") };
  });
}
function resolveId(root, key) {
  if (!key) die("give a proposal id (or a unique part of it)", 2);
  const all = pending(root), hit = all.filter((p) => p.id === key);
  const c = hit.length ? hit : all.filter((p) => p.id.includes(key));
  if (c.length !== 1) die(c.length ? `"${key}" matches ${c.length} proposals: ${c.map((p) => p.id).join(", ")}` : `no pending proposal matches "${key}"`);
  return c[0];
}

// ---------- privacy scan ----------
const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
function textFilesUnder(root, rel) {
  const out = [];
  if (!rel || !existsSync(join(root, rel))) return out;
  const start = join(root, rel);
  (function rec(p, depth) {
    let st; try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) { if (depth < 6) for (const n of readdirSync(p)) if (!n.startsWith(".") && n !== "node_modules") rec(join(p, n), depth + 1); }
    else if ([".md", ".qmd", ".tex", ".txt", ".rmd"].includes(extname(p).toLowerCase()) && st.size < 5e6 && out.length < 800) out.push(p);
  })(start, 0);
  return out;
}
function projectFacts(root, cfg) {
  const ids = new Set((cfg?.external_ids ?? []).map((s) => String(s).replace(/^@/, "")));
  for (const dir of ["insights", "claims", "sources", "visuals"]) {
    const d = join(root, "scholar", dir);
    for (const f of existsSync(d) ? readdirSync(d) : []) {
      if (!f.endsWith(".md")) continue;
      ids.add(f.slice(0, -3));
      const ck = fm(readFileSync(join(d, f), "utf8"))?.citekey;
      if (ck) ids.add(ck);
    }
  }
  const bib = cfg?.paths?.bib && join(root, cfg.paths.bib);
  if (bib && existsSync(bib)) for (const m of readFileSync(bib, "utf8").matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)) ids.add(m[1]);
  const reg = cfg?.paths?.sources && join(root, cfg.paths.sources);
  if (reg && existsSync(reg) && statSync(reg).isFile()) for (const m of readFileSync(reg, "utf8").matchAll(/\b[A-Z]{1,6}-\d{2,}\b/g)) ids.add(m[0]);
  ids.delete("");
  // manuscript and record text for overlap: mapped drafts plus the scholar's own insights and claims
  const shingles = new Set();
  const files = [...textFilesUnder(root, cfg?.paths?.drafts), ...textFilesUnder(root, "scholar/insights"), ...textFilesUnder(root, "scholar/claims")];
  for (const f of files) { const w = words(readFileSync(f, "utf8")); for (let i = 0; i + 8 <= w.length; i++) shingles.add(w.slice(i, i + 8).join(" ")); }
  return { ids, shingles, nfiles: files.length };
}

function scan(root, text, cfg, facts = projectFacts(root, cfg)) {
  const hits = [];
  const hit = (level, rule, line, msg, ex = "") => hits.push({ level, rule, line, msg, ex: ex.length > 60 ? ex.slice(0, 57) + "..." : ex });
  const lines = lf(text).split("\n").map((l) => (l.startsWith("privacy_hash:") ? "" : l));
  const allow = (cfg?.harvest?.allow_domains ?? []).map((s) => String(s).toLowerCase());
  const deny = (cfg?.harvest?.deny_terms ?? []).filter(Boolean);
  const denyRe = deny.map((t) => [t, new RegExp(String.raw`(?<![\p{L}\p{N}])${esc(t)}(?![\p{L}\p{N}])`, "iu")]);
  const idRe = [...facts.ids].filter((i) => i.length >= 4).map((i) => [i, new RegExp(String.raw`(?<![\w-])@?${esc(i)}(?![\w-])`)]);
  let quoteRun = 0, quoteStart = 0;
  lines.forEach((l, i) => {
    const n = i + 1;
    for (const m of l.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) hit("block", "email", n, "email address", m[0]);
    for (const m of l.matchAll(/(?<![\w.-])\+?\d[\d ()\-.]{7,}\d(?![\w-])/g)) {
      const digits = m[0].replace(/\D/g, "").length;
      if (digits >= 9 && digits <= 15 && !/^\d{4}-\d{2}-\d{2}$/.test(m[0])) hit("block", "phone", n, "phone-like number", m[0]);
    }
    for (const m of l.matchAll(/(?<![A-Za-z])[A-Za-z]:[\\/][^\s"'`<>|]+|\\\\[\w.$-]+\\[^\s"'`]+|(?<![\w.:])(?:~|\/(?:Users|home|mnt|c|d))\/[^\s"'`]*/g)) hit("block", "local-path", n, "absolute local path", m[0]);
    for (const m of l.matchAll(/https?:\/\/[^\s)>\]"'`]+/g)) {
      let host = ""; try { host = new URL(m[0]).hostname.toLowerCase(); } catch { /* malformed */ }
      if (allow.some((a) => host === a || host.endsWith("." + a))) continue;
      hit(allow.length ? "block" : "advisory", "url", n, allow.length ? "URL not on harvest.allow_domains" : "URL (no harvest.allow_domains set; a link can identify a source)", m[0]);
    }
    for (const m of l.matchAll(/\b10\.\d{4,9}\/[^\s"<>)]+/g)) hit("advisory", "doi", n, "DOI (may reveal a source)", m[0]);
    for (const m of l.matchAll(/"([^"\n]+)"|“([^”]+)”/g)) { const c = (m[1] ?? m[2]).split(/\s+/).filter(Boolean).length; if (c > 25) hit("block", "long-quote", n, `quoted passage of ${c} words (limit 25)`, m[0]); }
    if (l.startsWith(">")) { if (!quoteRun) quoteStart = n; quoteRun += l.split(/\s+/).filter((w) => w && w !== ">").length; }
    else { if (quoteRun > 25) hit("block", "long-quote", quoteStart, `block quote of ${quoteRun} words (limit 25)`); quoteRun = 0; }
    for (const [t, re] of denyRe) if (re.test(l)) hit("block", "deny-term", n, `project term "${t}" (harvest.deny_terms)`);
    for (const [id, re] of idRe) if (re.test(l)) hit("block", "project-id", n, `identifier from this project's records: ${id}`);
  });
  if (quoteRun > 25) hit("block", "long-quote", quoteStart, `block quote of ${quoteRun} words (limit 25)`);
  const body = lines.join("\n").split("\n");
  body.forEach((l, i) => {
    const w = words(l);
    for (let j = 0; j + 8 <= w.length; j++) { const s = w.slice(j, j + 8).join(" "); if (facts.shingles.has(s)) { hit("block", "manuscript-overlap", i + 1, "8 or more consecutive words match this project's drafts or records", s); break; } }
  });
  return hits;
}

function report(label, hits) {
  for (const h of hits) console.log(`${label}:${h.line} ${h.rule} [${h.level === "block" ? "BLOCK" : "advisory"}] ${h.msg}${h.ex ? ` | ${h.ex}` : ""}`);
  return hits.filter((h) => h.level === "block").length;
}

// A proposal may leave the project only when text is unchanged since a passed check, a human approved it, and a fresh scan is clean.
function gate(root, p, cfg, facts) {
  const d = p.d, why = [];
  if (d.owner_approval !== "yes") why.push(`owner_approval is "${d.owner_approval}", needs "yes"`);
  if (d.privacy_review !== "passed") why.push(`privacy_review is "${d.privacy_review}", needs "passed"`);
  else if (d.privacy_hash !== textHash(p.text)) why.push("the text changed after the privacy check passed; run check --pass again");
  const blocks = scan(root, p.text, cfg, facts).filter((h) => h.level === "block");
  if (blocks.length) why.push(`privacy scan now finds ${blocks.length} blocking hit(s): run check ${p.id}`);
  return why;
}

// ---------- commands ----------
function cmdNew(opt, root) {
  const need = ["title", "category", "target"];
  for (const k of need) if (typeof opt[k] !== "string" || !opt[k].trim()) die(`new needs --${k}`, 2);
  if (!CATEGORIES.includes(opt.category)) die(`--category must be one of ${CATEGORIES.join(", ")}`, 2);
  const target = opt.target.trim().replaceAll("\\", "/");
  if (isAbsolute(target) || /^[A-Za-z]:/.test(target) || target.split("/").includes("..")) die("--target is a path inside the method repo, relative (for example plugins/scholar-core/skills/harvest)", 2);
  const nt = norm(opt.title);
  const dec = declined(root).find((x) => norm(x.title) === nt);
  if (dec) die(`already declined on ${dec.date || "an earlier date"} (${dec.reason}); not creating it again.`);
  const dup = pending(root).find((p) => norm(p.d.title ?? "") === nt);
  if (dup) die(`a pending proposal with this title exists: ${dup.id}`);
  const date = typeof opt.date === "string" ? opt.date : today();
  const slug = nt.split(" ").slice(0, 6).join("-").slice(0, 50).replace(/-+$/, "") || "proposal";
  const id = `HRV-${date}-${slug}`;
  const path = join(pendingDir(root), `${id}.md`);
  if (existsSync(path)) die(`${id} already exists`);
  const v = { proposal_id: id, created: date, title: q(opt.title.trim()), title_plain: opt.title.trim(), source_project: q(typeof opt["source-project"] === "string" ? opt["source-project"] : "generic"), category: opt.category,
    problem: q(opt.problem ?? ""), observed_solution: q(opt.solution ?? ""), generalisability: q(opt.generalisability ?? ""), evidence_or_test: q(opt.evidence ?? ""), proposed_target: q(target) };
  const text = lf(readFileSync(TEMPLATE, "utf8")).replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? "");
  mkdirSync(pendingDir(root), { recursive: true });
  writeFileSync(path, text, { flag: "wx" });
  console.log(`${id} ${relative(root, path).replaceAll("\\", "/")}`);
  return 0;
}

function cmdCheck(pos, opt, root) {
  const cfg = readJson(join(root, "scholar", "scholar.json"));
  const targets = pos.length ? pos.map((f) => (existsSync(resolve(f)) ? { path: resolve(f), id: basename(f, ".md") } : resolveId(root, f))) : pending(root);
  if (!targets.length) { console.log("No pending proposals."); return 0; }
  const facts = projectFacts(root, cfg);
  let blocked = 0;
  for (const t of targets) {
    const text = readFileSync(t.path, "utf8"), hits = scan(root, text, cfg, facts);
    const nb = report(t.id, hits), na = hits.length - nb;
    blocked += nb;
    console.log(`${t.id}: ${nb} blocking, ${na} advisory`);
    if (opt.pass) {
      if (nb) { console.log("  not marked passed: fix the blocking hits first."); continue; }
      if (na && !opt["accept-advisory"]) { console.log("  not marked passed: advisory hits need the scholar's yes (rerun with --accept-advisory)."); blocked++; continue; }
      let out = setField(text, "privacy_review", "passed");
      out = setField(out, "privacy_hash", q(textHash(out)));
      writeFileSync(t.path, out);
      console.log("  privacy_review: passed (recorded with a hash of the text; any later edit invalidates it)");
    }
  }
  return blocked ? 1 : 0;
}

function cmdApprove(pos, root) {
  const p = resolveId(root, pos[1]), cfg = readJson(join(root, "scholar", "scholar.json"));
  if (p.d.privacy_review !== "passed" || p.d.privacy_hash !== textHash(p.text)) die("privacy_review must be passed for the current text first (check --pass)");
  if (scan(root, p.text, cfg).some((h) => h.level === "block")) die("the privacy scan now has blocking hits; run check");
  writeFileSync(p.path, setField(setField(p.text, "owner_approval", "yes"), "review_status", "accepted"));
  console.log(`${p.id}: owner_approval yes. Nothing has left the project yet.`);
  return 0;
}

function cmdDecline(pos, opt, root) {
  if (typeof opt.reason !== "string" || !opt.reason.trim()) die('decline needs --reason "..."', 2);
  let id = "-", title = opt.title, p = null;
  if (pos[1]) { p = resolveId(root, pos[1]); id = p.id; title = p.d.title || p.id; }
  if (typeof title !== "string" || !title.trim()) die("decline needs a proposal id or --title for a candidate with no file", 2);
  const f = declinedFile(root);
  mkdirSync(dirname(f), { recursive: true });
  if (!existsSync(f)) writeFileSync(f, "# Declined harvest candidates\n\nOne line each: date | id | title | reason. Declined items are not offered again.\n");
  appendFileSync(f, `${readFileSync(f, "utf8").endsWith("\n") ? "" : "\n"}- ${today()} | ${id} | ${title.trim()} | ${opt.reason.trim().replace(/\s+/g, " ")}\n`);
  if (p) unlinkSync(p.path);
  console.log(`declined: ${title.trim()}${p ? ` (removed ${p.file})` : ""}`);
  return 0;
}

function cmdList(opt, root) {
  const pend = pending(root).map((p) => ({ id: p.id, title: p.d.title ?? "", category: p.d.category, privacy_review: p.d.privacy_review, owner_approval: p.d.owner_approval, upstream_status: p.d.upstream_status }));
  const dec = declined(root);
  if (opt.json) { console.log(JSON.stringify({ pending: pend, declined: dec }, null, 2)); return 0; }
  console.log(`Pending (${pend.length}):`);
  for (const p of pend) console.log(`  ${p.id}  "${p.title}"  privacy ${p.privacy_review}, approval ${p.owner_approval}, upstream ${p.upstream_status}`);
  console.log(`Declined, do not offer again (${dec.length}):`);
  for (const d of dec) console.log(`  ${d.date} "${d.title}": ${d.reason}`);
  return 0;
}

function approved(root, ids, cfg) {
  const facts = projectFacts(root, cfg);
  const list = ids.length ? ids.map((k) => resolveId(root, k)) : pending(root).filter((p) => p.d.owner_approval === "yes");
  if (!list.length) die("no approved proposals to export");
  const bad = list.map((p) => [p, gate(root, p, cfg, facts)]).filter(([, w]) => w.length);
  if (bad.length) { for (const [p, w] of bad) console.error(`harvest: refusing ${p.id}: ${w.join("; ")}`); process.exit(1); }
  return list;
}

function cmdBundle(pos, opt, root) {
  if (typeof opt.out !== "string") die("bundle needs --out <file>", 2);
  const cfg = readJson(join(root, "scholar", "scholar.json")), list = approved(root, pos.slice(1), cfg);
  const head = `# Scholar Method harvest bundle

Generated ${today()}: ${list.length} proposal(s), each approved by its scholar and privacy-checked. Text only; it contains no project records.

For the maintainer: this file is a contribution, not a change. For each section below, copy it to \`harvest-inbox/<proposal_id>.md\`
in a checkout of the Scholar Method repo (or open it with the \`forge\` skill), review it, apply it to the right pack by hand,
bump versions, run the checks and delete the inbox file. Nothing here has been applied, pushed or published.

For the contributor: attach this file to an issue or a pull request from your fork. Installing the method never grants write access.
`;
  const body = list.map((p) => `\n<!-- harvest-proposal: ${p.id} -->\n\n${lf(p.text).trimEnd()}\n\n<!-- end-proposal: ${p.id} -->\n`).join("");
  mkdirSync(dirname(resolve(opt.out)), { recursive: true });
  writeFileSync(resolve(opt.out), head + body);
  for (const p of list) writeFileSync(p.path, setField(p.text, "upstream_status", "bundle-exported"));
  console.log(`Bundle written: ${resolve(opt.out)} (${list.map((p) => p.id).join(", ")}). Nothing was sent anywhere.`);
  return 0;
}

function cmdPromote(pos, opt, root) {
  if (typeof opt.method !== "string") die("promote needs --method <path to a local Scholar Method checkout>", 2);
  const cfg = readJson(join(root, "scholar", "scholar.json")), [p] = approved(root, [pos[1]], cfg);
  const m = resolve(opt.method), mk = readJson(join(m, ".claude-plugin", "marketplace.json"));
  if (!existsSync(join(m, ".git"))) die(`${m} is not a git checkout`);
  if (mk?.name !== "scholar-method") die(`${m} is not a Scholar Method checkout (.claude-plugin/marketplace.json name must be "scholar-method")`);
  if (git(m, "status", "--porcelain")) die(`${m} has uncommitted changes; commit or stash them there first. Nothing was changed.`);
  const branch = `harvest/${p.id}`;
  if (git(m, "branch", "--list", branch)) die(`branch ${branch} already exists in ${m}`);
  const origin = git(m, "branch", "--show-current");
  const status = `branch ${branch} (local, not pushed)`;
  git(m, "switch", "-c", branch);
  try {
    mkdirSync(join(m, "harvest-inbox"), { recursive: true });
    writeFileSync(join(m, "harvest-inbox", `${p.id}.md`), setField(p.text, "upstream_status", status));
    git(m, "add", "--", `harvest-inbox/${p.id}.md`);
    git(m, "commit", "-q", "-m", `harvest: ${p.d.title || p.id}`);
  } catch (e) {
    try { git(m, "reset", "-q", "--hard"); git(m, "clean", "-fdq", "--", "harvest-inbox"); if (origin) git(m, "switch", origin); git(m, "branch", "-D", branch); } catch { /* best effort */ }
    die(`commit failed, nothing kept: ${e.stderr?.toString().trim() || e.message}`);
  }
  if (origin) git(m, "switch", origin); // leave the maintainer's checkout on the branch it was on
  writeFileSync(p.path, setField(p.text, "upstream_status", status));
  console.log(`${p.id}: committed locally on ${branch} in ${m} (harvest-inbox/${p.id}.md). Not pushed; no remote was touched.
Maintainer next: switch to ${branch}, apply the proposal with the forge skill, run the checks.
To publish (ask the owner first, then run these yourself):
  git -C "${m}" push -u origin ${branch}
  gh pr create --head ${branch} --title "harvest: ${p.d.title || p.id}"   (run inside the checkout)
No write access to the upstream repo: fork it, add your fork as a remote in the checkout, push the branch there and open a pull request
from the fork. Or send a bundle instead: node harvest.mjs bundle ${p.id} --out harvest-bundle.md, then attach it to an issue or a PR.`);
  return 0;
}

const HELP = `Scholar Method harvest
  new --title "..." --category ${CATEGORIES.join("|")} --target <path in method repo> [--problem --solution --generalisability --evidence "..."]
  check [id-or-file ...] [--pass [--accept-advisory]]   privacy scan; --pass records privacy_review: passed (only after the scholar saw the text)
  approve <id>                                          owner_approval: yes (needs a passed check; run only after the scholar says yes)
  decline <id> | --title "..."  --reason "..."          log it in scholar/harvest/declined.md and remove the pending file
  list [--json]                                         pending and declined
  bundle [id ...] --out <file>                          export approved proposals as one Markdown bundle
  promote <id> --method <local method checkout>         local branch harvest/<id> and commit; never pushes
  all commands take --root <project>`;

const { pos, opt } = parseArgs(process.argv.slice(2));
const root = findRoot(opt);
const run = { new: () => cmdNew(opt, root), check: () => cmdCheck(pos.slice(1), opt, root), approve: () => cmdApprove(pos, root), decline: () => cmdDecline(pos, opt, root),
  list: () => cmdList(opt, root), bundle: () => cmdBundle(pos, opt, root), promote: () => cmdPromote(pos, opt, root) }[pos[0]];
if (!run) { console.log(HELP); process.exit(pos[0] ? 2 : 0); }
try { process.exitCode = run(); } catch (e) { console.error(`harvest: ${e.message}`); process.exitCode = 1; }
