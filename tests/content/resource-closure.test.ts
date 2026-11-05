import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectSkillResources } from "../../src/content/resources.js";

function fixture(t: { after: (fn: () => void) => void }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-resources-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "SKILL.md"), "# Example\n");
  return root;
}
test("完整携带未被正文直接引用的样式和脚本二级依赖", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "styles"));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(root, "styles/default.json"), "{}");
  fs.writeFileSync(
    path.join(root, "scripts/main.mjs"),
    'import "./helper.mjs";',
  );
  fs.writeFileSync(path.join(root, "scripts/helper.mjs"), "export const x=1;");
  assert.deepEqual(
    collectSkillResources(root).map((file) => file.relativePath),
    [
      "SKILL.md",
      "scripts/helper.mjs",
      "scripts/main.mjs",
      "styles/default.json",
    ],
  );
});
test("拒绝不存在的文档资源而非生成残缺包", (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, "SKILL.md"),
    "[missing](references/missing.md)",
  );
  assert.throws(() => collectSkillResources(root), /missing.md/);
});
test("拒绝脚本中缺失的二级导入", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "main.mjs"), 'import "./missing.mjs";');
  assert.throws(() => collectSkillResources(root), /missing.mjs/);
});
test("拒绝指向技能边界之外的引用", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "SKILL.md"), "[private](../outside.md)");
  assert.throws(() => collectSkillResources(root), /边界|越界/);
});
test("拒绝资源目录里的符号链接", (t) => {
  const root = fixture(t);
  fs.symlinkSync(os.tmpdir(), path.join(root, "outside"), "junction");
  assert.throws(() => collectSkillResources(root), /链接/);
});
