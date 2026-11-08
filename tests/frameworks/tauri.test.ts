import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { parse } from "smol-toml";
import { example, execute } from "./fixtures.js";
test("Tauri command core rejects traversal and absolute paths with the same real Rust regression", (t) => {
  const root = example(t, "cc-tauri-project-standard"),
    probe = execute("cargo", ["--version"], root);
  if (probe.error?.message.includes("ENOENT")) {
    t.skip("MISSING cargo; no Rust behavior verification");
    return;
  }
  assert.equal(probe.status, 0, probe.output);
  t.diagnostic(probe.output.trim());
  const args = [
    "test",
    "--manifest-path",
    "core/Cargo.toml",
    "--offline",
    "--locked",
  ];
  const env = { CARGO_TARGET_DIR: path.join(root, "target") };
  const broken = execute(
    "cargo",
    [...args, "--features", "defective"],
    root,
    env,
  );
  assert.notEqual(broken.status, 0);
  assert.match(broken.output, /rejects_traversal.*FAILED/);
  assert.match(broken.output, /test result: FAILED/);
  const fixed = execute("cargo", args, root, env);
  assert.equal(fixed.status, 0, fixed.output);
  assert.match(fixed.output, /test result: ok/);
  t.diagnostic(
    "Rust command-core behavior verified; Tauri GUI, IPC permission activation, signing and bundles NOT RUN",
  );
});
test("Tauri app declares the same command in its wrapper, generated permission and selected window capability", (t) => {
  const root = example(t, "cc-tauri-project-standard"),
    app = path.join(root, "src-tauri");
  const config = JSON.parse(
      fs.readFileSync(path.join(app, "tauri.conf.json"), "utf8"),
    ),
    capability = JSON.parse(
      fs.readFileSync(path.join(app, "capabilities/main.json"), "utf8"),
    );
  assert.deepEqual(config.app.security.capabilities, ["main"]);
  assert.deepEqual(capability.windows, ["main"]);
  assert.deepEqual(capability.permissions, ["allow-read-document"]);
  const permissions = parse(
    fs.readFileSync(path.join(app, "permissions/documents.toml"), "utf8"),
  ) as {
    permission: Array<{ identifier: string; commands: { allow: string[] } }>;
  };
  assert.equal(permissions.permission[0].identifier, "allow-read-document");
  assert.deepEqual(permissions.permission[0].commands.allow, ["read_document"]);
  assert.match(
    fs.readFileSync(path.join(app, "build.rs"), "utf8"),
    /AppManifest::new\(\)\.commands\(&\["read_document"\]\)/,
  );
  assert.match(
    fs.readFileSync(path.join(app, "src/main.rs"), "utf8"),
    /document_core::read_document/,
  );
  t.diagnostic(
    "Configuration consistency only; runtime permission activation NOT RUN",
  );
});
