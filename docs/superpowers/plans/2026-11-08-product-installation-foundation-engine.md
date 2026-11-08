# 公共产品安装引擎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将两个本地产品重复的安装机制抽入 common，并保持现有安装行为与存量资源兼容。

**Architecture:** 显式安装会话产生带哈希前置条件的变更；公共生命周期协调所有权、共享配置与既有共享事务。产品保留身份声明、历史清单编解码及内容转换。

**Tech Stack:** TypeScript / ESM、Node >=22、pnpm 12.4.1、esbuild、ESLint、tsx/node:test。

**Spec:** [已批准设计](../specs/2026-11-08-product-installation-foundation-design.md)，并先读[执行索引](2026-11-08-product-installation-foundation.md)。

## Global Constraints

- 以三个本地 checkout 为准；不拉取远端、不用已发布包替换本地实现。
- 本阶段不更名 Skill、不改公共正文；候选包版本变化仍会改变公共摘要。
- 15 个 Runtime、local/global、en/zh-CN 均保留；不新增宿主能力声明。
- common 无产品反向依赖，产品无第二份安装算法；显式会话不使用模块级可变状态。
- 用户修改、未知资源与根内链接受保护；dry-run 无任何写入或自动恢复。
- 既有显式 frontend `--force` 仅保留对本产品已认领文件的删除语义，不能扩大到未知文件、公共资源或其他产品；默认保护不变。
- 验收后准备提交建议，不直接 commit、push 或 publish。

## Review Focus

1. 同一配置、不同公共目标并发：A5 的跨进程测试必须证明无丢失更新。
2. 根 junction 与根内链接：A2 的 Windows 专项应分别接受及拒绝。
3. 已改动 Hook 或 TOML 项：A4/A7 保留用户及另一产品内容。
4. dry-run 遇到残留日志：A5 报 pending-recovery 且目录字节不变。
5. 新 common 版本但内容相同：A9 在写入前报告版本/摘要冲突。

## 文件结构与接口契约

新增文件集中于 common 的 `src/install/product/`；`src/install/types.ts`、planner、identity 的既有导出保持兼容。以下接口在 A2–A5 定义，并从 `src/index.ts` 导出：

```ts
// product/types.ts
type ProductAction = 'install' | 'update' | 'uninstall';
interface ProductDefinition {
  packageName: string; consumerProduct: string; resourcePrefix: string;
  manifestName: string; stateDirectoryName: string; markerId: string;
}
interface ProductContext {
  packageVersion: string; runtime: string; scope: 'local' | 'global';
  language: InstallLanguage; cwd: string; home: string; baseDir: string;
  allowedRoots: string[]; dryRun: boolean;
}
interface CommonPointer {
  target: string; ledgerDir: string; packageVersion: string;
  language: InstallLanguage; digest: string;
}
interface ProductManifestState {
  product: string; packageVersion: string; runtime: string;
  scope: 'local' | 'global'; language: InstallLanguage; installedAt: string;
  files: Array<{ path: string; hash: string }>;
  sharedEntries: Array<{ path: string; entry: OwnedEntry }>;
  common?: CommonPointer;
}
interface ManifestCodec {
  decode(bytes: Buffer, ctx: ProductContext): ProductManifestState;
  encode(state: ProductManifestState, ctx: ProductContext): Buffer;
}
interface ProductInstallResult {
  changed: string[]; preserved: string[]; conflicts: string[];
  common: 'shared' | 'none' | 'retained';
  status: 'complete' | 'partial' | 'planned';
}
interface RuntimeProductAdapter {
  configurationFiles(ctx: ProductContext): string[];
  plan(ctx: ProductContext, session: InstallSession): Promise<void>;
}
// session.ts; 规划结束后 session 不可再次写入。
interface InstallSession {
  read(file: string): Buffer; exists(file: string): boolean;
  stage(file: string, after: Buffer | null): void;
  writeManaged(file: string, after: Buffer): void;
  editShared(file: string, entry: OwnedEntry): void;
  retireTree(root: string, options?: { rejectUnknown?: boolean }): void;
  finish(): {
    mutations: FileMutation[]; manifest: ProductManifestState;
    preserved: string[]; conflicts: string[];
  };
}
```

