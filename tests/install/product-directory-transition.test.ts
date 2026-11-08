import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  executeProductPlan,
  executeSharedPlan,
  hashBytes,
  type ProductContext,
  type ProductDefinition,
} from "../../src/index.js";
import { sharedFixture } from "./fixtures.js";

for (const shared of [false, true])
  for (const fail of [false, true]) {
    test(`legacy file-to-directory transition is atomic: shared=${shared}, rollback=${fail}`, async (t) => {
      const f = sharedFixture(t),
        legacy = path.join(f.root, ".legacy"),
        backup = legacy + ".example-backup",
        original = Buffer.from("user legacy rules\n"),
        child = path.join(legacy, "example-generated.md");
      fs.writeFileSync(legacy, original);
      const definition: ProductDefinition = {
        packageName: "example-craft",
        consumerProduct: "example-craft",
        resourcePrefix: "example-",
        manifestName: "example-craft.manifest.json",
        stateDirectoryName: ".example-state",
        markerId: "example-craft",
      };
      const context: ProductContext = {
        packageVersion: "1.0.0",
        runtime: "cline",
        scope: "local",
        language: "en",
        cwd: f.root,
        home: f.root,
        baseDir: f.root,
        allowedRoots: [f.root],
        dryRun: false,
      };
      const mutations = [
        { path: backup, beforeHash: null, after: original },
        { path: legacy, beforeHash: hashBytes(original), after: null },
        {
          path: path.join(legacy, "legacy.md"),
          beforeHash: null,
          after: original,
        },
        { path: child, beforeHash: null, after: Buffer.from("generated") },
      ];
      const rename = fs.renameSync;
      if (fail)
        t.mock.method(
          fs,
          "renameSync",
          (from: fs.PathLike, to: fs.PathLike) => {
            if (String(to) === child)
              throw new Error("injected transition failure");
            return rename(from, to);
          },
        );
      const run = () =>
        shared
          ? executeSharedPlan(
              {
                action: "install",
                skillsDir: f.skillsDir,
                consumer: {
                  product: "example-craft",
                  manifestPath: path.join(
                    f.root,
                    "example-craft.manifest.json",
                  ),
                  scope: "local",
                },
                catalog: f.catalog(),
              },
              {
                dryRun: false,
                productMutations: mutations,
                allowedProductRoots: [f.root],
              },
            )
          : executeProductPlan({ definition, context }, mutations);
      if (fail) {
        await assert.rejects(run(), /injected transition failure/);
        assert.deepEqual(fs.readFileSync(legacy), original);
        assert.equal(fs.existsSync(backup), false);
      } else {
        await run();
        assert.equal(fs.lstatSync(legacy).isDirectory(), true);
        assert.deepEqual(fs.readFileSync(backup), original);
        assert.deepEqual(
          fs.readFileSync(path.join(legacy, "legacy.md")),
          original,
        );
        assert.equal(fs.readFileSync(child, "utf8"), "generated");
      }
    });
  }
