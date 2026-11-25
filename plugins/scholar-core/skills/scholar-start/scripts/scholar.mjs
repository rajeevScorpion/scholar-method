#!/usr/bin/env node
// Scholar Method CLI: init, doctor, validate, new, status. Zero dependencies; imports nothing from other skills.
// Usage: node scholar.mjs <init|doctor|validate|new|status> [options]   (run with no arguments for help)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

const VERSION = "0.1.0"; // keep equal to plugins/scholar-core/.claude-plugin/plugin.json (a test checks)

// ---------- schema (documented in scholar-contract/references/records.md) ----------
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SCHEMA = {
  insight: {
    dir: "insights", prefix: "INS",
    required: ["id", "created", "updated", "title", "kind", "maturity", "author_decision", "evidence_status", "rq", "sources", "claims", "related"],
    lists: ["rq", "sources", "claims", "related"],
    dates: ["created", "updated"],
    enums: {
      kind: ["observation", "hypothesis", "question", "interpretation", "objection"],
      maturity: ["captured", "explored", "evidence-linked", "applied"],
      author_decision: ["pending", "accepted", "challenged", "deferred", "discarded"],
      evidence_status: ["none", "leads", "partial", "supported", "contested"],
    },
    links: ["sources", "claims", "related"],
  },
  claim: {
    dir: "claims", prefix: "CLM",
    required: ["id", "kind", "status", "supports", "challenges", "rq", "used_in"],
    lists: ["supports", "challenges", "rq", "used_in"],
    dates: [],
    enums: {
      kind: ["source-statement", "author-interpretation", "hypothesis", "data-result"],
      status: ["unverified", "metadata-checked", "full-text-reviewed", "claim-checked", "approved-for-use"],
    },
    links: ["supports", "challenges"],
  },
  source: {
    dir: "sources", prefix: "SRC",
    required: ["id", "citekey", "type", "title", "authors", "year", "doi", "url", "accessed", "read_status", "rights", "limitations"],
    lists: [],
    dates: [],
    enums: { read_status: ["lead", "abstract-only", "metadata-checked", "full-text-reviewed"] },
    links: [],
  },
  visual: {
    dir: "visuals", prefix: "VIS",
    required: ["id", "status", "purpose", "kind", "evidence_class", "input_refs", "source_status", "question_links", "transforms", "render_spec", "limitations", "assumptions", "review_status", "exports"],
    lists: ["input_refs", "question_links", "assumptions", "exports"],
    dates: [],
    enums: { status: ["exploratory", "evidence-linked", "approved", "manuscript-ready"] },
    links: [],
  },
};
const TYPES = Object.keys(SCHEMA);
// defaults for the `writing` object (lint rules; the writing profile itself is opt-in via profile.writing_profile)
const WRITING_DEFAULTS = { no_dashes: true, no_oxford_comma: true, serial_comma: false, spelling: "indian", no_contractions: true, ai_register: true, protected_terms: [] };
const WRITING_TYPES = { no_dashes: "boolean", no_oxford_comma: "boolean", serial_comma: "boolean", spelling: "string", no_contractions: "boolean", ai_register: "boolean", protected_terms: "array" };

// ---------- small helpers ----------
const today = () => new Date().toLocaleDateString("en-CA");
const posix = (p) => p.split(sep).join("/");
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const q = (s) => JSON.stringify(String(s));

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const n = argv[i + 1];
      if (n === undefined || n.startsWith("--")) opt[a.slice(2)] = true;
      else { opt[a.slice(2)] = n; i++; }
    } else pos.push(a);
  }
  return { pos, opt };
}

function findRoot(opt) {
  if (typeof opt.root === "string") return resolve(opt.root);
  try {
    return resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim());
  } catch { return process.cwd(); }
}

// ---------- record parsing: Markdown + YAML-subset frontmatter ----------
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