`OwnedEntry` 保留现有 backend 的四种 discriminated union（text-marker/json-path/toml-key/json-hook）、hash、createdFile 等字段，在 A4 原样迁入并参数化身份。所有绝对 path 在 codec 解码后仍需 A2 校验，不信任清单声明的根。

上面是最终契约，按所属任务增量定义，不能在 A2 引用尚不存在的 session/lifecycle 模块：A2 先迁基础类型和 OwnedEntry 类型，A3 定义文件会话 `FileInstallSession = Omit<InstallSession, 'editShared'>`，A4 扩展为完整 InstallSession，A5 才引入 RuntimeProductAdapter。每个任务完成时单独 typecheck 必须通过。

## A1：固定两产品当前行为

**Files:**
- Modify: `frontend-craft/tests/install/runtime-compatibility.test.ts`, `frontend-craft/tests/install/all-runtimes-dry.test.ts`, `backend-craft/tests/install/runtime-matrix.test.ts`。
- Create: `frontend-craft/tests/install/fixtures/installation-contract.json`, `backend-craft/tests/fixtures/installation-contract.json`。
- Create: `craft-common/docs/verification/installation-foundation.md`（阶段证据追加于此）。

**Interfaces:** 消费当前 CLI、路径及矩阵；产出十五宿主的资源目标/产品能力基线和现有失败记录，后续任务不得机械改写预期以适配新实现。

- [x] Step 1：读取各 Runtime 转换器/适配器、现有测试及三仓 package.json；记录 argv、退出码、目录、文件所有权与手工步骤；排除 installedAt 等不稳定值。
- [x] Step 2：增加当前行为断言，例如 Codex skills 与 config 分离、OpenClaw 本地 skills 在 cwd、Copilot/Trae/Cline 不宣称标准 Skill 支持；夹具使用临时 home，不能写真实用户配置。
- [x] Step 3：在各自仓库运行 `pnpm build`、`pnpm test`；记录现状。此任务是特征化测试，预期当前实现 PASS；现有失败单独定位记录，不制造假 RED。
- [x] Step 4：确认完整命令和输出写入验证记录，两个产品的不同默认值明确列出。准备建议：`test(install): capture local product installation contracts`。

## A2：公共路径规则和 Runtime 描述

**Files:**
- Create: `craft-common/src/install/product/types.ts`, `paths.ts`, `runtime-descriptors.ts`, `shared-config/types.ts`（仅迁类型，不迁算法）。
- Create: `craft-common/tests/install/product-paths.test.ts`, `runtime-descriptors.test.ts`。
- Modify: `craft-common/src/index.ts`。

**Interfaces:**
- 产出 `resolveRuntimeTargets(input: { runtime: string; cwd: string; home: string; scope: 'local'|'global'; env: NodeJS.ProcessEnv; compatibility: 'frontend'|'backend' }): { baseDir: string; skillsDir?: string; resourceRoots: string[] }`。
- 产出 `safeProductPath(file: string, roots: readonly string[]): string`、`productPathKey(file: string): string`；路径大小写与真实祖先语义复用 common 既有代码及 backend safe-path，不另写不安全简化版。
- `compatibility` 仅选择 A1 中已有差异值，不能包含产品正文或形成两套算法；共同规则只有一份。能力描述与产品交付分别表示。

- [x] Step 1：写失败用例 `codex separates skill target from CODEX_HOME`、`openclaw local skills use workspace`、`legacy environment precedence survives`、`junction root accepted but child link rejected`、`unknown runtime rejects`。
  核心断言：`assert.equal(target.skillsDir, path.join(home, '.agents/skills'))`；自定义 CODEX_HOME 只影响配置根；不支持 Skill 的宿主返回 undefined。
- [x] Step 2：在 common 运行 `pnpm exec node --import tsx --test --test-concurrency=1 tests/install/product-paths.test.ts tests/install/runtime-descriptors.test.ts`，确认失败来自缺少上述 API/行为。
- [x] Step 3：实现接口与严格参数检查；已知差异从 A1 移入描述数据，公共代码不读取隐含全局 home/env。
- [x] Step 4：重跑局部测试、`pnpm typecheck`，预期全通过；Windows 专项不能以 Linux 跳过结果声称通过。建议提交名：`feat(common): define runtime targets and product path boundaries`。

