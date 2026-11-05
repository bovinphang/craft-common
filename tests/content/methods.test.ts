import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readMethodResource } from "../../src/content/catalog.js";

test("公共方法资源保留字节并按语言读取，不依赖进程 cwd", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-method-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "methods"));
  fs.mkdirSync(path.join(root, "localized/zh-CN/methods"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "methods/tdd.md"),
    "# TDD\nObservable behavior\n",
  );
  fs.writeFileSync(
    path.join(root, "localized/zh-CN/methods/tdd.md"),
    "# TDD\n可观察行为\n",
  );
  assert.equal(
    readMethodResource(root, "tdd", "en").toString(),
    "# TDD\nObservable behavior\n",
  );
  assert.equal(
    readMethodResource(root, "tdd", "zh-CN").toString(),
    "# TDD\n可观察行为\n",
  );
  assert.throws(() => readMethodResource(root, "debug", "zh-CN"), /debug/);
});
