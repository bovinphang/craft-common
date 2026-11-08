import test from "node:test";
import assert from "node:assert/strict";
import * as common from "../../src/index.js";
const sources = { "cc-example": "@bovinphang/craft-common" };
test("old metadata remains valid without inferring a language or role from the product", () => {
  assert.equal(typeof common.readCapabilityCandidates, "function");
  assert.deepEqual(
    common.readCapabilityCandidates(
      [{ id: "cc-example", platforms: ["codex"], other: "retained upstream" }],
      sources,
    ),
    [{ id: "cc-example", sourcePackage: sources["cc-example"] }],
  );
});
test("applicability supports multiple languages and roles using verified sources", () => {
  const applicability = {
    languages: ["typescript", "rust"],
    frameworks: ["tauri"],
    roles: ["ui", "desktop-core"],
    taskKinds: ["ipc", "review"],
  };
  assert.deepEqual(
    common.readCapabilityCandidates(
      [{ id: "cc-example", sourcePackage: "untrusted", applicability }],
      sources,
    ),
    [{ id: "cc-example", sourcePackage: sources["cc-example"], applicability }],
  );
});
for (const applicability of [
  { roles: ["codex"] },
  { roles: "service" },
  { taskKinds: ["install"] },
  { languages: [1] },
  { frameworks: [] },
  null,
])
  test(`rejects invalid applicability ${JSON.stringify(applicability)}`, () => {
    assert.throws(() =>
      common.readCapabilityCandidates(
        [{ id: "cc-example", applicability }],
        sources,
      ),
    );
  });
test("duplicate IDs, unknown sources and malformed metadata are rejected", () => {
  for (const metadata of [
    [{ id: "cc-example" }, { id: "cc-example" }],
    [{ id: "other" }],
    {},
    [null],
  ])
    assert.throws(() => common.readCapabilityCandidates(metadata, sources));
});
