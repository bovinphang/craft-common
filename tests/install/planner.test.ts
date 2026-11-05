import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { planSharedDeployment } from "../../src/install/planner.js";
import { resolveSharedIdentity } from "../../src/install/identity.js";
import { applyFixturePlan, sharedFixture } from "./fixtures.js";

for (const products of [
  ["frontend-craft", "backend-craft"],
  ["backend-craft", "frontend-craft"],
]) {
  test(`两消费者 ${products.join("→")} 幂等复用和独立卸载`, (t) => {
    const f = sharedFixture(t);
    const request = (product: string) => ({
      action: "install" as const,
      skillsDir: f.skillsDir,
      consumer: f.consumer(product),
      catalog: f.catalog(),
    });
    const first = planSharedDeployment(request(products[0]));
    assert.equal(fs.existsSync(f.skillsDir), false);
    applyFixturePlan(first);
    applyFixturePlan(planSharedDeployment(request(products[1])));
    applyFixturePlan(planSharedDeployment(request(products[1])));
    const { ledgerDir } = resolveSharedIdentity(f.skillsDir);
    const lock = JSON.parse(
      fs.readFileSync(path.join(ledgerDir, "dependencies.lock.json"), "utf8"),
    );
    assert.equal(Object.keys(lock.consumers).length, 2);
    applyFixturePlan(
      planSharedDeployment({ ...request(products[0]), action: "uninstall" }),
    );
    assert.ok(fs.existsSync(path.join(f.skillsDir, "cc-example/SKILL.md")));
    applyFixturePlan(
      planSharedDeployment({ ...request(products[1]), action: "uninstall" }),
    );
    assert.equal(
      fs.existsSync(path.join(f.skillsDir, "cc-example/SKILL.md")),
      false,
    );
  });
}
test("版本、语言和相同版本不同内容冲突均零修改", (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  applyFixturePlan(planSharedDeployment(request));
  for (const patch of [
    { packageVersion: "2.0.0" },
    { language: "zh-CN" as const },
    { digest: "different" },
  ]) {
    const result = planSharedDeployment({
      ...request,
      consumer: f.consumer("backend-craft"),
      catalog: { ...request.catalog, ...patch },
    });
    assert.ok(result.conflicts.length > 0);
    assert.equal(result.mutations.length, 0);
  }
});
test("未知同名公共文件不能被接管", (t) => {
  const f = sharedFixture(t);
  fs.mkdirSync(path.join(f.skillsDir, "cc-example"), { recursive: true });
  fs.writeFileSync(
    path.join(f.skillsDir, "cc-example/SKILL.md"),
    "user content",
  );
  const result = planSharedDeployment({
    action: "install",
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  });
  assert.ok(result.conflicts.length > 0);
  assert.equal(result.mutations.length, 0);
});
test("最后卸载保留用户修改及残留所有权，再安装不能覆盖", (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  applyFixturePlan(planSharedDeployment(request));
  const file = path.join(f.skillsDir, "cc-example/SKILL.md");
  fs.writeFileSync(file, "user edit");
  applyFixturePlan(planSharedDeployment({ ...request, action: "uninstall" }));
  assert.equal(fs.readFileSync(file, "utf8"), "user edit");
  const { ledgerDir } = resolveSharedIdentity(f.skillsDir);
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(ledgerDir, "craft-common.json"), "utf8"),
    ).residual,
    true,
  );
  assert.ok(planSharedDeployment(request).conflicts.length > 0);
});
test("损坏账本与越界源路径拒绝规划", (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  const catalog = f.catalog();
  catalog.skills[0].files[0].relativePath = "../../outside";
  assert.throws(
    () => planSharedDeployment({ ...request, catalog }),
    /路径|边界|越界/,
  );
  const { ledgerDir } = resolveSharedIdentity(f.skillsDir);
  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.writeFileSync(path.join(ledgerDir, "craft-common.json"), "{bad");
  assert.throws(() => planSharedDeployment(request), /账本|JSON/);
});

test("更换资源后伪造旧摘要不能绕过相同版本内容冲突", (t) => {
  const f = sharedFixture(t);
  const old = f.catalog();
  applyFixturePlan(
    planSharedDeployment({
      action: "install",
      skillsDir: f.skillsDir,
      consumer: f.consumer("frontend-craft"),
      catalog: old,
    }),
  );
  fs.appendFileSync(
    path.join(f.source, "skills/cc-example/SKILL.md"),
    "changed source\n",
  );
  const changed = f.catalog();
  changed.digest = old.digest;
  const result = planSharedDeployment({
    action: "install",
    skillsDir: f.skillsDir,
    consumer: f.consumer("backend-craft"),
    catalog: changed,
  });
  assert.ok(result.conflicts.length > 0);
  assert.equal(result.mutations.length, 0);
});

test("消费者声明与公共账本版本不一致时拒绝继续安装", (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  applyFixturePlan(planSharedDeployment(request));
  const { ledgerDir } = resolveSharedIdentity(f.skillsDir);
  const file = path.join(ledgerDir, "dependencies.lock.json");
  const lock = JSON.parse(fs.readFileSync(file, "utf8"));
  lock.consumers[Object.keys(lock.consumers)[0]].requiredVersion = "2.0.0";
  fs.writeFileSync(file, JSON.stringify(lock));
  assert.throws(
    () =>
      planSharedDeployment({
        ...request,
        consumer: f.consumer("backend-craft"),
      }),
    /账本|依赖/,
  );
});

test("产品仍有修改文件时部分卸载保留公共依赖引用", (t) => {
  const f = sharedFixture(t);
  const request = {
    action: "install" as const,
    skillsDir: f.skillsDir,
    consumer: f.consumer("frontend-craft"),
    catalog: f.catalog(),
  };
  applyFixturePlan(planSharedDeployment(request));
  const retained = planSharedDeployment({
    ...request,
    action: "uninstall",
    retainConsumer: true,
  });
  assert.equal(retained.mutations.length, 0);
});
