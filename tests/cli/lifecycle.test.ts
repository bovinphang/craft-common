import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fixture, pnpmFixture, products } from "./lifecycle-fixtures.js";
import {
  identifyInstallation,
  relocatePackage,
  type ProcessRunner,
} from "../../src/cli/package-manager.js";
import {
  createCliLifecycle,
  type CliLifecycleContext,
} from "../../src/cli/lifecycle.js";

for (const product of products) {
  const name = product.packageName;
  function setup(t: Parameters<typeof fixture>[0]) {
    const f = fixture(t, product);
    const logs: string[] = [];
    let purges = 0;
    const context: CliLifecycleContext = {
      pluginRoot: f.pkg,
      cwd: f.base,
      purgeResources: async () => {
        purges++;
        return true;
      },
      describeResources: () => ["project manifest", "global manifest"],
    };
    const options = {
      product,
      runner: f.runner,
      managers: [{ name: "npm" as const, file: "/fake npm" }],
    };
    const run = createCliLifecycle(product, {
      ...options,
      log: (x) => logs.push(x),
      isTTY: false,
    });
    return {
      ...f,
      logs,
      context,
      options,
      run,
      get purges() {
        return purges;
      },
    };
  }
  test(`${name}: owns only verified registry installations and relocates its own package`, async (t) => {
    const f = setup(t);
    const source = await identifyInstallation(f.pkg, f.options);
    assert.equal(source.kind, "global");
    if (source.kind !== "global") return;
    assert.equal(source.prefix, f.prefix);
    assert.equal(
      await relocatePackage(source, f.options),
      fs.realpathSync(f.pkg),
    );
    await assert.rejects(identifyInstallation(f.base, f.options), /来源/);
    const runner: ProcessRunner = async (file, args, opts) =>
      args[0] === "ls"
        ? {
            code: 0,
            stdout: JSON.stringify({
              dependencies: { [name]: { resolved: "file:../local" } },
            }),
          }
        : f.runner(file, args, opts);
    await assert.rejects(
      identifyInstallation(f.pkg, { ...f.options, runner }),
      /来源/,
    );
  });
  test(`${name}: pins latest then validates and runs its bin, without changing process exit state`, async (t) => {
    const f = setup(t);
    const runner: ProcessRunner = async (file, args, opts) => {
      const result = await f.runner(file, args, opts);
      if (args[0] === "install") {
        const manifest = path.join(f.pkg, "package.json");
        const meta = JSON.parse(fs.readFileSync(manifest, "utf8"));
        meta.version = "3.0.1";
        fs.writeFileSync(manifest, JSON.stringify(meta));
      }
      return result;
    };
    const before = process.exitCode;
    assert.equal(
      await createCliLifecycle(product, {
        ...f.options,
        runner,
        log: (x) => f.logs.push(x),
      })("update", [], f.context),
      0,
      f.logs.join("\n"),
    );
    assert.equal(process.exitCode, before);
    const install = f.calls.find((x) => x.args[0] === "install");
    assert.ok(install);
    assert.ok(install.args.includes(`${name}@3.0.1`));
    assert.ok(install.args.includes(f.prefix));
    const entryName = name.split("/").at(-1)!;
    assert.ok(
      f.calls.some(
        (x) =>
          x.file === process.execPath &&
          x.args[0] === path.join(f.pkg, `dist/bin/${entryName}.js`) &&
          x.args.slice(1).join(" ") === "runtime update",
      ),
    );
  });
  test(`${name}: legacy usage returns 2 before detection and identifies its command`, async (t) => {
    const f = setup(t);
    assert.equal(
      await f.run(
        "uninstall",
        ["claude", "--global", "--purge", "--yes"],
        f.context,
      ),
      2,
    );
    assert.equal(f.calls.length, 0);
    assert.equal(f.purges, 0);
    assert.ok(
      f.logs.some((x) =>
        x.includes(`${product.commandName} runtime uninstall claude --global`),
      ),
    );
  });
  test(`${name}: dry run reads only; uninstall previews purge without confirmation`, async (t) => {
    const f = setup(t);
    assert.equal(await f.run("update", ["--dry-run"], f.context), 0);
    const previews: boolean[] = [];
    f.context.purgeResources = async (dry) => {
      previews.push(dry);
      return true;
    };
    assert.equal(
      await f.run("uninstall", ["--dry-run", "--purge"], f.context),
      0,
    );
    assert.deepEqual(previews, [true]);
    assert.ok(
      !f.calls.some(
        (x) =>
          ["install", "uninstall"].includes(x.args[0]) ||
          x.file === process.execPath,
      ),
    );
  });
  test(`${name}: refuses noninteractive uninstall and keeps CLI when purge fails`, async (t) => {
    const f = setup(t);
    const before = process.exitCode;
    assert.equal(await f.run("uninstall", ["--purge"], f.context), 1);
    assert.equal(f.purges, 0);
    f.context.purgeResources = async () => false;
    assert.equal(await f.run("uninstall", ["--yes", "--purge"], f.context), 1);
    assert.ok(!f.calls.some((x) => x.args[0] === "uninstall"));
    assert.equal(process.exitCode, before);
  });
  test(`${name}: default uninstall preserves runtime resources and emits its own npx identity`, async (t) => {
    const f = setup(t);
    f.context.describeResources = () => {
      throw new Error("must not discover resources");
    };
    assert.equal(await f.run("uninstall", ["--yes"], f.context), 0);
    assert.equal(f.purges, 0);
    assert.ok(
      f.calls.some((x) => x.args[0] === "uninstall" && x.args.includes(name)),
    );
    assert.ok(
      f.logs.some((x) => x.includes(`npx ${name}@latest runtime uninstall`)),
    );
  });
  test(`${name}: failed install or version verification never continues resources`, async (t) => {
    const f = setup(t);
    assert.equal(await f.run("update", [], f.context), 1);
    assert.ok(!f.calls.some((x) => x.file === process.execPath));
    const runner: ProcessRunner = async (file, args, opts) =>
      args[0] === "install"
        ? { code: 1, stdout: "" }
        : f.runner(file, args, opts);
    assert.equal(
      await createCliLifecycle(product, {
        ...f.options,
        runner,
        log: () => {},
      })("update", [], f.context),
      1,
    );
    assert.ok(!f.calls.some((x) => x.file === process.execPath));
  });
  test(`${name}: pnpm ownership identifies shared groups and refuses all mutations`, async (t) => {
    const f = pnpmFixture(t, true, product);
    const options = {
      product,
      runner: f.runner,
      managers: [{ name: "pnpm" as const, file: "/fake pnpm" }],
    };
    const source = await identifyInstallation(f.pkg, options);
    assert.equal(source.kind, "global");
    if (source.kind === "global") {
      assert.equal(source.shared, true);
      assert.equal(source.globalDir, path.dirname(path.dirname(f.group)));
    }
    let purges = 0;
    const context = {
      pluginRoot: f.pkg,
      cwd: f.base,
      purgeResources: async () => {
        purges++;
        return true;
      },
      describeResources: () => [],
    };
    const run = createCliLifecycle(product, { ...options, log: () => {} });
    assert.equal(await run("update", [], context), 1);
    assert.equal(await run("uninstall", ["--yes", "--purge"], context), 1);
    assert.equal(purges, 0);
    assert.ok(!f.calls.some((x) => ["add", "remove"].includes(x.args[0])));
  });
  test(`${name}: npx cache uses own tarball evidence and rejects temporary uninstall`, async (t) => {
    const f = setup(t);
    const cache = path.join(f.base, "npm cache");
    const hash = path.join(cache, "_npx", "abc123");
    const pkg = path.join(hash, "node_modules", name);
    fs.mkdirSync(path.dirname(pkg), { recursive: true });
    fs.cpSync(f.pkg, pkg, { recursive: true });
    fs.writeFileSync(
      path.join(hash, "package-lock.json"),
      JSON.stringify({
        packages: {
          [`node_modules/${name}`]: {
            resolved: `https://registry.example.test/${name}/-/${name.split("/").at(-1)}-3.0.0.tgz`,
          },
        },
      }),
    );
    const run = createCliLifecycle(product, {
      ...f.options,
      env: { ...process.env, npm_config_cache: cache },
      log: (x) => f.logs.push(x),
    });
    const context = { ...f.context, pluginRoot: pkg };
    assert.equal(await run("update", [], context), 1);
    assert.ok(
      f.logs.some((x) => x.includes(`npx ${name}@latest runtime update`)),
    );
    assert.equal(await run("uninstall", ["--yes", "--purge"], context), 1);
    assert.equal(f.purges, 0);
    const manifest = path.join(pkg, "package.json");
    const meta = JSON.parse(fs.readFileSync(manifest, "utf8"));
    meta.version = "3.0.1";
    fs.writeFileSync(manifest, JSON.stringify(meta));
    assert.equal(await run("update", [], context), 0);
    assert.ok(
      !f.calls.some((x) => ["install", "uninstall"].includes(x.args[0])),
    );
  });
}

