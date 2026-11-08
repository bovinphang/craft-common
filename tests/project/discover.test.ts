import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as common from "../../src/index.js";
import { workspace } from "./fixtures.js";
test("mixed workspace keeps UI, Tauri core and independent service/library units distinct", (t) => {
  const root = workspace(t, {
    "package.json": JSON.stringify({ workspaces: ["apps/*"] }),
    "apps/ui/package.json": JSON.stringify({
      dependencies: { react: "^19.0.0" },
      devDependencies: { typescript: "~5.9.0" },
    }),
    "apps/ui/src/view.tsx": "export const view=1",
    "apps/ui/src-tauri/Cargo.toml":
      '[package]\nname="desktop"\n[dependencies]\ntauri="2"',
    "apps/ui/src-tauri/tauri.conf.json": '{"build":{"frontendDist":"../dist"}}',
    "native/Cargo.toml": '[package]\nname="library"\n[lib]\npath="src/lib.rs"',
    "native/src/lib.rs": "pub fn f() {}",
    "apps/service/pyproject.toml":
      '[project]\nname="service"\ndependencies=["fastapi>=0.115"]',
  });
  assert.equal(typeof common.inspectWorkspace, "function");
  const report = common.inspectWorkspace({
    workspace: root,
    detectors: [common.npmFrameworkDetector("react", ["react"], ["ui"])],
  });
  const ui = report.units.find(
      (unit) => unit.root === path.join(root, "apps/ui"),
    )!,
    core = report.units.find(
      (unit) => unit.root === path.join(root, "apps/ui/src-tauri"),
    )!,
    library = report.units.find(
      (unit) => unit.root === path.join(root, "native"),
    )!;
  assert.ok(ui.languages.includes("typescript"));
  assert.deepEqual(core.roles, ["desktop-core"]);
  assert.ok(core.languages.includes("rust"));
  assert.ok(ui.relatedRoots.includes(core.root));
  assert.ok(core.relatedRoots.includes(ui.root));
  assert.ok(!ui.relatedRoots.includes(library.root));
  assert.ok(!library.roles.includes("service"));
  assert.ok(!library.frameworks.some((item) => item.id === "axum"));
  assert.ok(!report.truncated);
});
test("language evidence separates C and C++ and supports a Python CLI without assuming services", (t) => {
  const root = workspace(t, {
    "native/CMakeLists.txt": "project(native LANGUAGES C CXX)",
    "native/a.c": "int f(void){return 0;}",
    "native/b.cpp": "int g(){return 0;}",
    "cli/pyproject.toml":
      '[project]\nname="tool"\n[project.scripts]\ntool="tool:main"',
  });
  const report = common.inspectWorkspace({ workspace: root });
  assert.deepEqual(
    report.units.find((unit) => unit.root.endsWith("native"))?.languages,
    ["c", "cpp"],
  );
  assert.deepEqual(
    report.units.find((unit) => unit.root.endsWith("cli"))?.roles,
    ["cli"],
  );
  assert.ok(report.units.every((unit) => !unit.roles.includes("service")));
});
test("bounded scanning excludes sensitive files, dependencies and links; detector reads are whitelisted", (t) => {
  const root = workspace(t, {
      "package.json": '{"name":"tool"}',
      ".env": "SECRET_NEVER_RETURN",
      "node_modules/foreign/Cargo.toml": "[package]",
      "build/generated.cpp": "int x;",
    }),
    outside = workspace(t, { "package.json": '{"name":"outside"}' });
  fs.symlinkSync(
    outside,
    path.join(root, "linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  let secret: unknown = "not called",
    external: unknown = "not called";
  const before = fs.readdirSync(root).sort();
  const report = common.inspectWorkspace({
    workspace: root,
    detectors: [
      {
        id: "probe",
        detect(input) {
          secret = input.readManifest(".env");
          external = input.readManifest("../package.json");
          return undefined;
        },
      },
    ],
  });
  assert.equal(secret, undefined);
  assert.equal(external, undefined);
  assert.doesNotMatch(
    JSON.stringify(report),
    /SECRET_NEVER_RETURN|foreign|generated.cpp|outside/,
  );
  assert.deepEqual(fs.readdirSync(root).sort(), before);
  assert.throws(
    () =>
      common.inspectWorkspace({
        workspace: root,
        taskPath: path.join(root, "linked/file"),
      }),
    /链接|link/i,
  );
  assert.throws(
    () => common.inspectWorkspace({ workspace: root, taskPath: "../outside" }),
    /边界|boundary/i,
  );
});
test("malformed and oversized manifests warn without echoing content or fabricating framework versions", (t) => {
  const root = workspace(t, {
    "bad/package.json":
      '{"dependencies":{"electron":"1"},"private":true,broken SECRET}',
    "huge/package.json": " ".repeat(262145) + "SECRET",
    "safe/package.json": JSON.stringify({
      dependencies: { electron: "https://private:token@invalid/" },
    }),
  });
  const report = common.inspectWorkspace({ workspace: root });
  assert.ok(report.warnings.length >= 2);
  assert.doesNotMatch(JSON.stringify(report), /SECRET|private:token/);
  assert.equal(
    report.units
      .find((unit) => unit.root.endsWith("safe"))
      ?.frameworks.find((item) => item.id === "electron")?.version,
    undefined,
  );
  assert.ok(
    common.inspectWorkspace({ workspace: root, maxEntries: 1 }).truncated,
  );
  assert.ok(
    common.inspectWorkspace({ workspace: root, maxDepth: 0 }).truncated,
  );
  assert.throws(
    () => common.inspectWorkspace({ workspace: root, maxEntries: -1 }),
    /参数|parameter/i,
  );
});
test("Cargo and package workspaces relate only declared members, never arbitrary neighboring crates", (t) => {
  const root = workspace(t, {
    "Cargo.toml": '[workspace]\nmembers=["crates/*"]',
    "crates/a/Cargo.toml": '[package]\nname="a"',
    "crates/b/Cargo.toml": '[package]\nname="b"',
    "other/Cargo.toml": '[package]\nname="other"',
    "web/package.json": JSON.stringify({
      workspaces: { packages: ["renderer"] },
      devDependencies: { electron: "^39" },
    }),
    "web/renderer/package.json": '{"name":"renderer"}',
  });
  const report = common.inspectWorkspace({ workspace: root });
  const cargo = report.units.find((unit) => unit.root === root)!;
  assert.ok(cargo.relatedRoots.includes(path.join(root, "crates/a")));
  assert.ok(!cargo.relatedRoots.includes(path.join(root, "other")));
  assert.ok(
    report.units
      .find((unit) => unit.root === path.join(root, "web"))
      ?.relatedRoots.includes(path.join(root, "web/renderer")),
  );
});
