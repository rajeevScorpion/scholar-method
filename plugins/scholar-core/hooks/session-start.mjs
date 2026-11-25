// Scholar Method session-start: silent unless scholar/scholar.json exists in cwd or the git top-level.
// Sync, no network, never fails.
import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cut = (s, n = 200) => (s.length > n ? s.slice(0, n - 1) + "..." : s);
const clean = (s) => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

// label as bold "**X:**" or as a heading "## X"; value = rest of line, else first non-empty line below
function field(text, labels) {
  const L = labels.join("|");
  const bold = new RegExp(String.raw`\*\*\s*(?:${L})\b[^*]*\*\*:?\s*(.*)$`, "i");
  const head = new RegExp(String.raw`^#{1,6}\s*(?:${L})\b`, "i");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(bold);
    if (!m && !head.test(lines[i])) continue;
    let v = clean(m ? m[1] : "");
    for (let j = i + 1; !v && j < lines.length && j < i + 5; j++) v = clean(lines[j]);
    if (v && !v.startsWith("<") && !v.startsWith("#")) return v;
  }
  return "";
}

try {
  const bases = [process.cwd()];
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { timeout: 1500, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (top && !bases.includes(top)) bases.push(top);
  } catch {}
  const root = bases.find((b) => existsSync(join(b, "scholar", "scholar.json")));
  if (root) {
    const cfg = JSON.parse(readFileSync(join(root, "scholar", "scholar.json"), "utf8"));
    const out = [
      "Scholar Method: this is a Scholar project (scholar/scholar.json). Load the scholar-contract skill now. The scholar leads: no drafting unless asked, never present a hypothesis as a finding.",
    ];
    const h = cfg.paths?.handoff && join(root, cfg.paths.handoff);
    if (h && existsSync(h)) {
      const t = readFileSync(h, "utf8");
      const stop = field(t, ["Stopped at"]), next = field(t, ["Next step", "Next session", "Next up", "Next"]);
      const age = Math.floor((Date.now() - statSync(h).mtimeMs) / 86400000);
      out.push(`Handoff ${cfg.paths.handoff} (${age} days old)`);
      if (stop) out.push(`  Stopped at: ${cut(stop)}`);
      if (next) out.push(`  Next step: ${cut(next)}`);
    }
    let pending = 0;
    const idir = join(root, "scholar", "insights");
    for (const f of (existsSync(idir) ? readdirSync(idir) : []).filter((n) => n.endsWith(".md")))
      if (/^author_decision:\s*pending\s*$/m.test(readFileSync(join(idir, f), "utf8"))) pending++;
    const hdir = join(root, "scholar", "harvest", "pending");
    const hnames = existsSync(hdir) ? readdirSync(hdir).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)) : [];
    const harvest = hnames.length;
    // other packs install as separate plugins, so they find the core CLI through this absolute path
    const cli = fileURLToPath(new URL("../skills/scholar-start/scripts/scholar.mjs", import.meta.url));
    out.push(`Scholar CLI ($SCHOLAR): node "${cli}"`);
    out.push(`Insights awaiting the scholar's decision: ${pending}. Pending harvest proposals: ${harvest}${harvest ? " (" + cut(hnames.slice(0, 3).join(", "), 160) + ")" : ""}.`);
    console.log(out.join("\n"));
  }
} catch {}
process.exit(0);
