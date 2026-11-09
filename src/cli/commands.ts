import type {
  CliCommandResult,
  CliExitCode,
  CliIO,
  CliInstallation,
  CliProductAdapter,
  CliProductDefinition,
  CliScope,
} from "./types.js";
import type { InstallLanguage } from "../content/types.js";

function installArgs(argv: string[]) {
  const positionals: string[] = [];
  let scope: CliScope | undefined, language: InstallLanguage | undefined;
  let dryRun = false,
    force = false,
    all = false,
    json = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.includes("\0")) throw new Error("Invalid argument");
    if (["--global", "-g", "--local", "-l"].includes(arg)) {
      const next = arg === "--global" || arg === "-g" ? "global" : "local";
      if (scope && scope !== next)
        throw new Error("--global and --local cannot be used together.");
      scope = next;
    } else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--force") force = true;
    else if (arg === "--all") all = true;
    else if (arg === "--json") json = true;
    else if (arg === "--lang" || arg.startsWith("--lang=")) {
      const value = arg === "--lang" ? argv[++i] : arg.slice(7);
      if (value !== "en" && value !== "zh-CN")
        throw new Error(
          `Unsupported language: ${value ?? "(missing)"}. Supported languages: en, zh-CN`,
        );
      language = value;
    } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else positionals.push(arg);
  }
  if (positionals.length > 1)
    throw new Error(`Unexpected argument: ${positionals[1]}`);
  return {
    runtime: positionals[0] as string | undefined,
    scope,
    language,
    dryRun,
    force,
    all,
    json,
  };
}

export function renderCliHelp(p: CliProductDefinition): string {
  return `${p.commandName} / ${p.binName} ${p.version}\n\nUsage:\n  ${p.binName} setup [runtime] [options]\n  ${p.binName} setup all [options]\n  ${p.binName} install [runtime] [options] (deprecated alias)\n  ${p.binName} runtime install [runtime] [--all] [options]\n  ${p.binName} runtime update|upgrade [runtime] [options]\n  ${p.binName} runtime uninstall|remove [runtime] [options]\n  ${p.binName} update|upgrade [--dry-run]\n  ${p.binName} uninstall|remove [--purge] [--yes|-y] [--dry-run]\n  ${p.binName} project inspect [path] [--task-path relative] [--task-kind kind] [--json]\n  ${p.binName} runtime check-migration [runtime] [--local|--global] [--json]\n  ${p.binName} list | matrix | version | help\n  ${p.binName} doctor [runtime] [--fix-cache] [--dry-run] [--json]\n  ${p.binName} sync-metadata [--check]\n\nOptions: --local/-l, --global/-g, --lang ${(p.languages ?? ["en", "zh-CN"]).join("|")}, --dry-run, --all, --json\n  --force: remove modified files owned by this product during resource uninstall\n  setup defaults to ${p.defaults?.setupScope ?? "local"}; non-interactive install defaults to ${p.defaults?.runtime ?? "claude"}, ${p.defaults?.scope ?? "global"}, ${p.defaults?.language ?? "en"}.\n  update upgrades the CLI and refreshes current-project and global resources.\n  runtime update uses the installed CLI content.\n  uninstall preserves resources unless --purge is supplied.\n\nRuntimes: ${p.runtimes.join(", ")}\n`;
}

