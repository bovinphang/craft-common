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
const inventory = JSON.parse(
  fs.readFileSync(
    path.join(root, "tests/fixtures/cross-domain-resources.json"),
    "utf8",
  ),
) as Record<string, Record<string, string[]>>;
for (const language of ["en", "zh-CN"] as const)
  test(`all twelve cross-domain entries preserve their complete ${language} resources and applicability`, () => {
    const catalog = readContentCatalog(root, language),
      metadata = JSON.parse(
        fs.readFileSync(
          path.join(catalog.root, "skills/metadata.json"),
          "utf8",
        ),
      );
    const candidates = readCapabilityCandidates(
      metadata,
      Object.fromEntries(
        catalog.skills.map((item) => [item.id, item.sourcePackage]),
      ),
    );
    for (const [id, files] of Object.entries(inventory)) {
      assert.deepEqual(
        collectSkillResources(path.join(catalog.root, "skills", id))
          .map((file) => file.relativePath)
          .sort(),
        [...files[language === "en" ? "en" : "localized/zh-CN/"]].sort(),
      );
      assert.ok(
        candidates.find((item) => item.id === id)?.applicability?.languages
          ?.length,
        `${id} has explicit cross-domain languages`,
      );
      const body = fs.readFileSync(
        path.join(catalog.root, "skills", id, "SKILL.md"),
        "utf8",
      );
      assert.match(body, /library|libraries|CLI|desktop|库|桌面/);
    }
  });
test("Java libraries, CLI and desktop modules do not acquire mandatory HTTP/database layers", () => {
  const practice = fs.readFileSync(
    path.join(root, "skills/cc-java-project-standard/references/practice.md"),
    "utf8",
  );
  assert.match(practice, /desktop|Swing|JavaFX/);
  assert.match(practice, /CLI/);
  assert.doesNotMatch(practice, /^\d\. (?:Keep HTTP|Place transaction scope)/m);
});
test("generic TypeScript references are independent of React components", () => {
  const practice = fs.readFileSync(
    path.join(
      root,
      "skills/cc-typescript-project-standard/references/type-safety-patterns.md",
    ),
    "utf8",
  );
  assert.doesNotMatch(practice, /```tsx|aria-pressed|<ul>/);
  assert.match(practice, /function selectEntity/);
});