function loadRecords(root) {
  const base = join(root, "scholar");
  const recs = [], problems = [];
  for (const type of TYPES) {
    const dir = join(base, SCHEMA[type].dir);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
      const path = posix(relative(root, join(dir, f)));
      try { recs.push({ type, path, file: f, ...parseRecord(readFileSync(join(dir, f), "utf8")) }); }
      catch (e) { problems.push({ level: "ERROR", path, msg: e.message }); }
    }
  }
  return { recs, problems };
}

// ---------- init ----------
const SKIP_DIRS = new Set(["node_modules", "scholar", "promptPacks", "dist", "build", "_site", "_book", "venv", "renv"]);
function walk(root, maxDepth = 4) {
  const files = [];
  (function rec(d, depth) {
    let entries = [];
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { if (depth < maxDepth) rec(p, depth + 1); } else files.push(p);
    }
  })(root, 1);
  return files;
}

// first matching rule wins per file, so a file maps to one role only
const RULES = [
  ["handoff", (n) => /hand-?off/.test(n) && n.endsWith(".md")],
  ["decisions", (n) => /decision/.test(n) && n.endsWith(".md")],
  ["sources", (n) => /source[-_ ]?regist/.test(n)],
  ["bib", (n) => n.endsWith(".bib")],
  ["style_guide", (n) => /style[-_ ]?guide/.test(n)],
  ["status", (n) => /(^|[^a-z])(status|state)([^a-z]|$)/.test(n) && n.endsWith(".md")],
  ["quarto", (n) => n === "_quarto.yml" || n === "_quarto.yaml"],
  ["visual_ledger", (n) => /visual.*ledger/.test(n) && n.endsWith(".md")],
  ["asset_register", (n) => /asset[-_ ]?regist/.test(n) && n.endsWith(".md")],
  ["boards", (n) => n.endsWith(".excalidraw")],
];

function detect(root) {
  const found = {}, depthOf = (p) => relative(root, p).split(sep).length;
  const files = walk(root).sort((a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b));
  for (const f of files) {
    const name = f.split(sep).pop().toLowerCase();
    const rule = RULES.find(([, test]) => test(name));
    if (rule && !found[rule[0]]) found[rule[0]] = posix(relative(root, f));
  }
  // drafts: Quarto or LaTeX files in a subfolder, else chapter-numbered Markdown (ch01_intro.md)
  const draftFile = files.find((f) => /\.(qmd|tex)$/i.test(f) && depthOf(f) > 1)
    ?? files.find((f) => /^ch(apter)?[-_ ]?\d+.*\.md$/i.test(f.split(sep).pop()) && depthOf(f) > 1);
  // a leading number is ignored, so "04_assets" counts as "assets"
  const asset = readdirSync(root, { withFileTypes: true }).find((e) => e.isDirectory() && ["assets", "figures", "images", "img", "media"].includes(e.name.toLowerCase().replace(/^\d+[-_ ]/, "")))?.name;
  return {
    status: found.status ?? null, handoff: found.handoff ?? null, decisions: found.decisions ?? null,
    sources: found.sources ?? null, bib: found.bib ?? null, style_guide: found.style_guide ?? null,
    drafts: draftFile ? posix(dirname(relative(root, draftFile))) : null,
    assets: asset ?? null,
    quarto: found.quarto ?? null,
    visual_ledger: found.visual_ledger ?? null, asset_register: found.asset_register ?? null,
    boards: found.boards ? posix(dirname(found.boards)) : null,
    agents_md: existsSync(join(root, "AGENTS.md")) ? "AGENTS.md" : null,
    claude_md: existsSync(join(root, "CLAUDE.md")) ? "CLAUDE.md" : null,
    codex_agents: existsSync(join(root, ".codex", "agents")) ? ".codex/agents" : null,
  };
}

const ROLE_LABEL = {
  status: "Status", handoff: "Handoff (Stopped at / Next step)", decisions: "Decisions", sources: "Source register",
  bib: "Bibliography", style_guide: "Style guide", drafts: "Drafts", assets: "Assets and figures", quarto: "Quarto config",
  visual_ledger: "Visual ledger", asset_register: "Asset register", boards: "Excalidraw boards (folder)",
  agents_md: "AGENTS.md (Codex and others)", claude_md: "CLAUDE.md (Claude Code)", codex_agents: "Codex custom agents",
};

