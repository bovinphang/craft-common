import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectSkillResources } from "../../src/content/resources.js";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("draw.io 独立资源包含动态样式、图形索引和第三方许可", () => {
  const files = new Set(
    collectSkillResources(path.join(root, "skills/cc-drawio-studio")).map(
      (file) => file.relativePath,
    ),
  );
  for (const file of [
    "styles/schema.json",
    "styles/built-in/default.json",
    "styles/built-in/corporate.json",
    "styles/built-in/handdrawn.json",
    "data/shape-index.json",
    "data/brand-icons.json",
    "data/THIRD_PARTY_NOTICES.md",
    "scripts/studio-core.mjs",
  ])
    assert.ok(files.has(file), file);
});
test("技术图表资源包含可执行渲染、布局、导出和 PNG 质检依赖", () => {
  const files = new Set(
    collectSkillResources(path.join(root, "skills/cc-technical-diagrams")).map(
      (file) => file.relativePath,
    ),
  );
  for (const file of [
    "scripts/tech-diagram-render.mjs",
    "scripts/diagram-layout.mjs",
    "scripts/export-diagram.mjs",
    "scripts/diagram-browser.mjs",
    "scripts/png-qa.mjs",
    "assets/quality-examples/sequence.json",
  ])
    assert.ok(files.has(file), file);
});

test("技术图表复制到空目录后可独立执行渲染", (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cc-isolated-"));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const skill = path.join(temp, "cc-technical-diagrams");
  fs.cpSync(path.join(root, "skills/cc-technical-diagrams"), skill, {
    recursive: true,
  });
  const result = spawnSync(
    process.execPath,
    [
      path.join(skill, "scripts/tech-diagram-render.mjs"),
      "--input",
      path.join(skill, "assets/quality-examples/sequence.json"),
      "--type",
      "sequence",
      "--output",
      path.join(temp, "diagram.html"),
    ],
    { cwd: temp, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    fs.readFileSync(path.join(temp, "diagram.html"), "utf8"),
    /<svg/,
  );
});
