import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { packSkills } from "../../scripts/pack-skills.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
test("公共独立包保留来源版本、完整资源及许可证", (t) => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "cc-packed-"));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  packSkills(root, output);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(output, "cc-drawio-studio/package.json"), "utf8"),
  );
  assert.equal(pkg.name, "@bovinphang/cc-drawio-studio");
  assert.equal(pkg.version, JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version);
  assert.equal(
    pkg.repository.url,
    "https://github.com/bovinphang/craft-common",
  );
  assert.ok(pkg.files.includes("styles"));
  assert.ok(
    fs.existsSync(
      path.join(output, "cc-drawio-studio/styles/built-in/default.json"),
    ),
  );
  assert.ok(fs.existsSync(path.join(output, "cc-drawio-studio/LICENSE")));
  assert.ok(
    fs.existsSync(path.join(output, "cc-tdd-methodology/references/method.md")),
  );
});