## A3：显式产品写入会话

**Files:**
- Create: `craft-common/src/install/product/session.ts`, `craft-common/tests/install/product-session.test.ts`。
- Modify: `craft-common/src/install/product/types.ts`, `craft-common/src/index.ts`。

**Interfaces:** 消费 A2 路径校验与既有 FileMutation；产出 `createInstallSession(options: { definition: ProductDefinition; context: ProductContext; previous?: ProductManifestState; action: ProductAction; common?: CommonPointer }): FileInstallSession`。此任务实现暂存与文件所有权；A4 将返回类型扩展为完整 InstallSession，不用静默 no-op 占位。

- [x] Step 1：写 `sessions do not share pending writes`、`repeated stage keeps original beforeHash`、`planned deletion reads ENOENT`、`identical bytes create no mutation`、`modified owned files preserved`；editShared 的未实现测试留到 A4，不导出假实现。
  断言示例：两个 session 写同名目标后 `assert.notDeepEqual(a.finish().mutations, b.finish().mutations)`，磁盘仍是 before 字节；无变化时 `assert.deepEqual(result.mutations, [])`。
- [x] Step 2：运行 `pnpm exec node --import tsx --test --test-concurrency=1 tests/install/product-session.test.ts`，确认 RED。
- [x] Step 3：实现显式 Map 草稿、原始哈希、读己之写、所有权追踪、终止后禁写和严格退役；会话不触盘，不使用全局 draft。
- [x] Step 4：重跑测试及 A2；`pnpm typecheck` 通过。建议：`feat(common): add isolated product installation sessions`。

## A4：共享配置、清单编解码和部分卸载

**Files:**
- Modify: `craft-common/src/install/product/shared-config/types.ts`；Create 同目录 `index.ts`, `json.ts`, `toml.ts`, `text.ts`。
- Create: `craft-common/src/install/product/ownership.ts`, `craft-common/tests/install/product-ownership.test.ts`, `product-shared-config.test.ts`。
- Modify: `craft-common/src/install/product/session.ts`, `types.ts`, `craft-common/package.json`, `craft-common/pnpm-lock.yaml`, `craft-common/src/index.ts`, `craft-common/skills/metadata.json`, `craft-common/localized/zh-CN/skills/metadata.json`。

**Interfaces:**
- 公共 `planConfigEntry(input: { before: Buffer|null; owner: ProductDefinition; entry: OwnedEntry; previous?: OwnedEntry; action: 'upsert'|'remove' }): { after: Buffer|null; status: 'changed'|'unchanged'|'preserved' }`、`entryHash(entry: Pick<OwnedEntry,'kind'|'value'>): string`。
- 为 A6/A7 确定产品桥接契约：两产品分别导出 `PRODUCT_DEFINITION: ProductDefinition` 和 `MANIFEST_CODEC: ManifestCodec`，本任务不提前创建依赖新包的产品文件。consumerProduct 保留历史原值：前端 `frontend-craft`，后端 `@bovinphang/backend-craft`。
- codec 只做已有 JSON 结构与统一状态的映射；路径、身份、重复记录、摘要和配置条目结构必须验证。

- [x] Step 1：将 backend 已有 JSON/TOML/text 测试改成两种 owner 运行；增加用户条目、不同 owner、损坏配置、重复标记、原型键、修改后卸载、createdFile 保护。
  核心断言：删除 owner A 后 `assert.deepEqual(readConfig().otherOwner, originalOtherOwner)`；被修改条目的 status 为 preserved；不存在的删除不创建空文件。
