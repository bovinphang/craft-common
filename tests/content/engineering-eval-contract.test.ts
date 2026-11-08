import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
test("engineering comparisons preregister four bounded tasks with material and critical criteria", () => {
  const file = path.join(root, "tests/evals/engineering-practices/scenarios.json");
  assert.ok(fs.existsSync(file), "missing preregistered scenarios");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    schemaVersion: number;
    cases: Array<{ id: string; language: string; prompt: string; materials: Array<{repo:string;skillId:string;paths:string[]}>; criteria: Array<{id:string;critical:boolean;expectation:string}> }>;
  };
  assert.equal(data.schemaVersion, 1);
  assert.deepEqual(data.cases.map(c => c.id), ["Q1", "Q2", "Q3", "Q4"]);
  for (const item of data.cases) {
    assert.equal(item.language, "zh-CN");
    assert.equal(item.criteria.length, 4);
    assert.ok(item.criteria.some(c => c.critical));
    assert.equal(new Set(item.criteria.map(c => c.id)).size, 4);
    assert.ok(item.prompt.length > 40);
    assert.ok(item.materials.length > 0);
    for (const material of item.materials) {
      assert.ok(["craft-common", "frontend-craft", "backend-craft"].includes(material.repo));
      assert.match(material.skillId, /^(cc|fec|bec)-[a-z0-9-]+$/);
      assert.deepEqual(material.paths, ["SKILL.md", "references/**"]);
      assert.ok(fs.existsSync(path.resolve(root, "..", material.repo, "localized/zh-CN/skills", material.skillId, "SKILL.md")));
    }
  }
});
