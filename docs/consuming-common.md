# Consuming Craft Common

[简体中文](consuming-common.zh-CN.md) · [Documentation](README.md)

## Versions and responsibilities

This source targets @bovinphang/craft-common 2.1.0 and requires Node.js 22+ with ESM. See the [project home](../README.md#library-integrators) for public availability. Products should pin an exact dependency and verify actual archives and provenance digests.

Common owns cc-* content, reusable methods, project facts and stable installation mechanics. Products own identity, domain content, legacy manifest codecs, runtime transformations and specialty commands. Common source depends only on its own library dependencies.

## Reading and distributing content

| API | Input and result |
| --- | --- |
| readContentCatalog(packageRoot, language) | Explicit package root and en / zh-CN; returns 21 entries, complete file lists, hashes, source versions and a digest |
| readMethodResource(packageRoot, method, language) | Reads reusable method bytes as a Buffer |
| collectSkillResources(skillRoot) | Recursively collects skill resources and checks closure and unsafe links |
| syncProductSnapshot(input) | Generates bilingual copies, embedded methods and common-content.lock.json from product declarations |

Method identifiers are source-driven-development, doc-sync, debug, refactoring, tdd and engineering-practices. Products embed methods under local references so standalone skill packages carry their method resources.

Resolve packageRoot explicitly in the caller. A catalog's root identifies its language content directory. Keep package-root resolution explicit after bundling.

## Product snapshot synchronization

Products call syncProductSnapshot from maintenance scripts with productRoot, commonRoot, check, domainMethods, extraResources and retiredIds.

1. Prepare bilingual content and provenance from the matching exact common package.
2. Run the product's pnpm run sync:common to generate common skills, domain methods and combined capability indexes.
3. Run pnpm run check:common for read-only resource, version and digest verification.
4. Run product content checks, build, tests and real archive verification.

Synchronization preflights bilingual completeness, previous lock hashes, unknown outputs and mixed indexes. Products continue maintaining their own index entries. Only unchanged obsolete files owned by the previous lock are removed. Unknown or edited content is preserved and blocks synchronization.

## Project facts and recommendations

inspectWorkspace({ workspace, taskPath?, maxDepth?, maxEntries?, detectors? }) returns project units, languages, framework version constraints, roles, evidence paths, relationships and truncation warnings. Defaults are depth 12, 10000 entries and 256 KiB per manifest. Discovery reads bounded project evidence, skipping internal links, sensitive files and dependency outputs.

recommendCapabilities accepts inspection, a product capability catalog and optional task, recommending only delivered capabilities. Nearest-project evidence bounds the task, and IPC relationships require matching desktop-framework evidence. Conditions use OR within a dimension and AND across dimensions. Without a task, results are project-level candidates. Legacy metadata can continue omitting applicability.

## Product installation entry point

runProductLifecycle accepts action, definition, context, codec, adapter and optional common.

- definition declares package name, consumer identity, resource prefix, manifest and state directory.
- context supplies version, runtime, scope, language, working directory, home and allowed roots.
- codec reads and writes the product's existing manifest format.
- adapter.plan(context, session) plans resources in an explicit session.
- common optionally coordinates shared deployment and consumer bookkeeping.

resolveRuntimeTargets unifies configuration directories, real skill targets and allowed roots for 15 runtimes. compatibility preserves historical product path and environment differences. createInstallSession supports reading planned writes, configuration-entry ownership and partial uninstall.

Hosts without standard skills can receive private reference material through product transactions. Product adapters declare the conversion policy.

## Shared deployment and recovery

| API | Responsibility |
| --- | --- |
| resolveSharedIdentity(skillsDir) | Canonicalizes the real target and locates state under a target-path digest directory in the parent's craft-manifests directory |
| planSharedDeployment(request) | Plans common-resource and consumer changes without writing and reports conflicts |
| executeSharedPlan(request, options) | Replans under locks and coordinates common resources, bookkeeping and product files |
| recoverSharedTransaction(skillsDir, allowedProductRoots?) | Performs bounded recovery after confirming the original local process has exited |

A real skill target is shared by exact version, language and content digest. Consumers are identified by product name, real manifest path and scope. Product manifests track private files and shared configuration entries; the common protocol tracks cc-* files.

Execution checks product mutation path, beforeHash, after and allowed roots. Partial uninstall uses retainConsumer to preserve common references; complete uninstall releases them. Configuration-path locks coordinate products, with recovery and rereads performed under locks.

dry-run performs real planning with read-only disk behavior. Interruptions before commit roll back; committed transactions are verified and cleaned up. External edits preserve recovery evidence. Declared roots can themselves be junctions, while internal links are restricted. The protocol covers local concurrency and process interruption recovery. Power-loss durability and multi-host shared filesystems require separate verification.

## Coordinated upgrades and distribution

1. Back up user edits and record product, runtime, scope and language.
2. Release old common consumers through each old product CLI and resolve preserved files before retrying.
3. Install verified product builds with matching common versions, languages and content digests.
4. Run each product's doctor, provenance checks and host discovery confirmation.

Publish common before consumers. Generate library archives with pnpm exec npm pack and inspect actual content. After publication, verify public archive SRI and product frozen-lockfile installations. Remove temporary project registry configuration after local integration, keeping final locks aligned with public sources.

<a id="工程结构与维护入口"></a>

## Project structure and maintenance

[Project structure](project-structure.md) describes modules, generation boundaries and checks. [CLI integration](cli-integration.md) covers 2.1.0 product command composition. [Contributing](../CONTRIBUTING.md) explains maintenance workflows.

[Historical installation evidence](https://github.com/bovinphang/craft-common/blob/main/docs/verification/installation-foundation.md) and [2.0.0 release notes](releases/2.0.0.md) retain their original versions and results.
