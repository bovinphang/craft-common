import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("发布包脱离源码和 node_modules 后可读取完整内容及安装协议", (t) => {
  execSync("pnpm build", { cwd: root, stdio: "pipe" });
  const packed = JSON.parse(
    execSync("npm pack --dry-run --json --ignore-scripts", {
      cwd: root,
      encoding: "utf8",
    }),
  ) as Array<{ files: Array<{ path: string }> }>;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cc-npm-isolated-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const { path: relative } of packed[0].files) {
    const dest = path.join(directory, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, relative), dest);
  }
  // Execute the actual immutable archive, not only a dry-run file selection.
  const archiveInfo = JSON.parse(
    execSync("npm pack --json --ignore-scripts", {
      cwd: directory,
      encoding: "utf8",
    }),
  ) as Array<{ filename: string }>;
  assert.equal(path.basename(archiveInfo[0].filename), archiveInfo[0].filename);
  const extracted = fs.mkdtempSync(
    path.join(os.tmpdir(), "cc-actual-archive-"),
  );
  t.after(() => fs.rmSync(extracted, { recursive: true, force: true }));
  execFileSync("tar", [
    "-xzf",
    path.join(directory, archiveInfo[0].filename),
    "-C",
    extracted,
  ]);
  const archiveRoot = path.join(extracted, "package");
  for(const prefix of ["","localized/zh-CN/"])assert.deepEqual(
    fs.readFileSync(path.join(archiveRoot,prefix,"skills/cc-typescript-project-standard/examples/engineering/pnpm-lock.yaml")),
    fs.readFileSync(path.join(root,prefix,"skills/cc-typescript-project-standard/examples/engineering/pnpm-lock.yaml")),
    "actual archive must retain the nested sample lock",
  );
  const enhanced = fs
    .readdirSync(path.join(root, "skills"))
    .filter((id) =>
      fs.existsSync(
        path.join(root, "skills", id, "references/engineering-practices.md"),
      ),
    );
  assert.equal(enhanced.length, 14);
  for (const prefix of ["", "localized/zh-CN/"])
    for (const id of enhanced)
      for (const resource of [
        "references/engineering-practices.md",
        "references/common/engineering-practices.md",
        "references/common/engineering-practices.sources.json",
        "references/common/engineering-practices.rules.json",
      ]) {
        assert.deepEqual(
          fs.readFileSync(
            path.join(archiveRoot, prefix, "skills", id, resource),
          ),
          fs.readFileSync(path.join(root, prefix, "skills", id, resource)),
        );
      }
  assert.ok(fs.existsSync(path.join(directory, "dist/index.d.ts")));
  assert.ok(
    fs.existsSync(
      path.join(directory, "skills/cc-drawio-studio/styles/schema.json"),
    ),
  );
  const entry = pathToFileURL(path.join(archiveRoot, "dist/index.js")).href;
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const api = await import(${JSON.stringify(entry)}); console.log(JSON.stringify({ skills: api.readContentCatalog(process.argv[1], "en").skills.length, localized: api.readContentCatalog(process.argv[1], "zh-CN").skills.length, transaction: typeof api.executeSharedPlan }));`,
      archiveRoot,
    ],
    { cwd: directory, encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(output), {
    skills: 21,
    localized: 21,
    transaction: "function",
  });
  assert.equal(fs.existsSync(path.join(directory, "node_modules")), false);
});
