# Engineering practices — final independent review

Date: 2026-11-08. Role: independent Senior Code Reviewer, fresh context; not the implementer or model scorer. No additional reviewer was delegated. No commit, push, publish, configuration change or business-source edit was performed.

## Scope and evidence

The change baseline is `.superpowers/sdd/2026-11-08-engineering-practices-integration/baseline/manifest.json` and its three source snapshots, including pre-existing uncommitted/untracked work. HEAD is not the baseline. The review used the approved design, integration/common/products plans, review README and changes.json, implementation rulings, coverage, examples, artifacts, model evaluation and remediation records.

All 976 entries in the supplied delta manifest were checked against current SHA256 bytes: zero drift. All 142 artifact entries were independently checked against current SHA512 bytes: zero drift. Generated copies remain in scope; their identity/structure was checked separately from reading authoritative content. This is a risk-based source/content review, not a claim that every repeated generated paragraph received an independent semantic reading.

Detailed review covered method-sync planning/preflight and metadata preservation, method definitions/catalog extension, engineering-content and evidence classifiers, the three engineering maintenance runners, container execution, local-registry changes, product snapshot declarations and packaging changes, the 14/8/14 authoritative local decision-card sets, core principles, representative bilingual text, new native example implementations and their assertions, resource/installation tests and reported distribution results. Existing installation engine behavior was treated as baseline; new resource declarations and regression evidence were assessed without attributing old engine code to this change.

Independent read-only checks executed in the respective repository roots:

- common: `node --import tsx --test tests/content/engineering-core.test.ts tests/content/engineering-resources.test.ts tests/engineering/evidence.test.ts` — 8 passed, 0 failed, 0 skipped.
- frontend: `node --import tsx --test tests/content/engineering-practices.test.ts tests/install/engineering-snapshot.test.ts` — 3 passed, 0 failed, 0 skipped.
- backend: `node --import tsx --test tests/content/engineering-practices.test.ts tests/content/engineering-snapshot.test.ts` — 2 passed, 0 failed, 0 skipped.
- Each current engineering maintenance CLI invoked with `--bogus`, through its installed tsx loader — rejected in all repositories; observed common exit 2, frontend exit 1, backend exit 1.

The implementation's final full-gate logs were inspected rather than rerun: common 187 pass/3 skip, frontend 344 pass/0 skip, backend 236 pass/42 skip. The separate real coexistence log records 39 pass/0 skip. The reported Linux subsets, native runs and archive extraction are implementation evidence, not newly executed full suites by this reviewer. Hash validation establishes that the reviewed artifacts match the manifest, not by itself that every artifact behavior is correct.

## Strengths

- The new common method is an additive catalog extension. Product declarations consume the installed common package, with the same exact `.4` candidate, rather than acquiring a sibling-source dependency. Logical counts remain 21/74/42.
- The sync implementation preserves unknown fields and non-owned entries, aligns all entry versions, leaves query bytes alone, stages both languages before writing, and rejects inconsistent indexes and unsafe paths. Tests cover damaged bilingual inputs, no-write checks and idempotence.
- Core rules are deliberately limited to eight self-contained anchors. Local language/scenario cards carry their own decisions, sources and evidence labels; they do not require another installed Skill's body. The new read-only checks confirm exact installed-source bytes and bilingual card contracts.
- Content respects project conventions and compatibility. C and C++ remain distinct; C++ exception policy and MSVC SAL are conditional; TypeScript corporate preferences do not silently override local rules. The unsafe generic retry sentence was corrected at its original API-guidance location, in both languages.
- Native evidence separates preparation/compilation from named behavior runs. The implemented negative checks reject missing tools, compile-only failures, empty/all-skipped suites and superficial PASS strings. Sample scope is explicit about React/JSDOM, Node IPC core and process-local HTTP idempotency.
- The archive/lock issue was investigated with real failed artifacts, then resolved using a new immutable candidate. The report retains failed attempts and does not claim that unpublished packages are publicly installable.
- Model evaluation reports its narrow result honestly: old 15/16 and new 16/16, without recasting the old answer as a substantive engineering failure or claiming general improvement.

