# Contributing

[简体中文](CONTRIBUTING.zh-CN.md) · [Documentation](docs/README.md)

Contributions can improve shared methods, language standards, integration, documentation and tests. Read affected modules and existing product contracts first, and keep changes focused.

## Development setup

Use Node.js 22+, Git and pnpm 12.4.1. Install through the existing pnpm-lock.yaml.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

The project uses TypeScript, ESM, esbuild, TypeScript declaration generation and Node.js node:test. See [project structure](docs/project-structure.md) for module responsibilities.

## Content and bilingual policy

- English is the public documentation entry language. Synchronize API names, counts, paths, versions, commands, defaults and capability boundaries in Simplified Chinese.
- Maintain methods/ and its Chinese mirror, then run pnpm run sync:methods and verify generated copies with --check.
- Check both languages for skill entry points, domain references, engineering examples and applicability.
- Common files and methods are maintained here. Products generate copies and provenance locks through exact dependencies and sync:common.
- Historical design, release and acceptance records retain their evidence. Scripts generate dist, skill-packages and npm-packages.

## API and installation protocol changes

Maintain public exports in src/index.ts. For type or behavior changes, check both product callers, legacy manifests, mixed indexes and existing content. Installation changes should verify explicit sessions, zero-write previews, entry ownership, exact common matching, concurrency and recovery.

Use temporary workspaces and isolated homes for tests. CLI package-manager tests inject runners, simulated sources and command outputs to verify lifecycle behavior.

## Verification checklist

```sh
pnpm lint
pnpm typecheck
pnpm run sync:methods -- --check
pnpm build
pnpm test
pnpm run pack:skills
pnpm exec npm pack
```

Inspect the actual library archive and 21 standalone skill packages for bilingual entry points, embedded methods, scripts, styles, example lockfiles and licenses. For engineering example changes, run the relevant verify:engineering checks and record tool and dependency preparation.

Record source-directory and archive verification separately. Product integration changes also need sync:common, check:common, builds, tests and coexistence verification in product repositories.

## Submitting changes

- Explain motivation, scope, compatibility and verification commands in the PR.
- Add regression coverage for behavior changes and check links and examples for documentation changes.
- Synchronize user-facing content in both languages and the Changelog.
- State failed, missing, skipped and unrun checks.
- Use Conventional Commits, such as docs: refresh common guides.
- Preserve existing user changes and keep generated packages, dependencies and secrets out of commits.

## Distribution conventions

Publish common before consumers. Use a new exact version and verified archive, then check actual public SRI, product locks and clean-environment installation. See README for current availability and the [release record](docs/releases/2.0.0.md) for the historical 2.0.0 procedure.

For [GitHub Issues](https://github.com/bovinphang/craft-common/issues), include versions, OS, affected products and sanitized reproduction steps.
