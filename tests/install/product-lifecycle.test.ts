import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sharedFixture } from "./fixtures.js";
import * as common from "../../src/index.js";
import type {
  ProductDefinition,
  ProductContext,
  ManifestCodec,
  ProductInstallResult,
  InstallSession,
  ProductManifestState,
  FileMutation,
} from "../../src/index.js";

type Request = {
  action: "install" | "update" | "uninstall";
  definition: ProductDefinition;
  context: ProductContext;
  codec: ManifestCodec;
  seed?: { manifest: ProductManifestState; mutations: FileMutation[] };
  adapter: {
    configurationFiles(ctx: ProductContext): string[];
    plan(ctx: ProductContext, session: InstallSession): Promise<void>;
  };
};
const api = common as unknown as {
  runProductLifecycle(input: Request): Promise<ProductInstallResult>;
};
function fixture(t: { after(fn: () => void): void }) {
  assert.equal(typeof api.runProductLifecycle, "function");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-lifecycle-"));
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
    runtime: "copilot",
    scope: "local",
    language: "en",
    cwd: root,
    home: root,
    baseDir: root,
    allowedRoots: [root],
    dryRun: false,
  };
  const codec: ManifestCodec = {
    decode(bytes) {
      return JSON.parse(bytes.toString());
    },
    encode(state) {
      return Buffer.from(JSON.stringify(state));
    },
  };
  const file = path.join(root, "example-owned.txt");
  const request: Request = {
    action: "install",
    definition,
    context,
    codec,
    adapter: {
      configurationFiles() {
        return [];
      },
      async plan(_ctx, session) {
        session.writeManaged(file, Buffer.from("owned"));
      },
    },
  };
  return {
    root,
    file,
    request,
    run: (overrides: Partial<Request> = {}) =>
      api.runProductLifecycle({ ...request, ...overrides }),
  };
}
function snapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of fs.readdirSync(root, {
    recursive: true,
    withFileTypes: true,
  })) {
    const file = path.join(entry.parentPath, entry.name);
    if (entry.isFile())
      result[path.relative(root, file)] = fs
        .readFileSync(file)
        .toString("base64");
    else result[path.relative(root, file) + "/"] = "directory";
  }
  return result;
}

test("seeded relocation preserves copied user edits and their original ownership hash", async (t) => {
  const f = fixture(t),
    oldHash = common.hashBytes(Buffer.from("old"));
  const manifest: ProductManifestState = {
    product: f.request.definition.packageName,
    packageVersion: "0.9.0",
    runtime: f.request.context.runtime,
    scope: "local",
    language: "en",
    installedAt: "2026-01-01",
    files: [{ path: f.file, hash: oldHash }],
    sharedEntries: [],
  };
  const result = await f.run({
    seed: {
      manifest,
      mutations: [
        { path: f.file, beforeHash: null, after: Buffer.from("user edit") },
      ],
    },
  });
  assert.equal(result.status, "partial");
  assert.equal(fs.readFileSync(f.file, "utf8"), "user edit");
  const installed = JSON.parse(
    fs.readFileSync(path.join(f.root, "example-craft.manifest.json"), "utf8"),
  );
  assert.equal(installed.files[0].hash, oldHash);
});

test("declared root aliases identify the same common consumer manifest", async (t) => {
  const f = fixture(t),
    shared = sharedFixture(t),
    alias = path.join(shared.root, "declared-root");
  fs.symlinkSync(
    f.root,
    alias,
    process.platform === "win32" ? "junction" : "dir",
  );
  const context = {
    ...f.request.context,
    baseDir: alias,
    cwd: alias,
    allowedRoots: [alias],
  };
  const result = await common.runProductLifecycle({
    ...f.request,
    context,
    common: {
      action: "install",
      skillsDir: path.join(alias, "skills"),
      catalog: shared.catalog(),
      consumer: {
        product: f.request.definition.consumerProduct,
        scope: "local",
        manifestPath: path.join(alias, f.request.definition.manifestName),
      },
    },
  });
  assert.equal(result.status, "complete");
  assert.equal(fs.readFileSync(f.file, "utf8"), "owned");
});

