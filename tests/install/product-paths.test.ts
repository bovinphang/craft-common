import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as common from "../../src/index.js";

const api = common as unknown as {
  safeProductPath(file: string, roots: readonly string[]): string;
  productPathKey(file: string): string;
};

test("product paths reject escapes and permit declared root junctions only", (t) => {
  assert.equal(typeof api.safeProductPath, "function");
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "cc-product-paths-"));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
  const actual = path.join(sandbox, "actual"),
    outside = path.join(sandbox, "outside");
  fs.mkdirSync(actual);
  fs.mkdirSync(outside);
  const junction = path.join(sandbox, "declared-root");
  fs.symlinkSync(
    actual,
    junction,
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.equal(
    api.safeProductPath(path.join(junction, "nested", "file.txt"), [junction]),
    path.join(fs.realpathSync.native(actual), "nested", "file.txt"),
  );
  assert.throws(() => api.safeProductPath(outside, [actual]), /boundary|边界/);
  assert.throws(() => api.safeProductPath(actual, [actual]), /boundary|边界/);
  fs.symlinkSync(
    outside,
    path.join(actual, "linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(
    () =>
      api.safeProductPath(path.join(actual, "linked", "file.txt"), [actual]),
    /link|链接/,
  );
});

test("product path keys are bounded and case-insensitive on Windows", () => {
  assert.equal(typeof api.productPathKey, "function");
  const file = path.resolve("Case", "File.txt");
  assert.equal(
    api.productPathKey(file),
    process.platform === "win32" ? file.toLowerCase() : file,
  );
});
