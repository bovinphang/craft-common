import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readContentCatalog } from "../../src/content/catalog.js";
import type { CommonPlan, Consumer } from "../../src/install/types.js";

export function sharedFixture(t: { after: (fn: () => void) => void }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "共享安装 space "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  fs.mkdirSync(path.join(source, "skills/cc-example"), { recursive: true });
  fs.writeFileSync(
    path.join(source, "package.json"),
    JSON.stringify({
      name: "@bovinphang/craft-common",
      version: "1.0.0",
      repository: { url: "https://github.com/bovinphang/craft-common" },
    }),
  );
  fs.writeFileSync(
    path.join(source, "skills/cc-example/SKILL.md"),
    "---\nname: cc-example\ndescription: Use when testing.\n---\n",
  );
  const consumer = (
    product: string,
    scope: "local" | "global" = "local",
  ): Consumer => ({
    product,
    manifestPath: path.join(root, product, "manifest.json"),
    scope,
  });
  return {
    root,
    source,
    skillsDir: path.join(root, "runtime/skills"),
    catalog: () => readContentCatalog(source, "en"),
    consumer,
  };
}
export function applyFixturePlan(plan: CommonPlan): void {
  if (plan.conflicts.length) throw new Error(plan.conflicts.join("\n"));
  for (const mutation of plan.mutations) {
    if (mutation.after === null) fs.rmSync(mutation.path, { force: true });
    else {
      fs.mkdirSync(path.dirname(mutation.path), { recursive: true });
      fs.writeFileSync(mutation.path, mutation.after);
    }
  }
}