## Critical

None established.

## Important

None established in the reviewed delta and stated verification scope.

## Minor

### M1 — Align invalid-invocation exit codes across engineering maintenance CLIs

Locations: `frontend-craft/scripts/verify-engineering.ts:284`; `backend-craft/scripts/verify-engineering.ts:222`.

Trigger: invoke the new maintenance command with an unknown argument or an incomplete option, for example `--bogus` or `--root` without a value. Both product wrappers catch the parse exception and return 1, while common returns 2 for the same invocation category.

Impact: a maintainer or wrapper using the planned shared 0/1/2 convention cannot distinguish malformed invocation from a genuine verification failure consistently across the three repositories. This does not turn failure into success, mutate installed resources or change the existing user-facing CLI; severity is therefore Minor.

Evidence: the three actual `--bogus` executions rejected the argument and produced exits 2/1/1. A5 calls for distinguishing argument/tool problems from business failures, and B2 explicitly reuses A5's exit semantics. The catch assignments above are the divergence.

Smallest recommendation: return 2 for parse/invocation errors in both product maintenance wrappers, preserving 1 for returned FAIL evidence. Add a narrow subprocess assertion for invalid arguments so tests cover the executable exit contract, not only parser throws.

### M2 — Remove this implementation's review-count constraint from the reusable backend card

Locations: `backend-craft/skills/bec-code-review/references/engineering-practices.md:34`; `backend-craft/localized/zh-CN/skills/bec-code-review/references/engineering-practices.md:34`.

Trigger: a consumer loads the distributed backend review card for a different project or review workflow. The English card says “this task has one independent final review”; the Chinese card likewise says “本任务只做一次最终独立评审”.

Impact: this task's orchestration decision appears as reusable product guidance and can incorrectly discourage another project's agreed review cadence. The preceding instruction to follow the agreed cadence limits the risk, but the subsequent fixed count is contradictory outside this implementation. This is content portability, not a request for more reviewers in this task.

Evidence: both authoritative local cards contain the same task-specific sentence; these cards are distributed resources, whereas the one-review constraint belongs in this task's plan/ledger. The neighboring frontend card already expresses a general workflow condition without fixing a count.

Smallest recommendation: retain the general instruction to follow the selected review workflow and avoid unneeded reviewers per card; remove the claim that every consumer task has exactly one final independent review. Keep the actual one-review decision in the implementation evidence.

## Recommendations

Resolve M1 and M2 as small maintenance/content corrections. Record disposition in remediation.md; retain this original report. If distributed card bytes change, refresh affected backend artifacts and their hashes and rerun the relevant content/packaging gates. No installation-engine redesign, language upgrade or additional independent review round is recommended.

## Declined to judge

- Full Linux parity: only the declared Linux subsets have execution evidence; this review did not run all three full Linux suites.
- GUI, native permission activation/signing, external database isolation, production authentication, distributed durability, real browser E2E, load and sanitizer guarantees: neither the reviewed samples nor recorded runs establish these properties; the delivery already limits those claims.
- Public-registry frozen installation of `.4`: the candidate is explicitly unpublished and temporary registry configuration has been removed. A public 404 is not evidence of a product defect here.
- Every minimum supported language/compiler version: newer-toolchain success is not a complete support matrix, and the evidence already states this limit.
- Independent causal/general model-quality improvement: exact hidden model identifiers and raw per-call reading traces are unavailable, and four paired tasks are insufficient for that claim. The limited descriptive result remains usable with the disclosed caveats.
- Fresh external-link availability and comprehensive legal/licensing conclusions: this review assessed the source registry's structure, use and stated limitations, not a new live crawl or legal determination.
- Exhaustive semantic equivalence of every localized sentence: bilingual IDs, levels, source/case mappings and shared resource bytes were checked, with text review concentrated on substantive rules and conflict boundaries; this is not a professional translation certification.

## Assessment

No evidenced Critical or Important blocker was found. The implementation is acceptable within its explicitly bounded scope, with two Minor corrections recommended. This conclusion does not authorize publication, commits or pushes, and does not convert unexecuted environments or limited model evidence into verified guarantees.