- [x] Step 2：运行 `pnpm exec node --import tsx --test --test-concurrency=1 tests/install/product-shared-config.test.ts tests/install/product-ownership.test.ts`，确认 RED。
- [x] Step 3：迁入 backend 成熟配置算法并参数化身份，复用现有 `smol-toml@1.9.1`（迁入 common runtime dependencies）；增加字段精确删除和失败保留。common 版本切换为索引候选，并同步既有双语 metadata 的 version，不改变七个 Skill 的名称/正文。JSON-only 不借机引入新格式库。
- [x] Step 4：实现会话 editShared、完整 InstallSession 与卸载规划。公共层只消费 ManifestCodec 协议；两个真实 codec 在 A6/A7 接入时创建，避免产品提前依赖尚未安装的新包。
- [x] Step 5：common 配置与所有权测试 PASS；保留修改文件时 manifest 仍认领它、计划要求保留公共引用。建议：`feat(common): share configuration ownership and manifest contracts`。

## A5：锁、事务和生命周期

**Files:**
- Create: `craft-common/src/install/product/locks.ts`, `transaction.ts`, `lifecycle.ts`。
- Create: `craft-common/tests/install/product-lifecycle.test.ts`, `product-locks.test.ts`, `product-crash.test.ts`, `craft-common/tests/fixtures/product-worker.ts`。
- Modify: `craft-common/src/install/transaction.ts`（仅必要的共享原语提取）, `craft-common/src/index.ts`。

**Interfaces:**
- `runProductLifecycle(input: { action: ProductAction; definition: ProductDefinition; context: ProductContext; codec: ManifestCodec; adapter: RuntimeProductAdapter; common?: SharedRequest; forceOwnedRemoval?: boolean }): Promise<ProductInstallResult>`。
- `recoverProductTransaction(input: { definition: ProductDefinition; context: ProductContext }): Promise<void>`。
- `withProductConfigurationLocks<T>(files: readonly string[], operation: () => Promise<T>): Promise<T>`。先按真实配置键排序获取配置锁，再进入既有共享目标锁；所有调用遵循同一顺序，旧 executeSharedPlan API 保持兼容。
- 内部共享事务和无公共目标事务复用日志校验/原子写入原语，日志格式兼容读取；状态目录来自声明，不能从恢复日志扩大根。

- [x] Step 1：为两个不同 skillsDir 写同一配置启动并发子进程；断言最终两产品条目都存在或失败方明确 conflict，不能静默丢失。增加多目标反序输入无死锁测试。
- [x] Step 2：写 dry-run pending-recovery 用例：比较完整临时目录快照前后相等，返回 conflicts 含恢复待办，不创建 lock。写 no-skills 安装中断、提交前回滚、提交后清理、篡改日志及超大日志回归。
- [x] Step 3：运行 common 三个新测试文件，确认 RED；不把 child spawn 错误当业务失败。
- [x] Step 4：实现锁内恢复/重新读盘/规划/提交。共享公共目录走既有 executeSharedPlan，无公共目录走公共产品事务；部分卸载 retainConsumer 为 true，冲突不写入。
- [x] Step 5：运行新测试及既有 `transaction.test.ts`、`transaction-crash.test.ts`、`planner.test.ts`；`pnpm lint`、`pnpm typecheck` 通过。建议：`feat(common): coordinate product lifecycle and recoverable transactions`。

## A6：后端接入公共引擎

**Files:**
- Create: `backend-craft/src/install/manifest-codec.ts`；Modify: `backend-craft/src/product.ts`, `tests/install/manifest.test.ts`。
- Modify: `backend-craft/src/install/lifecycle.ts`, `types.ts`, `paths.ts`, `manifest.ts`, `product-plan.ts`, `transaction.ts`, `safe-path.ts`。
- Modify: `backend-craft/src/install/shared-config/index.ts`, `types.ts`, `json.ts`, `toml.ts`, `text.ts`；在所有调用迁移后删除不再使用的重复实现，不能保留两套算法。
- Modify: `backend-craft/src/install/adapters/shared.ts`, `claude.ts`, `codex.ts`, `cursor.ts`, `windsurf.ts`, `opencode.ts`, `kilo.ts`, `gemini.ts`, `copilot.ts`, `antigravity.ts`, `augment.ts`, `trae.ts`, `codebuddy.ts`, `cline.ts`, `openclaw.ts`, `qoder.ts`。
- Modify: `backend-craft/package.json`, `pnpm-lock.yaml`, `common-content.lock.json`（由同步生成）, `tests/install/lifecycle.test.ts`, `core-runtimes.test.ts`, `runtime-matrix.test.ts`, `shared-config.test.ts`, `product-plan.test.ts`。

