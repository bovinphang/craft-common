import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import {
  recoverProductTransaction,
  withProductConfigurationLocks,
} from "../../src/index.js";
import type { ProductContext, ProductDefinition } from "../../src/index.js";

for (const phase of ["prepared", "committed", "lock"] as const) {
  test(
    `real product subprocess recovery at ${phase}`,
    { timeout: 15000 },
    async (t) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-product-crash-"));
      t.after(() => fs.rmSync(root, { recursive: true, force: true }));
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
        cwd: root,
        home: root,
        baseDir: root,
        allowedRoots: [root],
        dryRun: false,
      };
      const env = { ...process.env };
      delete env.NODE_TEST_CONTEXT;
      const child = spawn(
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          fileURLToPath(
            new URL("../fixtures/product-worker.ts", import.meta.url),
          ),
          root,
          phase,
        ],
        { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
      );
      t.after(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      });
      await new Promise<void>((resolve, reject) => {
        let output = "",
          errors = "";
        const timer = setTimeout(
          () =>
            reject(
              new Error(`Worker did not reach checkpoint: ${output} ${errors}`),
            ),
          10000,
        );
        child.stderr.on("data", (bytes) => {
          errors += String(bytes);
        });
        child.stdout.on("data", (bytes) => {
          output += String(bytes);
          if (output.includes("PRODUCT_READY")) {
            clearTimeout(timer);
            resolve();
          }
        });
        child.once("exit", (code) => {
          clearTimeout(timer);
          if (!output.includes("PRODUCT_READY"))
            reject(new Error(`Worker exited ${code}: ${errors}`));
        });
      });
      if (phase === "lock")
        await assert.rejects(
          withProductConfigurationLocks(
            [path.join(root, "settings.json")],
            async () => assert.fail("live configuration lease must block"),
          ),
          /lock|running/i,
        );
      else
        await assert.rejects(
          recoverProductTransaction({ definition, context }),
          /lock|running/i,
        );
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
      if (phase === "lock") {
        await withProductConfigurationLocks(
          [path.join(root, "settings.json")],
          async () =>
            fs.writeFileSync(
              path.join(root, "settings.json"),
              "recovered owner",
            ),
        );
        assert.equal(
          fs.readFileSync(path.join(root, "settings.json"), "utf8"),
          "recovered owner",
        );
      } else {
        assert.equal(
          await recoverProductTransaction({ definition, context }),
          "recovered",
        );
        assert.equal(
          fs.existsSync(path.join(root, "example-first.txt")),
          phase === "committed",
        );
        assert.equal(
          fs.existsSync(path.join(root, "example-second.txt")),
          phase === "committed",
        );
        assert.equal(
          await recoverProductTransaction({ definition, context }),
          "clean",
        );
      }
    },
  );
}
