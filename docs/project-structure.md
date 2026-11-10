# Project structure and maintenance

[简体中文](project-structure.zh-CN.md) · [Documentation](README.md)

This TypeScript / ESM library uses esbuild and TypeScript declaration generation. Tests use Node.js node:test. Runtime requires Node.js 22+ and development pins pnpm 12.4.1.

## Module responsibilities

| Directory | Responsibility |
| --- | --- |
| `src/content/` | Catalogs, resource closure, methods, applicability and product snapshots |
| `src/project/` | Bounded workspace evidence, desktop detection and recommendations |
| `src/install/` | Common identity, planning, transactions and recovery |
| `src/install/product/` | Runtime targets, explicit sessions, entry ownership and product lifecycle |
| `src/cli/` | Command dispatch, prompts, package managers, lifecycle and Claude cache |
| `skills/` | 21 cc-* entry points with complete resources |
| `methods/` | Six reusable method sources and engineering source records |
| `localized/zh-CN/` | Chinese skill and method mirror |
| `scripts/` | Method synchronization, build, tests, standalone packages and engineering verification |
| `tests/` | Node.js unit/integration tests and isolated behavior examples |
| `docs/` | User/developer guides and historical evidence |

src/index.ts is the public export entry. package.json exports resolve to dist/index.js and dist/index.d.ts. Common declares no bin; products provide terminal entry points.

## Generated content boundaries

Maintain methods/ and its Chinese mirror first, then synchronize embedded skill copies. Engineering source records and rules live in their corresponding JSON files; domain references remain in each skill.

```sh
pnpm run sync:methods
pnpm run sync:methods -- --check
```

Synchronization preflights both languages and updates incrementally, preserving all 21 entries, applicability and custom fields. Products then generate their copies and provenance locks through sync:common. dist, skill-packages and npm-packages are generated outputs maintained through scripts.

## Routine checks and packaging

```sh
pnpm lint
pnpm typecheck
pnpm run sync:methods -- --check
pnpm build
pnpm test
pnpm run pack:skills
pnpm exec npm pack
```

The test script recursively discovers tests/**/*.test.ts and executes serially. build generates the ESM bundle and declarations. pack:skills generates 21 bilingual standalone skill packages and index.json. npm pack generates the common library archive and triggers prepack build.

Use the npm packer and verify example lockfiles in actual archives. The 2.0.0 release record documents the pnpm 12.4.1 limitation around packing nested pnpm-lock.yaml files.

## Engineering examples

```sh
pnpm run verify:engineering
pnpm run verify:engineering -- --prepare
```

verify:engineering uses isolated examples and existing toolchains. --prepare explicitly prepares dependencies. See scripts/verify-engineering.ts for language, Docker and case-selection options. Eight common cases cover seven languages and the IPC handler core, recording actual RED/GREEN results, tools, input digests and test counts separately. Missing tools are recorded as MISSING. GUI, signing, external databases and distributed semantics need separate verification.

[Contributing](../CONTRIBUTING.md) · [Historical engineering coverage](https://github.com/bovinphang/craft-common/blob/main/docs/verification/engineering-practices/coverage.md)