export function createCraftCli(
  product: CliProductDefinition,
  adapter: CliProductAdapter,
) {
  const defaults = {
    runtime: product.defaults?.runtime ?? "claude",
    language: product.defaults?.language ?? "en",
    scope: product.defaults?.scope ?? "global",
    setupScope: product.defaults?.setupScope ?? "local",
  };
  return async (argv: string[], io: CliIO): Promise<CliExitCode> => {
    const json = argv.includes("--json");
    const report = (result: CliCommandResult): CliExitCode => {
      if (result.value !== undefined)
        io.stdout(
          json
            ? JSON.stringify(result.value, null, 2) + "\n"
            : (result.text ?? JSON.stringify(result.value, null, 2)) + "\n",
        );
      else if (result.text && !json) io.stdout(result.text + "\n");
      return result.code ?? 0;
    };
    try {
      if (argv.some((a) => ["help", "--help", "-h"].includes(a))) {
        io.stdout(product.help ?? renderCliHelp(product));
        return 0;
      }
      if (["version", "--version", "-v"].includes(argv[0])) {
        io.stdout(product.version + "\n");
        return 0;
      }
      const extension = await adapter.command?.(argv, io);
      if (extension) return report(extension);
      let command = argv[0],
        args = argv.slice(1);
      if (!command || command.startsWith("-")) {
        command = "install";
        args = argv;
      }
      const isRuntime = command === "runtime";
      if (isRuntime) {
        command = args[0];
        args = args.slice(1);
      }
      command =
        command === "upgrade"
          ? "update"
          : command === "remove"
            ? "uninstall"
            : command;
      if (!isRuntime && (command === "update" || command === "uninstall")) {
        if (!adapter.lifecycle)
          throw new Error("CLI lifecycle adapter unavailable");
        return await adapter.lifecycle(command, args, io);
      }
      if (command === "list" && !isRuntime) {
        if (args.some((a) => a !== "--json"))
          throw new Error("list accepts only --json");
        return report({
          value: product.runtimes,
          text: product.runtimes.join("\n"),
        });
      }
      if (!["install", "setup", "update", "uninstall"].includes(command))
        throw new Error(
          `Unknown ${isRuntime ? "runtime " : ""}command: ${command}`,
        );
      const parsed = installArgs(args);
      if (
        parsed.language &&
        !(product.languages ?? ["en", "zh-CN"]).includes(parsed.language)
      )
        throw new Error(`Unsupported language: ${parsed.language}`);
      if (isRuntime && command === "setup")
        throw new Error("Unknown runtime command: setup");
      if (command === "setup" && parsed.runtime === "all") {
        parsed.runtime = undefined;
        parsed.all = true;
      }
      if (parsed.runtime && !product.runtimes.includes(parsed.runtime))
        throw new Error(`Unknown runtime: ${parsed.runtime}`);
      if (command === "install" && !isRuntime && argv[0] === "install" && !json)
        io.stdout(
          `Deprecated: use "${product.commandName} runtime install" instead of "${product.commandName} install".\n`,
        );
      const scopes = parsed.scope ? [parsed.scope] : undefined;
      const runtimes = parsed.runtime
        ? [parsed.runtime]
        : parsed.all
          ? [...product.runtimes]
          : undefined;
      const canPrompt = !json && (io.isTTY ?? Boolean(process.stdin.isTTY));
      const results: CliCommandResult[] = [];
      const discover = (filter: import("./types.js").CliDiscoveryFilter) =>
        adapter.discover(
          {
            ...filter,
            onError: (error) => {
              io.stderr(error.message + "\n");
              results.push({ code: 2 });
            },
          },
          io,
        );
      const invoke = async (
        runtime: string,
        scope: CliScope,
        language: InstallLanguage,
        installation?: CliInstallation,
      ) => {
        if (io.signal?.aborted) throw new Error("Cancelled");
        try {
          results.push(
            await adapter.resource(
              {
                action:
                  command === "setup"
                    ? "install"
                    : (command as "install" | "update" | "uninstall"),
                runtime,
                scope,
                language,
                dryRun: parsed.dryRun,
                force: parsed.force,
                canPrompt,
                installation,
              },
              io,
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Resource operation failed";
          io.stderr(message + "\n");
          results.push({ code: 2, value: { runtime, scope, error: message } });
        }
      };
      if (
        command === "uninstall" ||
        (command === "update" && !parsed.runtime)
      ) {
        const installs = await discover({ runtimes, scopes });
        const seen = new Set<string>();
        for (const install of installs) {
          const key = `${install.runtime}:${install.scope}`;
          if (command === "update" && seen.has(key)) continue;
          seen.add(key);
          await invoke(
            install.runtime,
            install.scope,
            parsed.language ?? install.language,
            install,
          );
        }
        if (!installs.length && !json)
          io.stdout(`No ${product.commandName} installs found.\n`);
      } else {
        const prompts = adapter.prompts?.(io);
        if (!runtimes && !canPrompt && !json)
          io.stdout(
            `Non-interactive terminal detected, defaulting to ${defaults.runtime} runtime.\n`,
          );
        const selected =
          runtimes ??
          (canPrompt && prompts
            ? await prompts.promptRuntime()
            : [defaults.runtime]);
        if (!selected?.length) return 0;
        if (selected.some((rt) => !product.runtimes.includes(rt)))
          throw new Error("Unknown runtime selection");
        let language = parsed.language;
        if (!language && command !== "update" && canPrompt && prompts) {
          language = await prompts.promptLanguage();
          if (!language) return 0;
        }
        let scope =
          parsed.scope ??
          (command === "setup" ? defaults.setupScope : undefined);
        if (!scope && canPrompt && prompts) {
          const global = await prompts.promptLocation(selected);
          if (global === undefined) return 0;
          scope = global ? "global" : "local";
        }
        if (!scope && !json)
          io.stdout(
            `Non-interactive terminal detected, defaulting to ${defaults.scope} install.\n`,
          );
        scope ??= defaults.scope;
        for (const rt of selected) {
          const existing =
            command === "update" && !language
              ? (await discover({ runtimes: [rt], scopes: [scope] }))[0]
              : undefined;
          await invoke(
            rt,
            scope,
            language ?? existing?.language ?? defaults.language,
            existing,
          );
        }
      }
      const values = results.flatMap((r) =>
        r.value === undefined ? [] : [r.value],
      );
      if (json)
        io.stdout(
          JSON.stringify(values.length === 1 ? values[0] : values, null, 2) +
            "\n",
        );
      else for (const result of results) report(result);
      return results.reduce<CliExitCode>(
        (code, r) => Math.max(code, r.code ?? 0) as CliExitCode,
        0,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Operation failed";
      io.stderr(message + "\n");
      if (json)
        io.stdout(JSON.stringify({ error: message, exitCode: 2 }) + "\n");
      return 2;
    }
  };
}
