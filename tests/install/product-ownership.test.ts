import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInstallSession, entryHash } from "../../src/index.js";
import type {
  OwnedEntry,
  ProductDefinition,
  ProductContext,
  ProductManifestState,
} from "../../src/index.js";

function fixture(t: { after(fn: () => void): void }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-ownership-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const definition: ProductDefinition = {
    packageName: "example-craft",
    consumerProduct: "example-craft",
    resourcePrefix: "example-",
    manifestName: "example-craft.manifest.json",
    markerId: "example-craft",
    stateDirectoryName: ".example-state",
  };
  const context: ProductContext = {
    packageVersion: "1.0.0",
    runtime: "claude",
    scope: "local",
    language: "en",
    cwd: root,
    home: root,
    baseDir: root,
    allowedRoots: [root],
    dryRun: false,
  };
  const value = { hooks: [{ command: "example-check", type: "command" }] };
  const entry: OwnedEntry = {
    kind: "json-hook",
    id: "example-craft-hooks",
    event: "Stop",
    value,
    hash: entryHash({ kind: "json-hook", value }),
    createdFile: true,
  };
  return {
    root,
    definition,
    context,
    entry,
    file: path.join(root, "settings.json"),
  };
}

test("shared entries participate in the same draft and retain precise ownership", (t) => {
  const f = fixture(t),
    s = createInstallSession({ ...f, action: "install" });
  const shared = s as unknown as {
    editShared(file: string, entry: OwnedEntry): void;
  };
  assert.equal(typeof shared.editShared, "function");
  shared.editShared(f.file, f.entry);
  assert.deepEqual(JSON.parse(s.read(f.file).toString()), {
    hooks: { Stop: [f.entry.value] },
  });
  const plan = s.finish();
  assert.equal(plan.manifest.files.length, 0);
  assert.equal(plan.manifest.sharedEntries.length, 1);
  assert.equal(fs.existsSync(f.file), false);
  fs.writeFileSync(f.file, plan.mutations[0].after!);
  const uninstall = createInstallSession({
    ...f,
    action: "uninstall",
    previous: plan.manifest,
  }).finish();
  assert.deepEqual(uninstall.manifest.sharedEntries, []);
  assert.equal(uninstall.mutations[0].after, null);
});

test("modified shared entries retain their records on partial uninstall", (t) => {
  const f = fixture(t);
  const previous: ProductManifestState = {
    product: f.definition.packageName,
    packageVersion: "0.9.0",
    runtime: "claude",
    scope: "local",
    language: "en",
    installedAt: "2026-01-01",
    files: [],
    sharedEntries: [{ path: f.file, entry: f.entry }],
  };
  fs.writeFileSync(
    f.file,
    '{"hooks":{"Stop":[{"hooks":[{"command":"user edit"}]}]}}',
  );
  const result = createInstallSession({
    ...f,
    action: "uninstall",
    previous,
  }).finish();
  assert.deepEqual(result.manifest.sharedEntries, previous.sharedEntries);
  assert.deepEqual(result.preserved, [f.file]);
  assert.deepEqual(result.mutations, []);
});

test("shared configuration identity and created-file ownership survive updates", (t) => {
  const f = fixture(t),
    previous: ProductManifestState = {
      product: f.definition.packageName,
      packageVersion: "0.9.0",
      runtime: "claude",
      scope: "local",
      language: "en",
      installedAt: "2026-01-01",
      files: [],
      sharedEntries: [{ path: f.file, entry: f.entry }],
    };
  fs.writeFileSync(
    f.file,
    JSON.stringify({ hooks: { Stop: [f.entry.value] } }),
  );
  const s = createInstallSession({ ...f, action: "update", previous });
  const shared = s as unknown as {
    editShared(file: string, entry: OwnedEntry): void;
  };
  assert.equal(typeof shared.editShared, "function");
  shared.editShared(f.file, { ...f.entry, createdFile: false });
  assert.equal(s.finish().manifest.sharedEntries[0].entry.createdFile, true);
});
