import test from "node:test";
import assert from "node:assert/strict";
import * as common from "../../src/index.js";
import type { ProductDefinition, OwnedEntry } from "../../src/index.js";

type HashInput = { kind: OwnedEntry["kind"]; value: unknown; id?: string };
const api = common as unknown as {
  entryHash(entry: HashInput, owner?: ProductDefinition): string;
  planConfigEntry(input: {
    before: Buffer | null;
    owner: ProductDefinition;
    entry: OwnedEntry;
    previous?: OwnedEntry;
    action: "upsert" | "remove";
  }): { after: Buffer | null; status: "changed" | "unchanged" | "preserved" };
};
function owner(markerId: string, prefix: string): ProductDefinition {
  assert.equal(typeof api.planConfigEntry, "function");
  assert.equal(typeof api.entryHash, "function");
  return {
    packageName: markerId,
    consumerProduct: markerId,
    resourcePrefix: prefix,
    manifestName: `${markerId}.manifest.json`,
    stateDirectoryName: `.${markerId}-state`,
    markerId,
  };
}
function entry(
  definition: ProductDefinition,
  kind: "json-path" | "toml-key",
  value: unknown,
): OwnedEntry {
  return {
    kind,
    id: definition.markerId,
    path: ["agents", definition.resourcePrefix + "review"],
    value,
    hash: api.entryHash({ kind, value }),
    createdFile: false,
  };
}

for (const kind of ["json-path", "toml-key"] as const) {
  test(`${kind} preserves users and the other product on exact removal`, () => {
    const a = owner("alpha-craft", "alpha-"),
      b = owner("beta-craft", "beta-");
    const initial = Buffer.from(
      kind === "json-path"
        ? '{"theme":"dark"}\n'
        : '# user comment\ntheme = "dark"\n',
    );
    const ea = entry(a, kind, { description: "alpha" }),
      eb = entry(b, kind, { description: "beta" });
    const first = api.planConfigEntry({
      before: initial,
      owner: a,
      entry: ea,
      action: "upsert",
    });
    const second = api.planConfigEntry({
      before: first.after,
      owner: b,
      entry: eb,
      action: "upsert",
    });
    const removed = api.planConfigEntry({
      before: second.after,
      owner: a,
      entry: ea,
      previous: ea,
      action: "remove",
    });
    assert.equal(removed.status, "changed");
    assert.match(removed.after!.toString(), /dark/);
    assert.match(removed.after!.toString(), /beta/);
    assert.doesNotMatch(removed.after!.toString(), /alpha/);
    if (kind === "toml-key")
      assert.match(removed.after!.toString(), /# user comment/);
    const changed = Buffer.from(
      second.after!.toString().replace('"alpha"', '"user edit"'),
    );
    const preserved = api.planConfigEntry({
      before: changed,
      owner: a,
      entry: ea,
      previous: ea,
      action: "remove",
    });
    assert.equal(preserved.status, "preserved");
    assert.deepEqual(preserved.after, changed);
  });
}

test("text markers use the declared owner and reject duplicate or user-edited fragments", () => {
  const a = owner("alpha-craft", "alpha-"),
    b = owner("beta-craft", "beta-");
  const make = (o: ProductDefinition, value: string): OwnedEntry => ({
    kind: "text-marker",
    id: o.markerId,
    value,
    hash: api.entryHash({ kind: "text-marker", id: o.markerId, value }, o),
    createdFile: false,
  });
  const ea = make(a, "alpha body"),
    eb = make(b, "beta body");
  const first = api.planConfigEntry({
    before: Buffer.from("User\n"),
    owner: a,
    entry: ea,
    action: "upsert",
  });
  const both = api.planConfigEntry({
    before: first.after,
    owner: b,
    entry: eb,
    action: "upsert",
  });
  const removed = api.planConfigEntry({
    before: both.after,
    owner: a,
    entry: ea,
    previous: ea,
    action: "remove",
  });
  assert.equal(
    removed.after!.toString(),
    "User\n\n<!-- beta-craft:start -->\nbeta body\n<!-- beta-craft:end -->\n",
  );
  for (const before of [
    Buffer.concat([first.after!, first.after!]),
    Buffer.from(first.after!.toString().replace("alpha body", "user body")),
  ]) {
    const result = api.planConfigEntry({
      before,
      owner: a,
      entry: ea,
      previous: ea,
      action: "remove",
    });
    assert.equal(result.status, "preserved");
    assert.deepEqual(result.after, before);
  }
});

test("hooks remove only the owned entry and keep unrelated user hooks", () => {
  const a = owner("alpha-craft", "alpha-");
  const hook = { hooks: [{ type: "command", command: "alpha-check" }] };
  const owned: OwnedEntry = {
    kind: "json-hook",
    event: "Stop",
    id: "alpha-craft-hooks",
    value: hook,
    hash: api.entryHash({ kind: "json-hook", value: hook }),
    createdFile: false,
  };
  const initial = Buffer.from(
    '{"hooks":{"Stop":[{"hooks":[{"command":"user-check"}]}]},"theme":"dark"}',
  );
  const installed = api.planConfigEntry({
    before: initial,
    owner: a,
    entry: owned,
    action: "upsert",
  });
  const removed = api.planConfigEntry({
    before: installed.after,
    owner: a,
    entry: owned,
    previous: owned,
    action: "remove",
  });
  assert.deepEqual(JSON.parse(removed.after!.toString()), {
    hooks: { Stop: [{ hooks: [{ command: "user-check" }] }] },
    theme: "dark",
  });
});

test("missing removal does not create files and newly created empty configs can be removed", () => {
  const a = owner("alpha-craft", "alpha-");
  const owned = { ...entry(a, "json-path", "value"), createdFile: true };
  assert.deepEqual(
    api.planConfigEntry({
      before: null,
      owner: a,
      entry: owned,
      previous: owned,
      action: "remove",
    }),
    { after: null, status: "unchanged" },
  );
  const installed = api.planConfigEntry({
    before: null,
    owner: a,
    entry: owned,
    action: "upsert",
  });
  assert.equal(
    api.planConfigEntry({
      before: installed.after,
      owner: a,
      entry: owned,
      previous: owned,
      action: "remove",
    }).after,
    null,
  );
});

test("malformed configs, duplicate keys and foreign/prototype paths fail safely", () => {
  const a = owner("alpha-craft", "alpha-"),
    owned = entry(a, "json-path", "value");
  for (const text of ["{bad", "[]", '{"theme":1,"theme":2}']) {
    assert.throws(() =>
      api.planConfigEntry({
        before: Buffer.from(text),
        owner: a,
        entry: owned,
        action: "upsert",
      }),
    );
  }
  assert.throws(() =>
    api.planConfigEntry({
      before: Buffer.from("{}"),
      owner: a,
      entry: { ...owned, path: ["__proto__", "polluted"] } as OwnedEntry,
      action: "upsert",
    }),
  );
  assert.throws(() =>
    api.planConfigEntry({
      before: null,
      owner: a,
      entry: { ...owned, id: "foreign-owner" },
      action: "upsert",
    }),
  );
});
