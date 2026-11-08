import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import * as common from "../../src/index.js";
import type {
  ProductContext,
  ProductDefinition,
  ProductManifestState,
  FileMutation,
} from "../../src/index.js";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
type Session = {
  read(file: string): Buffer;
  exists(file: string): boolean;
  stage(file: string, after: Buffer | null): void;
  writeManaged(file: string, after: Buffer): void;
  retireTree(root: string, options?: { rejectUnknown?: boolean }): void;
  finish(): {
    mutations: FileMutation[];
    manifest: ProductManifestState;
    preserved: string[];
    conflicts: string[];
  };
};
type Options = {
  definition: ProductDefinition;
  context: ProductContext;
  previous?: ProductManifestState;
  action: "install" | "update" | "uninstall";
};
const api = common as unknown as {
  createInstallSession(options: Options): Session;
};
function fixture(t: { after(fn: () => void): void }) {
  assert.equal(typeof api.createInstallSession, "function");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-session-"));
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
    runtime: "codex",
    scope: "local",
    language: "en",
    cwd: root,
    home: root,
    baseDir: root,
    allowedRoots: [root],
    dryRun: false,
  };
  const previous = (
    files: ProductManifestState["files"],
  ): ProductManifestState => ({
    product: definition.packageName,
    packageVersion: "0.9.0",
    runtime: "codex",
    scope: "local",
    language: "en",
    installedAt: "2026-01-01T00:00:00Z",
    files,
    sharedEntries: [],
  });
  return {
    root,
    definition,
    context,
    previous,
    create: (extra: Partial<Options> = {}) =>
      api.createInstallSession({
        definition,
        context,
        action: "install",
        ...extra,
      }),
  };
}

test("sessions isolate drafts, read their writes and never touch disk", (t) => {
  const f = fixture(t),
    file = path.join(f.root, "example.txt");
  fs.writeFileSync(file, "old");
  const a = f.create(),
    b = f.create();
  a.stage(file, Buffer.from("first"));
  assert.equal(a.read(file).toString(), "first");
  assert.equal(b.read(file).toString(), "old");
  a.stage(file, Buffer.from("second"));
  const plan = a.finish();
  assert.equal(plan.mutations[0].beforeHash, hash("old"));
  assert.equal(plan.mutations[0].after?.toString(), "second");
  assert.deepEqual(b.finish().mutations, []);
  assert.equal(fs.readFileSync(file, "utf8"), "old");
  assert.throws(() => a.stage(file, null), /closed|finished/i);
});

test("planned deletion reads ENOENT and identical bytes create no mutation", (t) => {
  const f = fixture(t),
    file = path.join(f.root, "example.txt");
  fs.writeFileSync(file, "old");
  const same = f.create();
  same.stage(file, Buffer.from("old"));
  assert.deepEqual(same.finish().mutations, []);
  const gone = f.create();
  gone.stage(file, null);
  assert.equal(gone.exists(file), false);
  assert.throws(() => gone.read(file), { code: "ENOENT" });
  assert.equal(gone.finish().mutations[0].after, null);
  assert.equal(fs.existsSync(file), true);
});

test("managed updates preserve unknown and modified files and their ownership", (t) => {
  const f = fixture(t),
    file = path.join(f.root, "example.txt");
  fs.writeFileSync(file, "user changed");
  const s = f.create({
    action: "update",
    previous: f.previous([{ path: file, hash: hash("old") }]),
  });
  s.writeManaged(file, Buffer.from("new"));
  const result = s.finish();
  assert.deepEqual(result.preserved, [file]);
  assert.deepEqual(result.mutations, []);
  assert.equal(result.manifest.files[0].hash, hash("old"));
  const unknown = f.create();
  unknown.writeManaged(file, Buffer.from("new"));
  assert.deepEqual(unknown.finish().manifest.files, []);
});

test("unrequested unchanged files retire while modified files remain owned", (t) => {
  const f = fixture(t),
    old = path.join(f.root, "old.txt"),
    edited = path.join(f.root, "edited.txt");
  fs.writeFileSync(old, "old");
  fs.writeFileSync(edited, "edited");
  const s = f.create({
    action: "uninstall",
    previous: f.previous([
      { path: old, hash: hash("old") },
      { path: edited, hash: hash("old") },
    ]),
  });
  const result = s.finish();
  assert.deepEqual(result.manifest.files, [
    { path: edited, hash: hash("old") },
  ]);
  assert.deepEqual(
    result.mutations.map((m) => [m.path, m.after]),
    [[old, null]],
  );
  assert.deepEqual(result.preserved, [edited]);
});

