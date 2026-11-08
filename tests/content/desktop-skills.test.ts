import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  collectSkillResources,
  readContentCatalog,
  readCapabilityCandidates,
} from "../../src/index.js";
const root = path.resolve(import.meta.dirname, "../..");
for (const framework of ["tauri", "electron"])
  test(`${framework} specialty has bilingual standalone resources and explicit framework triggers`, () => {
    for (const language of ["en", "zh-CN"] as const) {
      const catalog = readContentCatalog(root, language),
        id = `cc-${framework}-project-standard`,
        directory = path.join(catalog.root, "skills", id),
        files = collectSkillResources(directory).map(
          (file) => file.relativePath,
        );
      for (const required of [
        "SKILL.md",
        "references/practice.md",
        "references/verification.md",
        "examples/minimal/README.md",
      ])
        assert.ok(files.includes(required), required);
      const metadata = JSON.parse(
        fs.readFileSync(
          path.join(catalog.root, "skills/metadata.json"),
          "utf8",
        ),
      );
      assert.deepEqual(
        readCapabilityCandidates(
          metadata,
          Object.fromEntries(
            catalog.skills.map((skill) => [skill.id, skill.sourcePackage]),
          ),
        ).find((item) => item.id === id)?.applicability?.frameworks,
        [framework],
      );
      const queries = JSON.parse(
        fs.readFileSync(
          path.join(catalog.root, "skills/eval_queries.json"),
          "utf8",
        ),
      )[id];
      assert.ok(queries.should_trigger.length >= 8);
      assert.ok(queries.should_not_trigger.length >= 8);
    }
  });