const TEMPLATES = {
  "STATUS.md": (d) => `# Status\n\n**Updated:** ${d}\n\n## Summary\n\n## Working\n\n## Open\n\n## Next\n`,
  "HANDOFF.md": () => `# Handoff\n\n**Stopped at:**\n\n**In flight:**\n\n**Open questions:**\n\n**Next step:**\n`,
  "DECISIONS.md": () => `# Decisions\n\n| Date | Decision | Why | Alternatives | Affects | Authority |\n|---|---|---|---|---|---|\n`,
  "declined.md": () => `# Declined harvest candidates\n\nOne line each: date, what, why declined. Declined items are not offered again.\n`,
};

function projectMap(paths, kind) {
  const rows = Object.keys(ROLE_LABEL).map((r) => `| ${ROLE_LABEL[r]} | ${paths[r] ? "\`" + paths[r] + "\`" : "not found"} |`);
  return `# Project map\n\nWhich file plays which Scholar role in this project (kind: ${kind}). Existing files are the source of truth; Scholar only points at them. Machine copy: \`scholar/scholar.json\`.\n\n| Role | File |\n|---|---|\n${rows.join("\n")}\n\nScholar records live in \`scholar/insights\`, \`scholar/claims\`, \`scholar/visuals\`${paths.sources === "scholar/sources/" ? ", \`scholar/sources\`" : ""} and \`scholar/harvest\`.\n`;
}

function planInit(root, kind) {
  const cfgPath = join(root, "scholar", "scholar.json");
  const existing = readJson(cfgPath);
  const date = today();
  const files = []; // { rel, content }
  let cfg = existing;
  const mapped = existing ? existing.paths : detect(root);
  const paths = { ...mapped };
  const own = (role, file) => {
    // a role with no existing file gets a Scholar-owned one (in a new config), or is checked for presence (existing config)
    if (!paths[role]) paths[role] = `scholar/${file}`;
    if (paths[role] === `scholar/${file}`) files.push({ rel: `scholar/${file}`, content: TEMPLATES[file](date) });
  };
  own("status", "STATUS.md"); own("handoff", "HANDOFF.md"); own("decisions", "DECISIONS.md");
  if (!paths.sources) paths.sources = "scholar/sources/";
  if (paths.sources === "scholar/sources/") files.push({ rel: "scholar/sources/.gitkeep", content: "" });
  if (!existing) {
    cfg = {
      method_version: VERSION,
      profile: { kind: kind ?? "unset", citation_style: "APA 7", writing_profile: null },
      paths,
      writing: WRITING_DEFAULTS,
      harvest: { allow_domains: [], deny_terms: [] },
      capture: "batch",
      harvest_outbox: "tracked",
      related_projects: [],
      external_ids: [],
    };
    files.push({ rel: "scholar/scholar.json", content: JSON.stringify(cfg, null, 2) + "\n" });
    files.push({ rel: "scholar/PROJECT_MAP.md", content: projectMap(paths, cfg.profile.kind) });
  } else if (!existsSync(join(root, "scholar", "PROJECT_MAP.md"))) {
    files.push({ rel: "scholar/PROJECT_MAP.md", content: projectMap(paths, cfg.profile?.kind ?? "unset") });
  }
  for (const d of ["insights", "claims", "visuals", "harvest/pending"]) files.push({ rel: `scholar/${d}/.gitkeep`, content: "" });
  files.push({ rel: "scholar/harvest/declined.md", content: TEMPLATES["declined.md"]() });
  // never overwrite: keep only files that do not exist yet
  return { cfg, paths, files: files.filter((f) => !existsSync(join(root, f.rel))), existing: !!existing };
}

