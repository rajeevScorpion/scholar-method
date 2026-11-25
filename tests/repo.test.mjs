import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./helpers.mjs";

const json = (p) => JSON.parse(readFileSync(join(REPO, p), "utf8"));

test("marketplace and plugin versions agree, four packs exist", () => {
  const mk = json(".claude-plugin/marketplace.json");
  assert.equal(mk.name, "scholar-method");
  assert.deepEqual(mk.plugins.map((p) => p.name), ["scholar-core", "scholar-research", "scholar-writing", "scholar-publish"]);
  for (const p of mk.plugins) {
    const pj = json(`plugins/${p.name}/.claude-plugin/plugin.json`);
    assert.equal(pj.name, p.name);
    assert.equal(pj.version, p.version, `${p.name} version mismatch`);
    assert.equal(p.source, `./plugins/${p.name}`);
  }
  assert.equal(mk.metadata.version, "0.1.0");
});

test("scholar.mjs VERSION equals the scholar-core version", () => {
  const src = readFileSync(join(REPO, "plugins/scholar-core/skills/scholar-start/scripts/scholar.mjs"), "utf8");
  assert.equal(src.match(/const VERSION = "([^"]+)"/)[1], json("plugins/scholar-core/.claude-plugin/plugin.json").version);
});

test("every SKILL.md has name, a Use when description, and at most 150 lines", () => {
  let seen = 0;
  for (const pack of readdirSync(join(REPO, "plugins"))) {
    const sdir = join(REPO, "plugins", pack, "skills");
    for (const n of existsSync(sdir) ? readdirSync(sdir) : []) {
      const f = join(sdir, n, "SKILL.md");
      if (!existsSync(f)) continue;
      seen++;
      const t = readFileSync(f, "utf8");
      assert.ok(t.split("\n").length <= 150, `${n} is over 150 lines`);
      const fm = t.match(/^---\n([\s\S]*?)\n---/)[1];
      assert.equal(fm.match(/^name: (.+)$/m)[1], n);
      assert.match(fm.match(/^description: (.+)$/m)[1], /Use when/);
    }
  }
  assert.equal(seen, 6);
});

test("no em dashes in docs and skills", () => {
  const bad = [];
  (function rec(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if ([".git", "node_modules", "promptPacks", "fixtures"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) rec(p);
      else if (/\.md$/.test(e.name) && readFileSync(p, "utf8").includes("—")) bad.push(p);
    }
  })(REPO);
  assert.deepEqual(bad, []);
});
