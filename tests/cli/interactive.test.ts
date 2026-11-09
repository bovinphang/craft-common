import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createCraftCli } from "../../src/cli/commands.js";
import { PassThrough } from "node:stream";
import {
  createCliPrompts,
  createSelectablePromptState,
} from "../../src/cli/interactive.js";

for (const productName of ["frontend-craft", "backend-craft"]) {
  test(`${productName} prompts use configured identity, runtime order, paths and defaults`, async () => {
    const input = new PassThrough() as unknown as NodeJS.ReadStream;
    const output = new PassThrough() as unknown as NodeJS.WriteStream;
    const prompts = createCliPrompts({
      productName,
      runtimes: ["claude", "codex"],
      getGlobalConfigDir: (runtime) => path.join("/home/test", `.${runtime}`),
      localDirectories: { claude: ".claude", codex: ".codex" },
      home: () => path.join("/home/test"),
      input,
      output,
      env: {
        [`${productName.replaceAll("-", "_").toUpperCase()}_FORCE_INTERACTIVE`]:
          "1",
      },
      readScriptedInput: () => "2\n2\n2\n",
    });
    assert.match(prompts.buildLanguagePromptText(), new RegExp(productName));
    assert.match(
      prompts.createLocationPromptState(["codex"]).options[0].description!,
      /~.*codex/,
    );
    assert.match(
      prompts.createLocationPromptState(["codex"]).options[1].description!,
      /\.\/\.codex/,
    );
    assert.deepEqual(prompts.createRuntimePromptState().confirm(), ["claude"]);
    assert.equal(prompts.createLocationPromptState(["claude"]).confirm(), true);
    assert.equal(prompts.createLanguagePromptState().confirm(), "en");
    assert.deepEqual(prompts.parseRuntimeInput(""), ["claude"]);
    assert.deepEqual(prompts.parseRuntimeInput("3"), ["claude", "codex"]);
    assert.deepEqual(await prompts.promptRuntime(), ["codex"]);
    assert.equal(await prompts.promptLocation(["codex"]), false);
    assert.equal(await prompts.promptLanguage(), "zh-CN");
    input.destroy();
    output.destroy();
  });
}

test("prompt state filters options and refuses an empty selection", () => {
  const state = createSelectablePromptState({
    message: "Pick",
    options: [{ value: "a", label: "Alpha" }],
  });
  assert.equal(state.confirm(), undefined);
  assert.match(state.error, /at least one/);
  state.type("alp");
  state.toggle();
  assert.deepEqual(state.confirm(), ["a"]);
});

for (const kind of ["runtime", "location", "language"] as const) {
  test(`Ctrl-C cancels ${kind} without changing process exit state`, async () => {
    const input = new PassThrough() as unknown as NodeJS.ReadStream;
    const output = new PassThrough() as unknown as NodeJS.WriteStream;
    input.isTTY = true;
    input.isRaw = false;
    const modes: boolean[] = [];
    input.setRawMode = (mode: boolean) => {
      modes.push(mode);
      return input;
    };
    const prompts = createCliPrompts({
      productName: "backend-craft",
      runtimes: ["claude"],
      getGlobalConfigDir: () => ".claude",
      localDirectories: {},
      input,
      output,
    });
    const previousExit = process.exitCode;
    try {
      const answer =
        kind === "runtime"
          ? prompts.promptRuntime()
          : kind === "location"
            ? prompts.promptLocation(["claude"])
            : prompts.promptLanguage();
      input.emit("keypress", "", { name: "c", ctrl: true });
      assert.equal(await answer, undefined);
      assert.equal(process.exitCode, previousExit);
      assert.deepEqual(modes, [true, false]);
      assert.equal(input.listenerCount("keypress"), 0);
    } finally {
      process.exitCode = previousExit;
      input.destroy();
      output.destroy();
    }
  });
}

for (const [kind, argv] of [
  ["runtime", ["setup"]],
  ["language", ["setup", "claude"]],
  ["location", ["runtime", "install", "claude", "--lang=en"]],
] as const) {
  test(`cancelling ${kind} prevents resource installation`, async () => {
    const input = new PassThrough() as unknown as NodeJS.ReadStream;
    const output = new PassThrough() as unknown as NodeJS.WriteStream;
    input.isTTY = true;
    input.setRawMode = () => input;
    const prompts = createCliPrompts({
      productName: "backend-craft",
      runtimes: ["claude"],
      getGlobalConfigDir: () => ".claude",
      localDirectories: {},
      input,
      output,
    });
    let installations = 0;
    const run = createCraftCli(
      {
        packageName: "@bovinphang/backend-craft",
        commandName: "backend-craft",
        binName: "bec",
        version: "1.0.0",
        runtimes: ["claude"],
      },
      {
        discover: async () => [],
        prompts: () => prompts,
        resource: async () => {
          installations++;
          return {};
        },
      },
    );
    try {
      const completion = run([...argv], {
        cwd: ".",
        home: ".",
        productRoot: ".",
        env: {},
        isTTY: true,
        stdout: () => {},
        stderr: () => {},
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      input.emit("keypress", "", { name: "c", ctrl: true });
      assert.equal(await completion, 0);
      assert.equal(installations, 0);
    } finally {
      input.destroy();
      output.destroy();
    }
  });
}
