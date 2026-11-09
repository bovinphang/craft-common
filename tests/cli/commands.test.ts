import test from "node:test";
import assert from "node:assert/strict";
import { createCraftCli } from "../../src/cli/commands.js";
import type {
  CliProductAdapter,
  CliResourceOptions,
} from "../../src/cli/types.js";

test("product definitions configure supported languages and installation defaults", async () => {
  const calls: CliResourceOptions[] = [];
  const run = createCraftCli(
    {
      packageName: "@test/craft",
      commandName: "craft",
      binName: "craft",
      version: "1.0.0",
      runtimes: ["codex"],
      languages: ["zh-CN"],
      defaults: {
        runtime: "codex",
        language: "zh-CN",
        scope: "local",
        setupScope: "global",
      },
    },
    {
      discover: async () => [],
      resource: async (options) => {
        calls.push(options);
        return {};
      },
    },
  );
  const io = {
    cwd: "/project",
    home: "/home",
    productRoot: "/package",
    env: {},
    isTTY: false,
    stdout: () => {},
    stderr: () => {},
  };
  assert.equal(await run([], io), 0);
  assert.equal(calls[0].runtime, "codex");
  assert.equal(calls[0].language, "zh-CN");
  assert.equal(calls[0].scope, "local");
  await run(["setup", "codex"], io);
  assert.equal(calls[1].scope, "global");
  assert.equal(await run(["setup", "codex", "--lang=en"], io), 2);
  assert.equal(calls.length, 2);
});

for (const commandName of ["frontend-craft", "backend-craft"]) {
  function fixture() {
    const calls: CliResourceOptions[] = [],
      output: string[] = [];
    const adapter: CliProductAdapter = {
      discover: async () => [
        { runtime: "codex", scope: "local", language: "zh-CN" },
      ],
      resource: async (options) => {
        calls.push(options);
        return { value: { status: "planned" } };
      },
    };
    const run = createCraftCli(
      {
        packageName: `@bovinphang/${commandName}`,
        commandName,
        binName: commandName === "frontend-craft" ? "fec" : "bec",
        version: "1.0.0",
        runtimes: ["claude", "codex"],
      },
      adapter,
    );
    const io = {
      cwd: "/project",
      home: "/home",
      productRoot: "/package",
      env: {},
      isTTY: false,
      stdout: (s: string) => output.push(s),
      stderr: (s: string) => output.push(s),
    };
    return { calls, output, run: (args: string[]) => run(args, io) };
  }
  test(`${commandName}: setup local, ordinary install global, short flags and language assignment`, async () => {
    const f = fixture();
    assert.equal(
      await f.run(["setup", "codex", "--lang=zh-CN", "--dry-run"]),
      0,
    );
    assert.equal(f.calls[0].scope, "local");
    assert.equal(f.calls[0].language, "zh-CN");
    await f.run([]);
    assert.equal(f.calls[1].scope, "global");
    assert.equal(f.calls[1].runtime, "claude");
    await f.run(["install", "codex", "-l"]);
    assert.equal(f.calls[2].scope, "local");
  });
  test(`${commandName}: discovered upgrade preserves language and JSON is one object`, async () => {
    const f = fixture();
    assert.equal(await f.run(["runtime", "upgrade", "--json"]), 0);
    assert.equal(f.calls[0].language, "zh-CN");
    assert.equal(f.calls[0].action, "update");
    assert.doesNotThrow(() => JSON.parse(f.output.join("")));
  });
  test(`${commandName}: invalid arguments and runtimes reject before any resource write`, async () => {
    for (const args of [
      ["setup", "all", "-l", "-g"],
      ["setup", "unknown"],
      ["setup", "all", "--lang=fr"],
      ["runtime", "install", "claude", "--wat"],
    ]) {
      const f = fixture();
      assert.equal(await f.run(args), 2);
      assert.equal(f.calls.length, 0);
    }
  });
  test(`${commandName}: all runtimes install and uninstall uses discovery`, async () => {
    const f = fixture();
    await f.run(["setup", "all"]);
    assert.deepEqual(
      f.calls.map((c) => c.runtime),
      ["claude", "codex"],
    );
    await f.run(["runtime", "remove", "--force"]);
    assert.equal(f.calls[2].runtime, "codex");
    assert.equal(f.calls[2].force, true);
  });
  test(`${commandName}: discovery errors report failure while healthy targets continue`, async () => {
    const calls: string[] = [],
      errors: string[] = [];
    const run = createCraftCli(
      {
        packageName: `@bovinphang/${commandName}`,
        commandName,
        binName: "craft",
        version: "1.0.0",
        runtimes: ["claude", "codex"],
      },
      {
        discover: async (filter) => {
          filter.onError?.(new Error("corrupt claude manifest"));
          return [{ runtime: "codex", scope: "local", language: "en" }];
        },
        resource: async (options) => {
          calls.push(options.runtime);
          return {};
        },
      },
    );
    const code = await run(["runtime", "update", "--local"], {
      cwd: "/project",
      home: "/home",
      productRoot: "/package",
      env: {},
      stdout: () => {},
      stderr: (s) => errors.push(s),
    });
    assert.equal(code, 2);
    assert.deepEqual(calls, ["codex"]);
    assert.match(errors.join(""), /corrupt claude/);
  });
}