function cmdInit(opt) {
  const root = findRoot(opt);
  if (!opt.apply && !opt["dry-run"]) { console.error("init needs --dry-run or --apply"); return 2; }
  const kind = typeof opt.kind === "string" ? opt.kind : null;
  if (kind && !["thesis", "paper", "review"].includes(kind)) { console.error(`--kind must be thesis, paper or review (got ${kind})`); return 2; }
  const plan = planInit(root, kind);
  console.log(`Scholar init for ${root}${opt.apply ? "" : " (dry run, nothing written)"}`);
  console.log("Mapped roles:");
  for (const r of Object.keys(ROLE_LABEL)) if (plan.paths[r]) console.log(`  ${r.padEnd(12)} -> ${plan.paths[r]}`);
  const missing = Object.keys(ROLE_LABEL).filter((r) => !plan.paths[r]);
  if (missing.length) console.log(`Not found: ${missing.join(", ")}`);
  if (!plan.files.length) { console.log("No changes: scholar/ is already complete."); return 0; }
  console.log(`${opt.apply ? "Creating" : "Would create"} ${plan.files.length} file(s):`);
  for (const f of plan.files) {
    console.log(`  ${f.rel}`);
    if (opt.apply) { mkdirSync(dirname(join(root, f.rel)), { recursive: true }); writeFileSync(join(root, f.rel), f.content, { flag: "wx" }); }
  }
  return 0;
}

// ---------- doctor ----------
function lockSaysBlader(lockPaths) {
  for (const p of lockPaths) {
    const j = readJson(p);
    if (j && JSON.stringify(j).toLowerCase().includes("blader/humanizer")) return p;
  }
  return null;
}

function cmdDoctor(opt) {
  const root = findRoot(opt), home = homedir();
  const out = { root, scholar: { initialised: false, method_version: null }, claude: {}, codex: {}, studio_core: {}, humanizer: {} };
  const cfg = readJson(join(root, "scholar", "scholar.json"));
  if (cfg) out.scholar = { initialised: true, method_version: cfg.method_version ?? null };

  const ipPath = join(home, ".claude", "plugins", "installed_plugins.json");
  const ip = readJson(ipPath);
  const plugins = ip?.plugins ?? {};
  out.claude = { installed_plugins_file: existsSync(ipPath) ? ipPath : null, scholar_plugins: Object.keys(plugins).filter((k) => k.endsWith("@scholar-method")) };
  const studio = Object.keys(plugins).filter((k) => k.startsWith("studio-core@"));
  const proj = readJson(join(root, ".claude", "settings.json"));
  out.studio_core = {
    installed_in_claude: studio.length > 0,
    plugin_keys: studio,
    disabled_in_this_project: studio.some((k) => proj?.enabledPlugins?.[k] === false),
  };

  const codexDirs = [join(root, ".agents", "skills"), join(home, ".agents", "skills"), join(home, ".codex", "skills")];
  out.codex.skills_dirs = codexDirs.map((p) => ({ path: p, exists: existsSync(p) }));
  out.codex.scholar_skills = [];
  const lockHit = lockSaysBlader([join(home, ".agents", ".skill-lock.json"), join(root, "skills-lock.json")]);
  const found = [];
  for (const k of Object.keys(plugins)) {
    if (k === "humanizer@humanizer") found.push({ agent: "claude", where: k, source: "blader (official plugin id humanizer@humanizer)" });
    else if (k.startsWith("humanizer@")) found.push({ agent: "claude", where: k, source: "other: not blader/humanizer" });
  }
  const skillDirs = [
    ["claude", join(home, ".claude", "skills")], ["claude", join(root, ".claude", "skills")],
    ["codex", codexDirs[0]], ["codex", codexDirs[1]], ["codex", codexDirs[2]],
  ];
  for (const [agent, d] of skillDirs) {
    if (agent === "codex" && existsSync(d)) {
      for (const n of readdirSync(d)) if (existsSync(join(d, n, ".scholar-method.json"))) out.codex.scholar_skills.push(join(d, n));
    }
    if (existsSync(join(d, "humanizer", "SKILL.md")))
      found.push({ agent, where: join(d, "humanizer"), source: lockHit ? `blader (a skills lock file names blader/humanizer: ${lockHit})` : "unverified: a skill named humanizer is present but nothing proves it is blader/humanizer" });
  }
  const blader = found.filter((f) => f.source.startsWith("blader"));
  out.humanizer = {
    status: blader.length ? "blader-present" : found.length ? "other-or-unverified" : "absent",
    found,
    note: "A skill named humanizer from any other source (for example anthropic-skills:humanizer) is NOT blader/humanizer. Report it as such.",
  };

  if (opt.json) { console.log(JSON.stringify(out, null, 2)); return 0; }
  console.log(`Scholar doctor (${root})`);
  console.log(`  scholar/ adopted: ${out.scholar.initialised ? "yes, method " + out.scholar.method_version : "no"}`);
  console.log(`  Claude plugins file: ${out.claude.installed_plugins_file ?? "not found"}; scholar plugins: ${out.claude.scholar_plugins.join(", ") || "none"}`);
  console.log(`  Codex skills dirs: ${out.codex.skills_dirs.filter((d) => d.exists).map((d) => d.path).join(", ") || "none exist"}`);
  console.log(`  Studio Method studio-core in Claude: ${out.studio_core.installed_in_claude ? "installed" + (out.studio_core.disabled_in_this_project ? ", disabled in this project" : ", enabled here") : "not installed"}`);
  console.log(`  Humanizer (blader/humanizer): ${out.humanizer.status}`);
  for (const f of found) console.log(`    - ${f.agent}: ${f.where} (${f.source})`);
  if (out.humanizer.status !== "blader-present") console.log("    Absent or unverified: ask the owner before installing anything. Commands are in the scholar-start skill.");
  return 0;
}