test("managed writes use canonical paths and reject foreign resource namespaces", (t) => {
  const f = fixture(t),
    s = f.create();
  for (const relative of [
    "skills/cc-foreign/SKILL.md",
    "agents/other-agent.md",
    "craft-manifests/ledger.json",
    ".example-state/journal.json",
    "example-craft.manifest.json",
  ]) {
    assert.throws(
      () => s.stage(path.join(f.root, relative), Buffer.from("bad")),
      /ownership|reserved|namespace/i,
    );
  }
  assert.throws(
    () => s.stage(path.join(f.root, "..", "outside.txt"), Buffer.from("bad")),
    /boundary/,
  );
  s.writeManaged(
    path.join(f.root, "skills/example-test/references/practice.md"),
    Buffer.from("allowed"),
  );
  assert.equal(s.finish().manifest.files.length, 1);
});

test("strict tree retirement preflights unknown additions without staging partial deletions", (t) => {
  const f = fixture(t),
    root = path.join(f.root, "skills/example-old");
  fs.mkdirSync(root, { recursive: true });
  const owned = path.join(root, "SKILL.md"),
    unknown = path.join(root, "user.txt");
  fs.writeFileSync(owned, "old");
  fs.writeFileSync(unknown, "unknown");
  const s = f.create({
    previous: f.previous([{ path: owned, hash: hash("old") }]),
  });
  assert.throws(
    () => s.retireTree(root, { rejectUnknown: true }),
    /unknown|owned/i,
  );
  assert.equal(s.read(owned).toString(), "old");
  assert.equal(fs.readFileSync(unknown, "utf8"), "unknown");
});

test("previous manifests cannot change identity or claim duplicate/outside paths", (t) => {
  const f = fixture(t),
    file = path.join(f.root, "owned.txt");
  assert.throws(
    () => f.create({ previous: { ...f.previous([]), product: "foreign" } }),
    /identity/i,
  );
  assert.throws(
    () =>
      f.create({
        previous: f.previous([
          { path: file, hash: hash("old") },
          { path: file, hash: hash("old") },
        ]),
      }),
    /duplicate/i,
  );
  assert.throws(
    () =>
      f.create({
        previous: f.previous([
          { path: path.join(f.root, "..", "escape"), hash: hash("old") },
        ]),
      }),
    /boundary/,
  );
});

test("product retention policy keeps unrequested files but explicit retirement removes only its target", (t) => {
  const f = fixture(t),
    a = path.join(f.root, "example-a.md"),
    b = path.join(f.root, "example-b.md");
  fs.writeFileSync(a, "a");
  fs.writeFileSync(b, "b");
  const definition = { ...f.definition, retainUnrequestedFiles: true };
  const previous = f.previous([
    { path: a, hash: hash("a") },
    { path: b, hash: hash("b") },
  ]);
  const kept = f.create({ definition, previous, action: "update" }).finish();
  assert.deepEqual(kept.mutations, []);
  assert.equal(kept.manifest.files.length, 2);
  const retired = f.create({ definition, previous, action: "update" });
  retired.retireTree(a);
  const result = retired.finish();
  assert.deepEqual(
    result.mutations.map((m) => m.path),
    [a],
  );
  assert.deepEqual(result.manifest.files, [{ path: b, hash: hash("b") }]);
});

test("product declarations allow their native metadata and auxiliary rule resources precisely", (t) => {
  const f = fixture(t),
    definition = {
      ...f.definition,
      nativeMetadata: true,
      resourceEntries: { rules: ["references"] },
    };
  const s = f.create({ definition });
  s.writeManaged(
    path.join(f.root, ".claude-plugin/plugin.json"),
    Buffer.from("{}"),
  );
  s.writeManaged(
    path.join(f.root, "rules/references/common/method.md"),
    Buffer.from("method"),
  );
  assert.throws(
    () =>
      s.stage(
        path.join(f.root, ".claude-plugin/user.json"),
        Buffer.from("bad"),
      ),
    /reserved|ownership/i,
  );
  assert.throws(
    () =>
      s.stage(path.join(f.root, "rules/foreign-rule.md"), Buffer.from("bad")),
    /namespace/i,
  );
  assert.equal(s.finish().manifest.files.length, 2);
});

test("declared roots isolate ownership checks from ancestor names and preserve legacy neutral names", (t) => {
  const f = fixture(t),
    root = path.join(f.root, "agents", "my-project");
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, "skills", "custom", "SKILL.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "old");
  const context = {
    ...f.context,
    baseDir: root,
    cwd: root,
    home: root,
    allowedRoots: [root],
  };
  const session = f.create({
    context,
    definition: { ...f.definition, retainUnrequestedFiles: true },
    previous: f.previous([{ path: file, hash: hash("old") }]),
  });
  session.writeManaged(
    path.join(root, "skills/example-test/SKILL.md"),
    Buffer.from("new"),
  );
  assert.equal(session.finish().manifest.files.length, 2);
});
