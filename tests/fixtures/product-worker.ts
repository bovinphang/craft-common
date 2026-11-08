import fs from "node:fs";
import path from "node:path";
import {
  executeProductPlan,
  withProductConfigurationLocks,
} from "../../src/index.js";
import type { ProductContext, ProductDefinition } from "../../src/index.js";

const [root, phase] = process.argv.slice(2);
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
const pause = (): void => {
  fs.writeSync(process.stdout.fd, "PRODUCT_READY\n");
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
};
if (phase === "lock") {
  void withProductConfigurationLocks(
    [path.join(root, "settings.json")],
    async () => pause(),
  );
} else {
  const rename = fs.renameSync;
  fs.renameSync = (from, to) => {
    rename(from, to);
    const file = String(to);
    if (
      (phase === "prepared" && file === path.join(root, "example-first.txt")) ||
      (phase === "committed" &&
        file.endsWith("journal.json") &&
        JSON.parse(fs.readFileSync(file, "utf8")).phase === "committed")
    )
      pause();
  };
  void executeProductPlan({ definition, context }, [
    {
      path: path.join(root, "example-first.txt"),
      beforeHash: null,
      after: Buffer.from("first"),
    },
    {
      path: path.join(root, "example-second.txt"),
      beforeHash: null,
      after: Buffer.from("second"),
    },
  ]).catch((error) => {
    process.stderr.write(String(error));
    process.exitCode = 1;
  });
}
