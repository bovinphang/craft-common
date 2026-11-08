import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as common from "../../src/index.js";

function fixture(t: { after(fn: () => void): void }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-snapshot-")),
    source = path.join(root, "source"),
    product = path.join(root, "product");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(product, { recursive: true });
  fs.mkdirSync(source);
  fs.writeFileSync(
    path.join(source, "package.json"),
    JSON.stringify({
      name: "@bovinphang/craft-common",
      version: "1.0.0",
      repository: "https://github.com/bovinphang/craft-common",
    }),
  );
  for (const prefix of ["", "localized/zh-CN/"]) {
    fs.mkdirSync(path.join(source, prefix, "skills/cc-example"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(source, prefix, "skills/cc-example/SKILL.md"),
      "---\nname: cc-example\n---\n",
    );
    for (const [name, value] of Object.entries({
      metadata: [{ id: "cc-example" }],
      relations: { "cc-example": {} },
      eval_queries: {
        "cc-example": {
          should_trigger: ["example"],
          should_not_trigger: ["other"],
        },
      },
    }))
      fs.writeFileSync(
        path.join(source, prefix, `skills/${name}.json`),
        JSON.stringify(value),
      );
  }
  const run = (check = false) => {
    assert.equal(typeof common.syncProductSnapshot, "function");
    common.syncProductSnapshot({
      productRoot: product,
      commonRoot: source,
      check,
      domainMethods: [],
      extraResources: [],
      retiredIds: { "old-example": "cc-example" },
    });
  };
  return { root, source, product, run };
}
function snapshot(root: string) {
  return Object.fromEntries(
    fs
      .readdirSync(root, { recursive: true, withFileTypes: true })
      .map((entry) => [
        path.relative(root, path.join(entry.parentPath, entry.name)),
        entry.isDirectory()
          ? "directory"
          : fs
              .readFileSync(path.join(entry.parentPath, entry.name))
              .toString("base64"),
      ]),
  );
}
test("protected snapshots preserve product indexes, rewrite retired references and check without writes", (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.product, "skills"));
  fs.writeFileSync(
    path.join(f.product, "skills/metadata.json"),
    JSON.stringify([{ id: "domain-example" }, { id: "old-example" }]),
  );
  fs.writeFileSync(
    path.join(f.product, "skills/relations.json"),
    JSON.stringify({ "domain-example": { relatedSkills: ["old-example"] } }),
  );
  f.run();
  const before = snapshot(f.product);
  f.run(true);
  assert.deepEqual(snapshot(f.product), before);
  f.run();
  assert.deepEqual(snapshot(f.product), before);
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(path.join(f.product, "skills/metadata.json"), "utf8"),
    ).map((item: { id: string }) => item.id),
    ["cc-example", "domain-example"],
  );
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(path.join(f.product, "skills/relations.json"), "utf8"),
    )["domain-example"].relatedSkills,
    ["cc-example"],
  );
});
test("one unknown resource rejects the entire refresh before any bytes change", (t) => {
  const f = fixture(t);
  f.run();
  fs.writeFileSync(
    path.join(f.product, "skills/cc-example/unknown.md"),
    "user",
  );
  fs.appendFileSync(path.join(f.source, "skills/cc-example/SKILL.md"), "new");
  const before = snapshot(f.product);
  for (const check of [false, true]) {
    assert.throws(() => f.run(check), /未知|额外/);
    assert.deepEqual(snapshot(f.product), before);
  }
});
test("missing Chinese content and unknown output collisions never produce partial snapshots", (t) => {
  const f = fixture(t);
  fs.unlinkSync(
    path.join(f.source, "localized/zh-CN/skills/cc-example/SKILL.md"),
  );
  const before = snapshot(f.product);
  assert.throws(() => f.run());
  assert.deepEqual(snapshot(f.product), before);
});
test("unknown declared extra output is preserved rather than adopted", (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.product, "user.md"), "user");
  const before = snapshot(f.product);
  assert.throws(
    () =>
      common.syncProductSnapshot({
        productRoot: f.product,
        commonRoot: f.source,
        check: false,
        domainMethods: [],
        extraResources: [
          { source: "skills/cc-example/SKILL.md", target: "user.md" },
        ],
        retiredIds: {},
      }),
    /未知|认领/,
  );
  assert.deepEqual(snapshot(f.product), before);
});
