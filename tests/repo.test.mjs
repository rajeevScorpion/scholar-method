import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./helpers.mjs";

const json = (p) => JSON.parse(readFileSync(join(REPO, p), "utf8"));

test("marketplace and plugin versions agree, four packs exist", () => {
  const mk = json(".claude-plugin/marketplace.json");
  assert.equal(mk.name, "scholar-method");
  assert.deepEqual(mk.plugins.map((p) => p.name), ["scholar", "scholar-core", "scholar-research", "scholar-writing", "scholar-publish"]);
  for (const p of mk.plugins) {
    const pj = json(`plugins/${p.name}/.claude-plugin/plugin.json`);
    assert.equal(pj.name, p.name);
    assert.equal(pj.version, p.version, `${p.name} version mismatch`);
    assert.equal(p.source, `./plugins/${p.name}`);
  }
  assert.equal(mk.metadata.version, "0.1.2");
});

test("scholar.mjs VERSION equals the scholar-core version", () => {
  const src = readFileSync(join(REPO, "plugins/scholar-core/skills/scholar-start/scripts/scholar.mjs"), "utf8");
  assert.equal(src.match(/const VERSION = "([^"]+)"/)[1], json("plugins/scholar-core/.claude-plugin/plugin.json").version);
});

const SKILLS = {
  "scholar-core": ["catch-up", "check-out", "forge", "harvest", "scholar-contract", "scholar-start"],
  "scholar-research": ["analyse", "evidence", "reflect", "research", "visualise"],
  "scholar-writing": ["cite", "draft", "voice-review"],
  "scholar-publish": ["build", "submission-check"],
};

test("every SKILL.md has name, a Use when description, and at most 150 lines", () => {
  const seen = {};
  for (const pack of readdirSync(join(REPO, "plugins"))) {
    const sdir = join(REPO, "plugins", pack, "skills");
    for (const n of existsSync(sdir) ? readdirSync(sdir) : []) {
      const f = join(sdir, n, "SKILL.md");
      if (!existsSync(f)) continue;
      (seen[pack] ??= []).push(n);
      const t = readFileSync(f, "utf8");
      assert.ok(t.split("\n").length <= 150, `${n} is over 150 lines`);
      const fm = t.match(/^---\n([\s\S]*?)\n---/)[1];
      assert.equal(fm.match(/^name: (.+)$/m)[1], n);
      assert.match(fm.match(/^description: (.+)$/m)[1], /Use when/);
    }
  }
  assert.deepEqual(seen, SKILLS); // exactly these 16
  assert.equal(Object.values(seen).flat().length, 16);
});

test("no pack manifest or marketplace entry says skills are coming", () => {
  const mk = json(".claude-plugin/marketplace.json");
  for (const p of mk.plugins) {
    const pj = json(`plugins/${p.name}/.claude-plugin/plugin.json`);
    assert.equal(pj.description, p.description, `${p.name} descriptions differ`);
    assert.doesNotMatch(p.description, /coming|later release/i);
  }
});

test("no em dashes in docs and skills", () => {
  const bad = [];
  // examples/writing holds deliberate "before" samples; tests/fixtures and private/ are not published prose
  const skip = (p) => p.replaceAll("\\", "/").includes("/examples/writing");
  (function rec(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if ([".git", "node_modules", "promptPacks", "fixtures", "private"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (skip(p)) continue;
      if (e.isDirectory()) rec(p);
      else if (/\.md$/.test(e.name) && readFileSync(p, "utf8").includes("—")) bad.push(p);
    }
  })(REPO);
  assert.deepEqual(bad, []);
});
