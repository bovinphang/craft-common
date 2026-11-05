import fs from "node:fs";
import path from "node:path";
import { executeSharedPlan } from "../../src/install/transaction.js";
import { readContentCatalog } from "../../src/content/catalog.js";

const [root, crashPoint] = process.argv.slice(2);
const rename = fs.renameSync;
fs.renameSync = (from, to) => {
  rename(from, to);
  const dest = String(to);
  const resource = dest.endsWith(path.join("cc-example", "SKILL.md"));
  const committed =
    dest.endsWith("transaction.json") &&
    JSON.parse(fs.readFileSync(dest, "utf8")).phase === "committed";
  if (
    (crashPoint === "resource" && resource) ||
    (crashPoint === "commit" && committed)
  ) {
    fs.writeSync(process.stdout.fd, "CRASH_READY\n");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  }
};
// The injected rename blocks only this subprocess, retaining its actual partial transaction.
void executeSharedPlan(
  {
    action: "install",
    skillsDir: path.join(root, "runtime/skills"),
    consumer: {
      product: "frontend-craft",
      manifestPath: path.join(root, "frontend-craft/manifest.json"),
      scope: "local",
    },
    catalog: readContentCatalog(path.join(root, "source"), "en"),
  },
  { dryRun: false },
).catch((error) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
