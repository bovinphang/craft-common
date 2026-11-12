# Changelog

[简体中文](CHANGELOG.zh-CN.md)

## [2.1.0] - 2026-11-10

### Added

- Export `createCraftCli` and `createCliPrompts` for command routing and interactive installation. With the shared defaults, `setup` installs locally and ordinary non-interactive installs target Claude globally in English. Products can override these defaults.
- Export `identifyInstallation` and `createCliLifecycle` to detect verified npm/pnpm installations and let product CLIs update or remove themselves through the original package manager.
- Export `createClaudeCacheManager` to report installation sources and clean stale product caches while protecting the active installation.
- Include bilingual library consumption, [CLI integration](docs/cli-integration.md), and project structure guides in the npm package.

## [2.0.0] - 2026-11-09

### Added

- Expand the shared catalog to 21 English/Simplified Chinese `cc-*` entries. TypeScript, Rust, Go, Java, Python, C and C++ have independent language foundations; Rust async, Go concurrency, Python async, Java runtime and native memory safety have focused entries. Tauri and Electron provide desktop adaptations.
- Add bounded, read-only workspace inspection and task-scoped capability recommendations. Languages, application roles and framework evidence remain separate; discovery does not execute project code or install tools.
- Add shared product lifecycle APIs for explicit planning sessions, 15-runtime target resolution, per-entry configuration ownership, cross-product locking and recoverable product/common transactions.
- Add reusable engineering practices with eight principles, 31 primary-source records with applicability limits, and language and desktop guidance in 14 shared entries. Guidance uses required, recommended and conditional levels and respects project conventions.
- Add isolated examples pairing defects with fixes for seven languages and the IPC handler core. Examples require explicit setup and distinguish demonstrated behavior from missing tools, compilation failures and empty or skipped tests. GUI, signing, real databases and distributed guarantees require separate validation.

### Changed

- Products generate bilingual snapshots, embedded methods and provenance locks from the same pinned version and package bytes. Standalone skills include their own references, examples and license.
- Runtimes without Skill support receive private references without registering as shared Skill consumers.
- Release archives use `pnpm exec npm pack` to preserve nested `pnpm-lock.yaml` files. The `pnpm pack` command in pnpm 12.4.1 omits those files.

### Fixed

- Method synchronization preserves all 21 entries, applicability, unknown fields and query bytes. It supports read-only checks and leaves existing output unchanged on repeated runs with the same input.
- Reject invalid indexes, missing language resources, unsafe internal links and modified/unknown generated outputs before writing.

## [1.0.1] - 2026-11-06

### Fixed

- Repair recovery of larger transaction journals, Windows equivalent-path handling and consistent line endings. Preserve modified or unknown files during recovery and shared-resource cleanup.

## [1.0.0] - 2026-11-05

### Added

- Initial common package with seven shared methodology/diagram entries, bilingual resources, catalog/resource APIs and shared installation ownership, conflict detection and transaction recovery.