// ---------- validate ----------
function bibKeys(root, cfg) {
  const keys = new Set();
  const bib = cfg?.paths?.bib;
  if (bib && existsSync(join(root, bib))) {
    for (const m of readFileSync(join(root, bib), "utf8").matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)) keys.add(m[1]);
  }
  return keys;
}

function validateAll(root) {
  const cfg = readJson(join(root, "scholar", "scholar.json"));
  const { recs, problems } = loadRecords(root);
  const issues = [...problems];
  const w = cfg?.writing;
  if (w !== undefined) {
    const at = "scholar/scholar.json";
    if (typeof w !== "object" || w === null || Array.isArray(w)) issues.push({ level: "ERROR", path: at, msg: '"writing" must be an object' });
    else for (const [k, v] of Object.entries(w)) {
      const want = WRITING_TYPES[k];
      if (!want) issues.push({ level: "WARN", path: at, msg: `unknown writing key "${k}"` });
      else if (want === "array" ? !Array.isArray(v) : typeof v !== want) issues.push({ level: "ERROR", path: at, msg: `writing.${k} must be ${want === "array" ? "an array" : "a " + want}` });
    }
  }
  const add = (level, r, msg) => issues.push({ level, path: r.path, msg });
  const known = new Set(), seen = new Map();
  for (const r of recs) {
    const id = r.data.id;
    if (typeof id === "string" && id) {
      if (seen.has(id)) add("ERROR", r, `duplicate id ${id} (also in ${seen.get(id)})`); else seen.set(id, r.path);
      known.add(id);
    }
    if (r.data.citekey) known.add(r.data.citekey);
  }
  const ext = new Set([...(cfg?.external_ids ?? []), ...bibKeys(root, cfg)].map((s) => String(s).replace(/^@/, "")));
  const byId = new Map(recs.map((r) => [r.data.id, r]));
  for (const r of recs) {
    const s = SCHEMA[r.type], d = r.data;
    for (const f of s.required) if (!(f in d)) add("ERROR", r, `missing required field "${f}"`);
    for (const f of s.lists) if (f in d && !Array.isArray(d[f])) add("ERROR", r, `"${f}" must be an inline list like [a, b]`);
    for (const f of s.dates) if (f in d && !DATE.test(d[f])) add("ERROR", r, `"${f}" must be YYYY-MM-DD (got "${d[f]}")`);
    for (const [f, allowed] of Object.entries(s.enums)) if (f in d && !allowed.includes(d[f])) add("ERROR", r, `"${f}" is "${d[f]}", allowed: ${allowed.join(" | ")}`);
    if (d.id !== undefined) {
      if (!new RegExp(`^${s.prefix}-\\d{4,}$`).test(d.id)) add("ERROR", r, `id "${d.id}" must look like ${s.prefix}-0001`);
      else if (r.file !== `${d.id}.md`) add("ERROR", r, `file name must be ${d.id}.md`);
    }
    for (const f of s.links) for (const tok of Array.isArray(d[f]) ? d[f] : []) {
      const key = String(tok).trim().split(/\s+/)[0].replace(/^@/, "");
      if (!known.has(key) && !ext.has(key)) add("ERROR", r, `dangling link in "${f}": ${tok} is not a record id, a bib citekey, or listed in scholar.json external_ids`);
    }
    // warnings: simple integrity hints
    if (r.type === "claim") {
      if (d.kind === "data-result") for (const tok of d.supports ?? []) {
        const t = byId.get(String(tok).trim().split(/\s+/)[0]);
        if (t?.type === "insight" && t.data.kind === "hypothesis") add("WARN", r, `data-result claim leans on hypothesis ${t.data.id}; a hypothesis is not a result`);
      }
      if (["claim-checked", "approved-for-use"].includes(d.status) && Array.isArray(d.supports) && !d.supports.length) add("WARN", r, `status ${d.status} but no supports`);
    }
    if (r.type === "insight" && d.maturity === "applied" && d.author_decision !== "accepted") add("WARN", r, `maturity applied but author_decision is ${d.author_decision}`);
    if (r.type === "visual" && d.status !== "exploratory" && Array.isArray(d.input_refs) && !d.input_refs.length) add("WARN", r, `status ${d.status} but no input_refs`);
  }
  return { recs, issues, cfg };
}

