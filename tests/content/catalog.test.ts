import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { readContentCatalog } from "../../src/content/catalog.js";

function fixture(t: { after: (fn: () => void) => void }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "公共内容 space "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "@bovinphang/craft-common",
      version: "1.0.0",
      repository: {
        type: "git",
        url: "https://github.com/bovinphang/craft-common",
      },
    }),
  );
  fs.mkdirSync(path.join(root, "skills/cc-example"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "skills/cc-example/SKILL.md"),
    "---\nname: cc-example\ndescription: Use when testing a common task.\n---\n",
  );
  return root;
}

test("从显式中文空格目录读取包来源和资源字节哈希", (t) => {
  const root = fixture(t);
  const catalog = readContentCatalog(root, "en");
  assert.equal(catalog.packageName, "@bovinphang/craft-common");
  assert.equal(catalog.packageVersion, "1.0.0");
  assert.equal(
    catalog.skills[0].repository,
    "https://github.com/bovinphang/craft-common",
  );
  assert.deepEqual(catalog.skills[0].files, [
    {
      relativePath: "SKILL.md",
      hash: createHash("sha256")
        .update(fs.readFileSync(path.join(root, "skills/cc-example/SKILL.md")))
        .digest("hex"),
    },
  ]);
});

test("摘要与安装绝对路径无关且能发现资源变化", (t) => {
  const first = fixture(t);
  const second = fixture(t);
  assert.equal(
    readContentCatalog(first, "en").digest,
    readContentCatalog(second, "en").digest,
  );
  fs.writeFileSync(path.join(second, "skills/cc-example/data.json"), "{}");
  assert.notEqual(
    readContentCatalog(first, "en").digest,
    readContentCatalog(second, "en").digest,
  );
});

test("缺失中文内容明确报错而不静默回退英文", (t) => {
  assert.throws(() => readContentCatalog(fixture(t), "zh-CN"), /zh-CN/);
});

test("中文包读取本地化内容", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "localized/zh-CN/skills/cc-example"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, "localized/zh-CN/skills/cc-example/SKILL.md"),
    "---\nname: cc-example\ndescription: 公共任务。\n---\n",
  );
  const catalog = readContentCatalog(root, "zh-CN");
  assert.equal(catalog.language, "zh-CN");
  assert.equal(catalog.skills.length, 1);
  assert.notEqual(catalog.digest, readContentCatalog(root, "en").digest);
});

test("拒绝错误来源包和不受支持的语言", (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, "package.json"),
    '{"name":"other","version":"1.0.0"}',
  );
  assert.throws(() => readContentCatalog(root, "en"), /包|package/);
});

test("拒绝逃逸到技能目录之外的 junction", (t) => {
  const root = fixture(t);
  const external = fixture(t);
  fs.symlinkSync(
    external,
    path.join(root, "skills/cc-example/outside"),
    "junction",
  );
  assert.throws(() => readContentCatalog(root, "en"), /链接|link/);
});
