import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import * as common from "../../src/index.js";
import { workspace } from "./fixtures.js";
test("framework facts require actual dependency keys, not package names, comments or source strings", (t) => {
  const root = workspace(t, {
    "plain/Cargo.toml": '[package]\nname="axum"\ndescription="tauri"',
    "plain/src/lib.rs": "// axum tauri electron",
    "node/package.json": JSON.stringify({
      name: "electron",
      description: "electron",
      dependencies: { "electron-builder": "1" },
    }),
    "node/src/main.ts": 'const fake="electron";',
  });
  const report = common.inspectWorkspace({ workspace: root });
  assert.ok(report.units.every((unit) => unit.frameworks.length === 0));
  assert.ok(report.units.every((unit) => !unit.roles.includes("service")));
});
test("Electron framework versions preserve declared constraints and role is independent of language", (t) => {
  const root = workspace(t, {
    "package.json": JSON.stringify({
      devDependencies: { electron: "^39.0.0" },
      main: "main.cjs",
    }),
    "main.cjs": "void 0",
    "renderer.ts": "export {}",
  });
  const unit = common.inspectWorkspace({ workspace: root }).units[0];
  assert.deepEqual(unit.frameworks, [
    { id: "electron", version: "^39.0.0", paths: ["package.json"] },
  ]);
  assert.ok(unit.roles.includes("desktop-core"));
  assert.deepEqual(unit.languages, ["javascript", "typescript"]);
  assert.equal(path.resolve(unit.root), root);
});
