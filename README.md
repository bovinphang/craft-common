<div align="center">

# Craft Common

Shared engineering capabilities and product integration for Craft AI Coding.

[![CI](https://github.com/bovinphang/craft-common/actions/workflows/ci.yml/badge.svg)](https://github.com/bovinphang/craft-common/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@bovinphang/craft-common)](https://www.npmjs.com/package/@bovinphang/craft-common)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-5FA04E)

**English** · [简体中文](README.zh-CN.md)

</div>

Craft Common provides [Frontend Craft](https://github.com/bovinphang/frontend-craft) and [Backend Craft](https://github.com/bovinphang/backend-craft) with **21 shared skills**, **6 reusable methods**, and infrastructure for content synchronization, project discovery, shared installation and product CLIs. Skills and methods include English and Simplified Chinese content.

Product users receive common capabilities through the frontend or backend plugin. Integration developers use the exported ESM library APIs. Shared capabilities use cc-* identifiers and are maintained in this repository.

[Documentation](docs/README.md) · [Consuming the library](docs/consuming-common.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

## Core capabilities

| Capability | Purpose |
| --- | --- |
| `readContentCatalog / readMethodResource` | Read bilingual catalogs and reusable method bytes |
| `syncProductSnapshot` | Generate and verify product copies and provenance |
| `inspectWorkspace / recommendCapabilities` | Inspect bounded workspace evidence and recommend delivered capabilities |
| `resolveRuntimeTargets / RUNTIME_DESCRIPTORS` | Resolve configuration and Skill paths for 15 runtimes |
| `createInstallSession / runProductLifecycle` | Plan product-owned resources and coordinate installation |
| `planSharedDeployment / executeSharedPlan / recoverSharedTransaction` | Plan shared deployment, commit transactions and recover interruptions |
| `createCraftCli / createCliLifecycle / createCliPrompts / createClaudeCacheManager` | Compose product CLI dispatch, lifecycle, prompts and cache management |

## Getting started

### Product users

Install Frontend Craft or Backend Craft to receive shared skills, embedded methods and common-resource management. Each product owns its commands, domain standards and runtime adapters. Follow the corresponding product README.

### Library integrators

Requires Node.js 22 or later. The library exposes an ESM entry point with TypeScript types. Pin the exact version for your product. Available versions are listed on [npm](https://www.npmjs.com/package/@bovinphang/craft-common).

```sh
pnpm add --save-exact @bovinphang/craft-common@2.1.0
```

Have the caller supply the actual installed package root to read complete content and methods.

```ts
import {
  readContentCatalog,
  readMethodResource,
} from "@bovinphang/craft-common";

export function loadCommonContent(packageRoot: string) {
  return {
    catalog: readContentCatalog(packageRoot, "en"),
    method: readMethodResource(packageRoot, "doc-sync", "en"),
  };
}
```

Catalogs include complete file lists, source versions, file hashes and a catalog digest. Use zh-CN for Simplified Chinese. Bundled products should explicitly resolve and pass their common content root. See the [consumption guide](docs/consuming-common.md).

## Shared skill catalog

| Area | Skills |
| --- | --- |
| Language foundations | `cc-typescript-project-standard`, `cc-rust-project-standard`, `cc-go-project-standard`, `cc-java-project-standard`, `cc-python-project-standard`, `cc-c-project-standard`, `cc-cpp-project-standard` |
| Runtime and concurrency | `cc-rust-async`, `cc-go-concurrency`, `cc-java-runtime`, `cc-python-async`, `cc-native-memory-safety` |
| Desktop | `cc-electron-project-standard`, `cc-tauri-project-standard` |
| Engineering methods | `cc-source-driven-development`, `cc-doc-sync-core`, `cc-debug-methodology`, `cc-refactoring-core`, `cc-tdd-methodology` |
| Diagrams | `cc-drawio-studio`, `cc-technical-diagrams` |

Languages, frameworks and project roles are modeled separately. A language capability can apply to UI, desktop cores, native libraries, services and CLIs. Recommendations use actual project evidence and delivered content.

## Reusable methods and engineering practices

The six methods are source-driven-development, doc-sync, debug, refactoring, tdd and engineering-practices. Sources live in methods/ and its Chinese mirror; synchronization scripts generate embedded skill references.

Engineering practices include eight shared principles and primary-source records with applicability limits. Rules use required, recommended and conditional levels. Language and desktop references record conditions, exceptions and verification requirements.

[Engineering practices](methods/engineering-practices.md) · [Source registry](methods/engineering-practices.sources.json)

## Product integration and coexistence

Products declare resource changes through explicit planning sessions. The shared installer coordinates paths, configuration-entry ownership, cross-product locks and interruption recovery. Products sharing a real Skill target must use identical common versions, languages and content digests. Unknown and user-modified files are protected.

A dry run plans changes without writing to disk. Verify native plugin coexistence in the target host. See [coordinated upgrades](docs/consuming-common.md#coordinated-upgrades-and-distribution) and [CLI integration](docs/cli-integration.md).

## Development and verification

Source development uses pnpm 12.4.1, esbuild and Node.js node:test.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm run sync:methods -- --check
pnpm build
pnpm test
pnpm run pack:skills
pnpm exec npm pack
```

pack:skills generates 21 bilingual standalone skill packages. Use the npm packer for library archives to retain nested example lockfiles. Prepare and verify engineering examples separately as described in [project structure](docs/project-structure.md).

## Documentation and contributing

See [Contributing](CONTRIBUTING.md) for bilingual maintenance, generated content and pre-submission checks. Report problems through [GitHub Issues](https://github.com/bovinphang/craft-common/issues).

## License

[MIT](LICENSE) © bovinphang.
