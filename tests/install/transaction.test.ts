import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  executeSharedPlan,
  recoverSharedTransaction,
} from "../../src/install/transaction.js";
import { resolveSharedIdentity } from "../../src/install/identity.js";
import { sharedFixture } from "./fixtures.js";

test("真实事务写入资源及引用，dry-run 对空目录零写入", async (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  await executeSharedPlan(request, { dryRun: true });
  assert.equal(fs.existsSync(path.dirname(f.skillsDir)), false);
  await executeSharedPlan(request, { dryRun: false });
  assert.ok(fs.existsSync(path.join(f.skillsDir, "cc-example/SKILL.md")));
  assert.equal(await recoverSharedTransaction(f.skillsDir), "clean");
});

test("产品根 junction 规范化后写入真实路径，内部链接仍拒绝", async (t) => {
  const f = sharedFixture(t);
  const real = path.join(f.root, "real"),
    alias = path.join(f.root, "alias");
  fs.mkdirSync(real);
  fs.symlinkSync(
    real,
    alias,
    process.platform === "win32" ? "junction" : "dir",
  );
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  await executeSharedPlan(request, {
    dryRun: false,
    allowedProductRoots: [alias],
    productMutations: [
      {
        path: path.join(alias, "config.md"),
        beforeHash: null,
        after: Buffer.from("product"),
      },
    ],
  });
  assert.equal(
    fs.readFileSync(path.join(real, "config.md"), "utf8"),
    "product",
  );
  const outside = path.join(f.root, "outside");
  fs.mkdirSync(outside);
  fs.symlinkSync(
    outside,
    path.join(real, "nested"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    executeSharedPlan(request, {
      dryRun: false,
      allowedProductRoots: [alias],
      productMutations: [
        {
          path: path.join(alias, "nested/escape.md"),
          beforeHash: null,
          after: Buffer.from("escape"),
        },
      ],
    }),
    /链接|边界|越界/,
  );
  assert.deepEqual(fs.readdirSync(outside), []);
});
test("产品规划后文件变动及越界写入都在公共部署前失败", async (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  const productDir = path.join(f.root, "product");
  fs.mkdirSync(productDir);
  const file = path.join(productDir, "user.md");
  fs.writeFileSync(file, "user content");
  await assert.rejects(
    executeSharedPlan(request, {
      dryRun: false,
      productMutations: [
        { path: file, beforeHash: null, after: Buffer.from("replace") },
      ],
      allowedProductRoots: [productDir],
    }),
    /改变|修改|冲突/,
  );
  assert.equal(
    fs.existsSync(path.join(f.skillsDir, "cc-example/SKILL.md")),
    false,
  );
  await assert.rejects(
    executeSharedPlan(request, {
      dryRun: false,
      productMutations: [
        { path: file, beforeHash: null, after: Buffer.from("replace") },
      ],
      allowedProductRoots: [path.join(f.root, "other")],
    }),
    /边界|越界/,
  );
  assert.equal(fs.readFileSync(file, "utf8"), "user content");
});
test("产品写入失败时回滚公共资源和消费者登记", async (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  const productDir = path.join(f.root, "product");
  const target = path.join(productDir, "fail.md");
  const rename = fs.renameSync;
  t.mock.method(fs, "renameSync", (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === target) throw new Error("模拟产品写入失败");
    return rename(from, to);
  });
  await assert.rejects(
    executeSharedPlan(request, {
      dryRun: false,
      productMutations: [
        { path: target, beforeHash: null, after: Buffer.from("new") },
      ],
      allowedProductRoots: [productDir],
    }),
    /模拟产品写入失败/,
  );
  assert.equal(
    fs.existsSync(path.join(f.skillsDir, "cc-example/SKILL.md")),
    false,
  );
  const { ledgerDir } = resolveSharedIdentity(f.skillsDir);
  assert.equal(
    fs.existsSync(path.join(ledgerDir, "dependencies.lock.json")),
    false,
  );
});

test("复用公共内容时产品计划也不能认领或覆盖 cc 文件", async (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  await executeSharedPlan(request, { dryRun: false });
  const file = path.join(f.skillsDir, "cc-example/SKILL.md");
  const original = fs.readFileSync(file);
  await assert.rejects(
    executeSharedPlan(request, {
      dryRun: false,
      allowedProductRoots: [f.skillsDir],
      productMutations: [
        {
          path: file,
          beforeHash: createHash("sha256").update(original).digest("hex"),
          after: Buffer.from("product overwrite"),
        },
      ],
    }),
    /公共.*认领|认领.*公共/,
  );
  assert.deepEqual(fs.readFileSync(file), original);
});

test("较大二进制事务日志恢复不依赖正则递归栈并拒绝非规范 base64", async (t) => {
  const f = sharedFixture(t),
    { target, ledgerDir } = resolveSharedIdentity(f.skillsDir),
    file = path.join(target, "cc-example/large.bin");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.mkdirSync(ledgerDir, { recursive: true });
  const bytes = Buffer.alloc(8 * 1024 * 1024, 0x61),
    after = bytes.toString("base64"),
    journal = {
      schemaVersion: 1,
      target,
      phase: "prepared",
      token: "12345678-1234-1234-1234-123456789abc",
      entries: [
        {
          path: file,
          before: null,
          after,
          beforeHash: null,
          afterHash: createHash("sha256").update(bytes).digest("hex"),
        },
      ],
    };
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(
    path.join(ledgerDir, "transaction.json"),
    JSON.stringify(journal),
  );
  assert.equal(await recoverSharedTransaction(f.skillsDir), "recovered");
  assert.equal(fs.existsSync(file), false);
  for (const invalid of ["YQ=", "YQ===", "Y Q==", "YR=="]) {
    journal.entries[0].after = invalid;
    journal.entries[0].afterHash = createHash("sha256")
      .update(Buffer.from(invalid, "base64"))
      .digest("hex");
    fs.writeFileSync(
      path.join(ledgerDir, "transaction.json"),
      JSON.stringify(journal),
    );
    await assert.rejects(recoverSharedTransaction(f.skillsDir), /摘要|内容/);
  }
});

test(
  "Windows 公共事务对大小写等价产品根和路径有界完成",
  { skip: process.platform !== "win32" },
  (t) => {
    const f = sharedFixture(t),
      product = path.join(f.root, "product");
    fs.mkdirSync(product);
    const code = `import {executeSharedPlan} from ${JSON.stringify(new URL("../../src/install/transaction.ts", import.meta.url).href)};const request=${JSON.stringify({ action: "install", skillsDir: f.skillsDir, consumer: f.consumer("backend-craft"), catalog: f.catalog() })};for(const [file,root] of [[${JSON.stringify(path.join(product, "bec-file").toUpperCase())},${JSON.stringify(product)}],[${JSON.stringify(path.join(product, "bec-other"))},${JSON.stringify(product.toUpperCase())}]])await executeSharedPlan(request,{dryRun:true,allowedProductRoots:[root],productMutations:[{path:file,beforeHash:null,after:Buffer.from('owned')}]});console.log('ok');`;
    const run = spawnSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", code],
      { encoding: "utf8", timeout: 3000, windowsHide: true },
    );
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /ok/);
  },
);