function cmdValidate(opt) {
  const root = findRoot(opt);
  if (!existsSync(join(root, "scholar"))) { console.log("No scholar/ folder here; nothing to validate."); return 0; }
  const { recs, issues } = validateAll(root);
  for (const i of issues) console.log(`${i.level} ${i.path}: ${i.msg}`);
  const e = issues.filter((i) => i.level === "ERROR").length, w = issues.length - e;
  console.log(`${recs.length} record(s) checked: ${e} error(s), ${w} warning(s).`);
  return e ? 1 : 0;
}

// ---------- new ----------
const TEMPLATE = {
  insight: (id, title, d) => `---\nid: ${id}\ncreated: ${d}\nupdated: ${d}\ntitle: ${q(title)}\nkind: observation\nmaturity: captured\nauthor_decision: pending\nevidence_status: none\nrq: []\nsources: []\nclaims: []\nrelated: []\n---\n\n## Faithful paraphrase\n\n## Scholar's words\n\n(only if the scholar designates a quote)\n\n## Rival explanations\n\n## Evidence so far\n\n## Next test\n`,
  claim: (id, title) => `---\nid: ${id}\nkind: source-statement\nstatus: unverified\nsupports: []\nchallenges: []\nrq: []\nused_in: []\n---\n\n## Statement\n\n${title}\n\n## Notes\n`,
  source: (id, title) => `---\nid: ${id}\ncitekey: ""\ntype: ""\ntitle: ${q(title)}\nauthors: []\nyear: ""\ndoi: ""\nurl: ""\naccessed: ""\nread_status: lead\nrights: ""\nlimitations: ""\n---\n\n## Notes\n`,
  visual: (id, title) => `---\nid: ${id}\nstatus: exploratory\npurpose: ${q(title)}\nkind: ""\nevidence_class: ""\ninput_refs: []\nsource_status: ""\nquestion_links: []\ntransforms: ""\nrender_spec: ""\nlimitations: ""\nassumptions: []\nreview_status: author-review-needed\nexports: []\n---\n\n## Caption and notes\n`,
};

