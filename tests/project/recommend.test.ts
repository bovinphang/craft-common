import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import * as common from "../../src/index.js";
import { workspace } from "./fixtures.js";
const catalog: common.CapabilityCandidate[] = [
  {
    id: "cc-rust",
    sourcePackage: "common",
    applicability: { languages: ["rust"] },
  },
  {
    id: "cc-tauri",
    sourcePackage: "common",
    applicability: { frameworks: ["tauri"], taskKinds: ["ipc", "build"] },
  },
  {
    id: "fec-ui",
    sourcePackage: "frontend",
    applicability: { roles: ["ui"], taskKinds: ["ui", "ipc"] },
  },
  {
    id: "bec-axum",
    sourcePackage: "backend",
    applicability: { frameworks: ["axum"], roles: ["service"] },
  },
  { id: "unannotated", sourcePackage: "common" },
];
test("task recommendation respects nearest unit, AND/OR dimensions and evidenced IPC app links", (t) => {
  assert.equal(typeof common.recommendCapabilities, "function");
  const root = workspace(t, {
    "app/package.json": '{"dependencies":{"react":"19"}}',
    "app/src/view.tsx": "",
    "app/src-tauri/Cargo.toml": '[dependencies]\ntauri="2"',
    "app/src-tauri/tauri.conf.json": "{}",
    "lib/Cargo.toml": '[package]\nname="ordinary"',
    "lib/src/lib.rs": "",
    "service/Cargo.toml": '[dependencies]\naxum="0.8"',
  });
  const inspection = common.inspectWorkspace({
    workspace: root,
    detectors: [
      common.npmFrameworkDetector("react", ["react"], ["ui"]),
      common.cargoFrameworkDetector("axum", "axum", ["service"]),
    ],
  });
  const rec = (kind: common.TaskKind, p: string, c = catalog) =>
    common.recommendCapabilities({
      inspection,
      catalog: c,
      task: { path: path.join(root, p), kind },
    });
  assert.deepEqual(
    rec("ui", "app/src/view.tsx").map((r) => r.id),
    ["fec-ui"],
  );
  assert.deepEqual(
    rec("ipc", "app/src-tauri/src/lib.rs").map((r) => r.id),
    ["cc-rust", "cc-tauri", "fec-ui"],
  );
  assert.deepEqual(
    rec("review", "lib/src/lib.rs").map((r) => r.id),
    ["cc-rust"],
  );
  assert.ok(
    rec(
      "ipc",
      "app/src/view.tsx",
      catalog.filter((c) => c.sourcePackage !== "backend"),
    ).every((r) => !r.id.startsWith("bec-")),
  );
  assert.throws(() => rec("ui", "../outside"), /边界|越界/);
  const all = common.recommendCapabilities({ inspection, catalog });
  assert.ok(all.some((r) => r.id === "bec-axum"));
  assert.ok(all.every((r) => r.projectRoots.length && r.reasons.length));
});
test("framework and language conditions must hold on the same unit; IPC does not bridge unrelated workspace siblings", (t) => {
  assert.equal(typeof common.recommendCapabilities, "function");
  const root = workspace(t, {
    "package.json": '{"workspaces":["apps/*"]}',
    "apps/ui/package.json": '{"dependencies":{"react":"19"}}',
    "apps/ui/view.tsx": "",
    "apps/service/Cargo.toml": '[dependencies]\naxum="0.8"',
  });
  const inspection = common.inspectWorkspace({
    workspace: root,
    detectors: [
      common.npmFrameworkDetector("react", ["react"], ["ui"]),
      common.cargoFrameworkDetector("axum", "axum", ["service"]),
    ],
  });
  const candidates = [
    ...catalog,
    {
      id: "impossible",
      sourcePackage: "common",
      applicability: {
        languages: ["rust"],
        roles: ["ui"] as common.ProjectRole[],
      },
    },
  ];
  assert.deepEqual(
    common
      .recommendCapabilities({
        inspection,
        catalog: candidates,
        task: { path: "apps/ui/view.tsx", kind: "ipc" },
      })
      .map((r) => r.id),
    ["fec-ui"],
  );
  assert.ok(
    !common
      .recommendCapabilities({ inspection, catalog: candidates })
      .some((r) => r.id === "impossible"),
  );
});
