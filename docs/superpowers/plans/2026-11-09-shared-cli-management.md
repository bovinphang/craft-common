# Shared CLI management implementation record

Approved goal: backend-craft's basic CLI commands match frontend-craft, using reusable craft-common modules. Backend inspect, validate, JSON and runtime list remain available.

- [x] Establish shared command/default/alias tests; implement dispatcher and product adapter interfaces.
- [x] Extract npm/pnpm detection and CLI lifecycle with dual-product tests.
- [x] Extract injectable interactive prompts and product-scoped Claude cache/source management.
- [x] Migrate frontend dispatcher while preserving resource conversion and legacy discovery.
- [x] Implement backend product adapter, discovery, self-management and force-owned uninstall.
- [x] Prepare craft-common 2.1.0 and exact consumer dependencies/content snapshots; verify tarball consumption.
- [x] Update bilingual user docs, validate all three repositories, review complete changes.

Ruling: Reuse the three clean current checkouts on feature/refactor branches rather than create worktrees; this preserves the existing sibling-project layout and installed tools.

Ruling: Product releases remain 3.0.0 and 1.0.0; common's new compatible API is prepared as 2.1.0. No package is published by this task.

Validation evidence and final decisions are recorded below as work completes.

- Shared final gates: lint/typecheck/build passed; full tests 257 total, 254 pass, 3 environment skips.
- Backend gates: lint/typecheck/build/common-content/content passed; full tests 281 total, 239 pass, 42 skips (39 covered by the separate real-product coexistence run; cmake, Maven and prepared-framework prerequisites account for 3 remaining skips). Final parity/packaging rerun: 9/9 pass.
- Frontend full final suite: 349/349 pass. One initial console-output compatibility failure was reproduced, fixed, and the full suite rerun successfully.
- Review finding fixed: malformed ownership manifests must report failure without skipping healthy targets in a batch. Dual-product shared tests and backend CLI regression are green.
- Ctrl-C cancellation was reproduced with synthetic terminal input; all three prompt stages now stop before any resource mutation and preserve process exit state.

- Final real coexistence:39/39 pass. Packed artifact smoke:9 checks/17 CLI commands pass, no sibling source/node_modules.
- Temporary tarball overrides removed; exact2.1.0 manifests and lock records verified against actual common archive SHA-512. No package published.
- Detailed final evidence: docs/verification/cli-management.md.