function cmdNew(pos, opt) {
  const type = pos[1], root = findRoot(opt);
  if (!TYPES.includes(type)) { console.error(`new needs one of: ${TYPES.join(", ")}`); return 2; }
  if (typeof opt.title !== "string" || !opt.title.trim()) { console.error('new needs --title "..."'); return 2; }
  const cfg = readJson(join(root, "scholar", "scholar.json"));
  if (!cfg) { console.error("No scholar/scholar.json here. Run init first."); return 1; }
  if (type === "source" && cfg.paths?.sources && cfg.paths.sources !== "scholar/sources/" && !opt.force) {
    console.error(`This project keeps its own source register (${cfg.paths.sources}). Register sources there and reference its IDs. Use --force to create a Scholar source record anyway.`);
    return 1;
  }
  const s = SCHEMA[type], dir = join(root, "scholar", s.dir);
  mkdirSync(dir, { recursive: true });
  let max = 0;
  for (const f of readdirSync(dir)) { const m = f.match(new RegExp(`^${s.prefix}-(\\d+)`)); if (m) max = Math.max(max, Number(m[1])); }
  const id = `${s.prefix}-${String(max + 1).padStart(4, "0")}`;
  const file = join(dir, `${id}.md`);
  writeFileSync(file, TEMPLATE[type](id, opt.title.trim(), today()), { flag: "wx" });
  console.log(`${id} ${posix(relative(root, file))}`);
  return 0;
}

// ---------- status ----------
function cmdStatus(opt) {
  const root = findRoot(opt);
  if (!existsSync(join(root, "scholar", "scholar.json"))) { console.log("Not a Scholar project (no scholar/scholar.json). Run init."); return 0; }
  const { recs, issues } = validateAll(root);
  const count = (type, field) => {
    const c = {};
    for (const r of recs.filter((x) => x.type === type)) c[r.data[field] ?? "?"] = (c[r.data[field] ?? "?"] ?? 0) + 1;
    return Object.entries(c).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
  };
  const pending = recs.filter((r) => r.type === "insight" && r.data.author_decision === "pending");
  const hdir = join(root, "scholar", "harvest", "pending");
  const hfiles = existsSync(hdir) ? readdirSync(hdir).filter((n) => n.endsWith(".md")) : [];
  const harvest = hfiles.length;
  console.log(`Scholar status (${root})`);
  console.log(`  insights by decision: ${count("insight", "author_decision")}`);
  console.log(`  insights by evidence: ${count("insight", "evidence_status")}`);
  console.log(`  claims by status: ${count("claim", "status")}`);
  console.log(`  sources by read status: ${count("source", "read_status")}`);
  console.log(`  visuals by status: ${count("visual", "status")}`);
  console.log(`  pending harvest proposals: ${harvest}`);
  console.log(`  validation: ${issues.filter((i) => i.level === "ERROR").length} error(s), ${issues.filter((i) => i.level === "WARN").length} warning(s)`);
  if (pending.length) { console.log("  insights awaiting your decision:"); for (const r of pending) console.log(`    ${r.data.id}  (${r.data.kind ?? "?"}, evidence ${r.data.evidence_status ?? "?"})  ${r.data.title ?? ""}`); }
  if (harvest) { console.log("  harvest proposals pending (not yet sent anywhere):"); for (const f of hfiles) console.log(`    ${f.slice(0, -3)}`); }
  return 0;
}

// ---------- main ----------
const HELP = `Scholar Method ${VERSION}
  init --dry-run|--apply [--kind thesis|paper|review] [--root <repo>]
  doctor [--json] [--root <repo>]
  validate [--root <repo>]
  new insight|claim|source|visual --title "..." [--root <repo>]
  status [--root <repo>]`;

const { pos, opt } = parseArgs(process.argv.slice(2));
const cmd = { init: () => cmdInit(opt), doctor: () => cmdDoctor(opt), validate: () => cmdValidate(opt), new: () => cmdNew(pos, opt), status: () => cmdStatus(opt) }[pos[0]];
if (!cmd) { console.log(HELP); process.exit(pos[0] ? 2 : 0); }
try { process.exitCode = cmd(); } catch (e) { console.error(`scholar: ${e.message}`); process.exitCode = 1; }