**Interfaces:** 保持 `installRuntime(ctx, adapter?)`、`uninstallRuntime(ctx, adapter?)` 的调用及返回兼容；桥接到 A5。内部规划上下文显式携带 session，适配器仍只生成内容，禁止裸写。

- [x] Step 1：增加旧清单 codec 往返与 integration 用例：安装第二产品身份、更换相同 path 的 runtime/scope 被拒绝、部分卸载仍保留引用、无 skills 宿主也有事务；通过 stub 公共入口验证实际走新引擎而非旧实现。
- [x] Step 2：在 common 先 `pnpm build`、`pnpm pack --pack-destination <任务临时目录>`，再将依赖切到索引候选，按已有临时 registry 机制安装并同步快照；占位路径由执行时真实绝对目录替换。运行相关 tests，观察接入断言 RED。
- [x] Step 3：实现 PRODUCT_DEFINITION 与 MANIFEST_CODEC，保留后端 schema 和身份；路径及生命周期委托 common，先迁 shared adapter，再迁具体 adapter。所有会话通过参数传递，旧模块只允许薄导出适配，最终删除未使用重复逻辑。
- [x] Step 4：运行 `pnpm build`、相关局部 node:test 与 A1 矩阵，确认原命令/JSON/退出码兼容；doctor 和 matrix 不伪造宿主激活。建议：`refactor(backend): delegate installation to the common engine`。

## A7：前端接入公共引擎

**Files:**
- Create: `frontend-craft/src/install/product-definition.ts`, `manifest-codec.ts`, `frontend-craft/tests/install/manifest-codec.test.ts`。
- Modify: `frontend-craft/src/install/types.ts`, `cli.ts`, `manifest-installs.ts`, `runtime-homes.ts`, `runtime-skill-targets.ts`, `runtime-capabilities.ts`。
- Modify: `frontend-craft/src/install/shared/fs.ts`, `product-write-plan.ts`, `settings.ts`, `common-install.ts`, `opencode-family.ts`, `command-skills.ts`。
- Modify: `frontend-craft/src/install/converters/claude.ts`, `codex.ts`, `cursor.ts`, `windsurf.ts`, `opencode.ts`, `kilo.ts`, `gemini.ts`, `copilot.ts`, `generic-skills.ts`, `trae.ts`, `cline.ts`, `openclaw.ts`, `qoder.ts`。
- Modify: `frontend-craft/package.json`, `pnpm-lock.yaml`, `common-content.lock.json`（生成）, `tests/install/common-install.test.ts`, `update.test.ts`, `all-runtimes-dry.test.ts`, `end-to-end.test.ts`, `cli-lifecycle.test.ts`, `runtime-compatibility.test.ts`。

**Interfaces:** 现有 CLI 路由、runCommonAwareInstall/uninstall 调用通过薄包装接入 A5；转换器上下文携带 session，fs/settings 辅助函数显式接收它。包管理器更新/卸载与 Claude cache 策略保留在产品，不抽入 common。

- [x] Step 1：写旧清单 codec 往返、隔离会话转换器与首次 dry-run 真实文件计划测试；增加自更新回归，断言不改变现有 CLI 和资源命令区分；`--force` 只能删除本产品已认领修改文件，公共文件仍拒绝。
- [x] Step 2：安装与 backend 同一候选包并同步公共快照；运行相关文件，确认新的会话/规划断言 RED。
- [x] Step 3：实现 PRODUCT_DEFINITION 与 MANIFEST_CODEC：旧 settingsHooks 映射为精确 Hook 记录，写回保留旧字段，省略 root 按原语义解码。按 converter 逐个传 session，迁移 fs、settings、清单包装和生命周期；移除模块级 manifestSession/draft，不以全局“当前会话”实现兼容。
- [x] Step 4：迁移原先 dry-run 提前 return 的路径，使其通过真实规划生成预期变更但不写盘；保留现有用户可见输出约定。全量搜索裸写及旧机制调用并逐项解释必要例外。
- [x] Step 5：运行 `pnpm build`、相关 node:test 以及 A1 前端基线，PASS 后准备：`refactor(frontend): use explicit common installation sessions`。

