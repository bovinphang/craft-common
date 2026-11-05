import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveSharedIdentity } from "../../src/install/identity.js";
import { sharedFixture } from "./fixtures.js";
test("真实目标和 junction 别名共享同一身份且解析不写盘", (t) => {
  const f = sharedFixture(t);
  fs.mkdirSync(path.join(f.root, "runtime"));
  fs.symlinkSync(
    path.join(f.root, "runtime"),
    path.join(f.root, "alias"),
    "junction",
  );
  const identity = resolveSharedIdentity(f.skillsDir);
  assert.deepEqual(
    identity,
    resolveSharedIdentity(path.join(f.root, "alias/skills")),
  );
  assert.equal(fs.existsSync(f.skillsDir), false);
  assert.equal(fs.existsSync(identity.ledgerDir), false);
});
test("同一父目录的不同实际目标账本隔离", (t) => {
  const f = sharedFixture(t);
  assert.notEqual(
    resolveSharedIdentity(f.skillsDir).ledgerDir,
    resolveSharedIdentity(path.join(f.root, "runtime/other-skills")).ledgerDir,
  );
});
