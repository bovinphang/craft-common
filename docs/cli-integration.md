# Shared CLI integration

[简体中文](cli-integration.zh-CN.md) · [Documentation](README.md)

This guide is for library integrators using 2.1.0. Frontend Craft and Backend Craft provide terminal commands; common exports command-composition APIs. See the [project home](../README.md#library-integrators) for public availability.

## Compose the entry point

```ts
import {
  createCraftCli,
  renderCliHelp,
  type CliProductAdapter,
  type CliProductDefinition,
} from "@bovinphang/craft-common";

export function composeProductCli(
  definition: CliProductDefinition,
  adapter: CliProductAdapter,
) {
  return createCraftCli(
    { ...definition, help: renderCliHelp(definition) },
    adapter,
  );
}
```

Supply the product's real definition and adapter to obtain run(argv, io). CliIO requires cwd, home, productRoot, env, stdout and stderr, with optional isTTY and signal. Products assign the returned 0 / 1 / 2 to the process exit code.

## Interface responsibilities

| Interface | Product responsibility |
| --- | --- |
| CliProductDefinition | Package, command and bin names, version, runtime list and optional defaults |
| adapter.discover | Discover managed installations by runtime and scope, retaining language and manifest location |
| adapter.resource | Implement install / update / uninstall while honoring dryRun, scope, language and ownership |
| adapter.command | Handle product-specific commands, returning undefined when unhandled |
| adapter.prompts | Provide runtime, language and location prompts through createCliPrompts |
| adapter.lifecycle | Delegate CLI self-update and self-removal through createCliLifecycle |

Use value for a single JSON output value and text for ordinary text output. Send diagnostics to stderr. Product adapters must keep previews read-only and preserve their existing manifests and installation contracts.

## Defaults and command semantics

These defaults apply when CliProductDefinition.defaults does not override them.

| Command or environment | Behavior |
| --- | --- |
| setup [runtime] / setup all | Defaults to the current project, local; explicit global overrides it |
| Ordinary interactive install | Prompts for runtimes, language and location |
| Ordinary non-interactive install | Defaults to claude, global and en |
| runtime install --all | Plans or installs resources for all declared runtimes |
| runtime update [runtime] | Uses installed package resources and preserves discovered installation languages by default |
| runtime uninstall [runtime] | Delegates managed-resource removal to the product adapter |
| update / upgrade | Updates the product CLI and refreshes current-project and global resources |
| uninstall / remove | Removes the CLI; purge cleans resources first, and non-interactive use requires yes |

Scripts should pass --local or --global explicitly. Use setup all and runtime install --all for their respective entry points. Ordinary install remains a compatibility alias.

## Package managers and lifecycle

createCliLifecycle uses identifyInstallation, original paths and package-manager entry points to verify ownership. It supports verified npm/pnpm installations and rejects development directories, unknown sources and shared pnpm installation groups. Temporary npx execution must already be current and has self-removal restrictions.

Callers supply pluginRoot, cwd, purgeResources and describeResources. After successful self-update, the new CLI refreshes resources. A CLI update failure stops refresh; resource failure retains the updated CLI. Preview can query the registry, while resource previews must stay read-only.

## Claude sources and cache

createClaudeCacheManager provides product-scoped native/CLI source reports and cache-cleanup planning. Products integrate source checks into installation. Cleanup protects current installations and refuses deletion without reliable metadata. Products declare interaction policies for CLI/native source conflicts.

## Integration verification

Follow tests/cli patterns for defaults, invalid arguments, single JSON output, language preservation, partial failure, updates, removal and zero-write previews in isolated directories. Exercise package-manager lifecycle with injected runners, temporary homes and simulated installation sources. Record specialty checks and real-host discovery separately.