test("common version, language and digest conflicts reject before product planning or writes", async (t) => {
  const f = fixture(t),
    source = sharedFixture(t),
    catalog = source.catalog();
  const commonRequest = {
    action: "install" as const,
    skillsDir: path.join(f.root, "skills"),
    catalog,
    consumer: {
      product: f.request.definition.consumerProduct,
      manifestPath: path.join(f.root, f.request.definition.manifestName),
      scope: "local" as const,
    },
  };
  await common.runProductLifecycle({ ...f.request, common: commonRequest });
  const before = snapshot(f.root),
    definition = {
      ...f.request.definition,
      packageName: "another-craft",
      consumerProduct: "another-craft",
      manifestName: "another-craft.manifest.json",
      resourcePrefix: "another-",
      stateDirectoryName: ".another-state",
      markerId: "another-craft",
    };
  for (const patch of [
    { packageVersion: "2.0.0" },
    { language: "zh-CN" as const },
    { digest: "different" },
  ]) {
    await assert.rejects(
      common.runProductLifecycle({
        ...f.request,
        definition,
        common: {
          ...commonRequest,
          catalog: { ...catalog, ...patch },
          consumer: {
            ...commonRequest.consumer,
            product: definition.consumerProduct,
            manifestPath: path.join(f.root, definition.manifestName),
          },
        },
        adapter: {
          configurationFiles: () => [],
          async plan() {
            assert.fail("conflicting product adapter must not run");
          },
        },
      }),
    );
    assert.deepEqual(snapshot(f.root), before);
  }
});

test("no-skills lifecycle installs, updates and uninstalls with independent manifests", async (t) => {
  const f = fixture(t);
  assert.equal((await f.run()).status, "complete");
  assert.equal(fs.readFileSync(f.file, "utf8"), "owned");
  assert.ok(fs.existsSync(path.join(f.root, "example-craft.manifest.json")));
  assert.equal((await f.run({ action: "update" })).status, "complete");
  assert.equal((await f.run({ action: "uninstall" })).status, "complete");
  assert.equal(fs.existsSync(f.file), false);
  assert.equal(
    fs.existsSync(path.join(f.root, "example-craft.manifest.json")),
    false,
  );
});

test("dry-run uses the real plan without creating configuration, locks or state", async (t) => {
  const f = fixture(t),
    before = snapshot(f.root);
  const result = await f.run({
    context: { ...f.request.context, dryRun: true },
  });
  assert.equal(result.status, "planned");
  assert.ok(result.changed.includes(f.file));
  assert.deepEqual(snapshot(f.root), before);
});

test("partial uninstall preserves edited files and the remaining ownership record", async (t) => {
  const f = fixture(t);
  await f.run();
  fs.writeFileSync(f.file, "user edit");
  const result = await f.run({ action: "uninstall" });
  assert.equal(result.status, "partial");
  assert.deepEqual(result.preserved, [f.file]);
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(f.root, "example-craft.manifest.json"), "utf8"),
    ).files.length,
    1,
  );
});

test("dry-run pending recovery fails before writes or adapter execution", async (t) => {
  const f = fixture(t),
    state = path.join(f.root, ".example-state");
  fs.mkdirSync(state);
  fs.writeFileSync(path.join(state, "journal.json"), "pending");
  const before = snapshot(f.root);
  await assert.rejects(
    f.run({
      context: { ...f.request.context, dryRun: true },
      adapter: {
        configurationFiles() {
          return [];
        },
        async plan() {
          assert.fail("adapter must not run before recovery");
        },
      },
    }),
    /recover|恢复/i,
  );
  assert.deepEqual(snapshot(f.root), before);
});

test("adapter failure leaves existing product files and manifests untouched", async (t) => {
  const f = fixture(t);
  await f.run();
  const before = snapshot(f.root);
  await assert.rejects(
    f.run({
      action: "update",
      adapter: {
        configurationFiles() {
          return [];
        },
        async plan(_ctx, session) {
          session.writeManaged(f.file, Buffer.from("new"));
          throw new Error("adapter failed");
        },
      },
    }),
    /adapter failed/,
  );
  assert.deepEqual(snapshot(f.root), before);
});

test("failed first installation removes only the empty directories created for its locks", async (t) => {
  const f = fixture(t),
    baseDir = path.join(f.root, "new-config");
  await assert.rejects(
    f.run({
      context: { ...f.request.context, baseDir },
      adapter: {
        configurationFiles: () => [],
        async plan() {
          throw new Error("first install failed");
        },
      },
    }),
    /first install failed/,
  );
  assert.equal(fs.existsSync(baseDir), false);
});