for (const product of products) {
  test(`${product.packageName}: pnpm shim version dispatch and changing install groups retain original global directory and validate new entry`, async (t) => {
    const { resolveManagerExecutable } =
      await import("../../src/cli/package-manager.js");
    const f = pnpmFixture(t, false, product);
    const shimEntry = path.join(f.base, ".tools/pnpm/10/bin/pnpm.cjs");
    fs.mkdirSync(path.dirname(shimEntry), { recursive: true });
    fs.writeFileSync(
      shimEntry,
      "// dispatches to effective project packageManager v12",
    );
    const shim = path.join(f.base, "pnpm.CMD");
    fs.writeFileSync(shim, 'node "%~dp0\\.tools\\pnpm\\10\\bin\\pnpm.cjs" %*');
    const manager = resolveManagerExecutable(shim, "pnpm", "win32");
    assert.ok(manager);
    const newGroup = path.join(path.dirname(f.group), "replacement-target");
    const newPkg = path.join(f.base, "global virtual store", "new-package");
    let updated = false;
    let continuation = false;
    const runner: ProcessRunner = async (file, args, opts) => {
      if (args[0] === shimEntry) {
        assert.equal(file, process.execPath);
        const command = args.slice(1);
        if (command[0] === "add") {
          assert.ok(command.includes(path.dirname(path.dirname(f.group))));
          assert.ok(command.includes(`${product.packageName}@3.0.1`));
          fs.mkdirSync(path.dirname(newPkg), { recursive: true });
          fs.cpSync(f.pkg, newPkg, { recursive: true });
          const json = JSON.parse(
            fs.readFileSync(path.join(newPkg, "package.json"), "utf8"),
          );
          json.version = "3.0.1";
          fs.writeFileSync(
            path.join(newPkg, "package.json"),
            JSON.stringify(json),
          );
          fs.mkdirSync(path.join(newGroup, "node_modules", "@bovinphang"), {
            recursive: true,
          });
          fs.symlinkSync(
            newPkg,
            path.join(newGroup, "node_modules", product.packageName),
            "junction",
          );
          fs.copyFileSync(
            path.join(f.group, "package.json"),
            path.join(newGroup, "package.json"),
          );
          fs.copyFileSync(
            path.join(f.group, "pnpm-lock.yaml"),
            path.join(newGroup, "pnpm-lock.yaml"),
          );
          fs.copyFileSync(
            path.join(f.group, "node_modules", ".modules.yaml"),
            path.join(newGroup, "node_modules", ".modules.yaml"),
          );
          updated = true;
          return { code: 0, stdout: "" };
        }
        if (command[0] === "list" && updated)
          return {
            code: 0,
            stdout: JSON.stringify([
              {
                path: newGroup,
                dependencies: {
                  [product.packageName]: { version: "3.0.1" },
                },
              },
            ]),
          };
        return f.runner(file, command, opts);
      }
      assert.deepEqual(args, [
        path.join(
          newPkg,
          `dist/bin/${product.packageName.split("/").at(-1)}.js`,
        ),
        "runtime",
        "update",
      ]);
      assert.equal(opts.cwd, f.base);
      assert.equal(opts.env, process.env);
      assert.equal(opts.stdio, "inherit");
      continuation = true;
      return { code: 0, stdout: "" };
    };
    const code = await createCliLifecycle(product, {
      runner,
      managers: [manager],
      log: () => {},
    })("update", [], {
      pluginRoot: f.pkg,
      cwd: f.base,
      purgeResources: async () => true,
      describeResources: () => [],
    });
    assert.equal(code, 0);
    assert.equal(continuation, true);
  });
}
