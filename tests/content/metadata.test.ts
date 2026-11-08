import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readContentCatalog } from "../../src/content/catalog.js";
import { readCapabilityCandidates } from "../../src/content/applicability.js";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const expected = [
  "cc-c-project-standard",
  "cc-cpp-project-standard",
  "cc-debug-methodology",
  "cc-doc-sync-core",
  "cc-drawio-studio",
  "cc-electron-project-standard",
  "cc-go-concurrency",
  "cc-go-project-standard",
  "cc-java-project-standard",
  "cc-java-runtime",
  "cc-native-memory-safety",
  "cc-python-async",
  "cc-python-project-standard",
  "cc-refactoring-core",
  "cc-rust-async",
  "cc-rust-project-standard",
  "cc-source-driven-development",
  "cc-tauri-project-standard",
  "cc-tdd-methodology",
  "cc-technical-diagrams",
  "cc-typescript-project-standard",
];

test("中英文公共能力发现清单完整且无前端旧公共入口", () => {
  for (const lang of ["en", "zh-CN"] as const) {
    const catalog = readContentCatalog(root, lang);
    assert.deepEqual(
      catalog.skills.map((skill) => skill.id),
      expected,
    );
    for (const skill of catalog.skills) {
      const body = fs.readFileSync(
        path.join(catalog.root, "skills", skill.id, "SKILL.md"),
        "utf8",
      );
      assert.match(body, new RegExp(`^name: ${skill.id}$`, "m"));
      assert.ok(body.split(/\r?\n/).length <= 500);
    }
    const metadata = JSON.parse(
      fs.readFileSync(path.join(catalog.root, "skills/metadata.json"), "utf8"),
    ) as Array<{ id: string; version: string; repository: string }>;
    assert.deepEqual(metadata.map((item) => item.id).sort(), expected);
    assert.equal(
      readCapabilityCandidates(
        metadata,
        Object.fromEntries(
          catalog.skills.map((skill) => [skill.id, skill.sourcePackage]),
        ),
      ).length,
      expected.length,
    );
    for (const item of metadata) {
      assert.equal(item.version, catalog.packageVersion);
      assert.equal(
        item.repository,
        "https://github.com/bovinphang/craft-common",
      );
    }
    const relations = JSON.parse(
      fs.readFileSync(path.join(catalog.root, "skills/relations.json"), "utf8"),
    ) as Record<string, { relatedSkills?: string[] }>;
    const queries = JSON.parse(
      fs.readFileSync(
        path.join(catalog.root, "skills/eval_queries.json"),
        "utf8",
      ),
    ) as Record<
      string,
      { should_trigger: string[]; should_not_trigger: string[] }
    >;
    assert.deepEqual(Object.keys(relations).sort(), expected);
    assert.deepEqual(Object.keys(queries).sort(), expected);
    for (const id of expected) {
      assert.ok(queries[id].should_trigger.length > 0);
      assert.ok(queries[id].should_not_trigger.length > 0);
      for (const related of relations[id].relatedSkills ?? [])
        assert.ok(expected.includes(related));
    }
  }
});