## A8：公共内容快照同步复用

**Files:**
- Create: `craft-common/src/content/snapshot.ts`, `craft-common/tests/content/snapshot.test.ts`。
- Modify: `craft-common/src/index.ts`, `frontend-craft/scripts/sync-common.ts`, `backend-craft/scripts/sync-common.ts`, `backend-craft/src/content/snapshot.ts`。
- Modify: `frontend-craft/tests/install/common-content.test.ts`, `backend-craft/tests/content/common.test.ts`。

**Interfaces:** `syncProductSnapshot(input: { productRoot: string; commonRoot: string; check: boolean; domainMethods: Array<{ target: string; method: MethodName }>; extraResources: Array<{ source: string; target: string }>; retiredIds: Record<string,string> }): void`。来源目录仍由精确候选包提供；产品声明额外映射，公共层统一锁、索引和资源校验。

- [x] Step 1：把现有保护断言复用为公共测试，增加“一个未知文件导致全批同步拒绝且零改动”，`check: true` 前后字节完全相同、中文缺失失败、混合索引保留领域项。
- [x] Step 2：运行 common snapshot 测试确认 RED；实现完整预检后写入，旧锁认领且哈希未变的资源才允许清理。
- [x] Step 3：两个 sync-common.ts 只维护声明及入口；前端图表资源等特殊映射完整保留。移除 backend 重复 snapshot 算法，保留其他调用需要的薄导出。
- [x] Step 4：重打候选包、重新安装以更新真实 integrity；两产品 `pnpm run sync:common` 后 `pnpm run check:common` 都通过，再重复同步应零 diff。建议：`refactor(common): centralize protected product content snapshots`。

## A9：阶段门禁与兼容证据

**Files:**
- Modify: `backend-craft/tests/install/coexistence.test.ts`, `scripts/verify-coexistence.ts`, `craft-common/tests/install/product-lifecycle.test.ts`。
- Modify: `craft-common/docs/verification/installation-foundation.md`, `docs/consuming-common.md`, `README.md`, `frontend-craft/docs/common-migration.md`, `docs/zh-CN/common-migration.md`, `backend-craft/docs/coexistence.md`。

**Interfaces:** 消费 A1–A8；产出阶段 PASS/FAIL/未验证记录，只有通过后才执行 B。

- [x] Step 1：加入版本/语言/摘要冲突、两种安装顺序、两种单方卸载、用户修改、旧本地清单升级和 no-skills 共存回归。重点断言：相同正文但不同公共包版本仍无写入失败。
- [x] Step 2：三个仓库分别 `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test`；两个产品执行 `pnpm run check:common`。前端的 test 本身含 build，无新改动时不重复额外构建。
- [x] Step 3：backend 执行 `pnpm run verify:coexistence -- --frontend-root ../frontend-craft`，验证真实本地产品；保留原报告路径，不能仅使用静态 frontend-reference.json。
- [x] Step 4：在 Windows 与 Linux CI 运行相关矩阵；记录真实环境。核对两个产品只剩产品策略与薄适配，无第二份规划/事务/配置算法。
- [x] Step 5：记录候选 tarball/integrity、旧版协调卸载步骤、未验证项和实际命令；工作区检查不含全局 npmrc 或临时 registry 地址泄漏。建议：`test(install): verify shared engine compatibility across products`。

## 自审覆盖

- 设计 5–7、11–12 的机制/兼容/分发基础由 A1–A9 覆盖；能力内容与工程识别明确留到 B。
- 所有后续接口仅消费上方已定义名称；产品特有 InstalledAt/manifest schema 由 codec 维护，不新增跨产品清单混用。
- Review Focus 五项分别落在 A2/A4/A5/A7/A9 的具体断言。
- 旧共享协议原始单元与进程中断回归必须继续通过，新增路径不替代旧 API 验证。

执行状态（2026-11-08）：已授权的实施与验证完成，最终证据见docs/verification/cross-domain-capabilities.md。复选框不表示执行commit、push或publish；这些仍待明确授权。
