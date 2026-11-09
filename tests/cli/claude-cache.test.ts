import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClaudeCacheManager } from "../../src/cli/claude-cache.js";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "craft-cache-"));
  const plugins: Record<string, Array<{ installPath: string }>> = {};
  for (const product of ["frontend-craft", "backend-craft"]) {
    const base = path.join(root, "plugins", "cache", product, product);
    for (const version of ["old", "current"]) {
      fs.mkdirSync(path.join(base, version), { recursive: true });
      fs.writeFileSync(
        path.join(base, version, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
      );
    }
    plugins[`${product}@${product}`] = [
      { installPath: path.join(base, "current") },
    ];
    fs.writeFileSync(
      path.join(root, `${product}.manifest.json`),
      JSON.stringify({ runtime: "claude", packageVersion: "2.0.0" }),
    );
  }
  const metadata = path.join(root, "plugins", "installed_plugins.json");
  fs.writeFileSync(metadata, JSON.stringify({ plugins }));
  return { root, metadata };
}

for (const pluginName of ["frontend-craft", "backend-craft"]) {
  test(`${pluginName} cleanup is scoped and retains active installs despite stale/missing dist`, () => {
    const { root } = fixture();
    try {
      const manager = createClaudeCacheManager({
        pluginName,
        manifestFilename: `${pluginName}.manifest.json`,
        env: { CLAUDE_CONFIG_DIR: root },
      });
      const report = manager.getClaudeCacheReport({ currentVersion: "2.0.0" });
      assert.equal(report.canDelete, true);
      assert.equal(
        report.entries.find((e) => e.isCurrent)?.shouldDelete,
        false,
      );
      assert.equal(
        manager.cleanupClaudeCache({ currentVersion: "2.0.0", dryRun: true })
          .deleted.length,
        0,
      );
      assert.equal(fs.existsSync(path.join(report.cacheDir, "old")), true);
      assert.equal(
        manager.cleanupClaudeCache({ currentVersion: "2.0.0" }).deleted.length,
        1,
      );
      assert.equal(fs.existsSync(path.join(report.cacheDir, "current")), true);
      const other =
        pluginName === "frontend-craft" ? "backend-craft" : "frontend-craft";
      assert.equal(
        fs.existsSync(path.join(root, "plugins", "cache", other, other, "old")),
        true,
      );
      const sources = manager.getClaudeInstallSourceReport({ cwd: root });
      assert.equal(sources.native.length, 1);
      assert.equal(sources.native[0].key, `${pluginName}@${pluginName}`);
      assert.equal(sources.cli.length, 1);
      assert.equal(
        sources.cli[0].manifestPath,
        path.join(root, `${pluginName}.manifest.json`),
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("missing, invalid, or unrelated metadata prevents cache deletion", () => {
  const { root, metadata } = fixture();
  try {
    const manager = createClaudeCacheManager({
      pluginName: "backend-craft",
      manifestFilename: "backend-craft.manifest.json",
    });
    for (const content of [
      undefined,
      "invalid",
      JSON.stringify({ plugins: { "frontend-craft@frontend-craft": [] } }),
    ]) {
      if (content === undefined) fs.rmSync(metadata);
      else fs.writeFileSync(metadata, content);
      const result = manager.cleanupClaudeCache({
        claudeConfigDir: root,
        currentVersion: "2.0.0",
      });
      assert.equal(result.canDelete, false);
      assert.equal(result.deleted.length, 0);
      assert.equal(
        result.entries.some((e) => e.shouldDelete),
        false,
      );
      assert.equal(fs.existsSync(path.join(result.cacheDir, "old")), true);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("cache identity segments cannot escape the configured product cache", () => {
  assert.throws(
    () =>
      createClaudeCacheManager({
        pluginName: "../frontend-craft",
        manifestFilename: "backend-craft.manifest.json",
      }),
    /single path segment/,
  );
});

test("custom cache marketplace and metadata aliases protect all active installs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "craft-marketplace-"));
  try {
    const cache = path.join(
      root,
      ".claude",
      "plugins",
      "cache",
      "team-market",
      "backend-craft",
    );
    const first = path.join(cache, "first");
    const second = path.join(cache, "second");
    fs.mkdirSync(first, { recursive: true });
    fs.mkdirSync(second, { recursive: true });
    fs.writeFileSync(
      path.join(root, ".claude", "plugins", "installed_plugins.json"),
      JSON.stringify({
        plugins: {
          "backend-craft@team-market": [{ installPath: first }],
          "backend-craft@old-market": [{ installPath: second }],
        },
      }),
    );
    const manager = createClaudeCacheManager({
      pluginName: "backend-craft",
      marketplaceName: "team-market",
      marketplaceNames: ["team-market", "old-market"],
      manifestFilename: "custom.manifest.json",
      home: () => root,
      env: { CLAUDE_CONFIG_DIR: "~/.claude" },
    });
    const result = manager.cleanupClaudeCache({ currentVersion: "2.0.0" });
    assert.equal(result.cacheDir, cache);
    assert.equal(result.currentInstallPaths.length, 2);
    assert.equal(
      result.entries.every((entry) => entry.isCurrent),
      true,
    );
    assert.equal(result.deleted.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
