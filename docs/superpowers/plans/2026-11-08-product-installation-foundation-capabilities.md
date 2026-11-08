# 跨领域能力与框架专项 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 迁移十二个跨领域入口，交付七个框架专项，让桌面与全栈工程按子工程及任务组合能力。

**Architecture:** common 维护跨领域语言与桌面框架，产品组合完整公共快照和自身领域内容。通用扫描输出事实，产品注册框架证据，推荐仅使用该产品交付的能力；inspect 不执行项目命令。

**Tech Stack:** TypeScript / ESM、Node >=22、pnpm 12.4.1、tsx/node:test；专项案例遵循目标工程已有语言、框架与工具链。

**Spec:** [已批准设计](../specs/2026-11-08-product-installation-foundation-design.md)，先读[执行索引](2026-11-08-product-installation-foundation.md)及 [A 计划](2026-11-08-product-installation-foundation-engine.md)。

## Global Constraints

- A9 通过后才开始 B；仍以三个本地 checkout 为准，不从远端覆盖本地实现。
- 十二项迁移和七个框架按设计第 8–9 节，不增加 Qt/Wails/Libevent/Django 等候选。
- 首期公共目录完整一致；按任务推荐不等于动态下载、自动执行或裁剪公共安装。
- 新入口双语、metadata/relations/eval_queries 和本地参考资源完整；独立包不要求相邻 Skill。
- 语言不决定产品/服务角色，应用角色与 AI 宿主 platforms 分开。
- 新旧名不长期双重自动发现；用户修改阻断自动迁移，不覆盖公共资源。
- 无工具、无显示环境、数据库不可用、零测试和静态检查不能冒充真实专项行为验证通过。
- 不直接 commit、发布或推送；只准备建议和完整证据。

## Review Focus

1. Cargo.toml 仅表示 Rust，不能推出 Axum：B5/B6 的普通库反例。
2. Tauri/React/独立服务同仓：B5/B6 选择最近任务工程并组合 IPC 跨边界能力。
3. Java 语言正文隐藏服务前提：B2 同时验证 CLI/桌面示例和服务领域覆盖保留。
4. 原 Skill 附带未知或修改资源：B7 在公共部署前整批拒绝，保证字节不变。
5. 单独压缩包缺 references/样例或环境：B3/B4/B8 验证闭合与逐环境证据。

## 文件结构与公共接口

- `craft-common/src/content/applicability.ts`：能力适用信息解析，不引入第二套元数据目录。
- `craft-common/src/project/`：types、evidence、discover、frameworks、recommend，分别承担模型、受限文件证据、扫描、内置桌面检测和候选匹配。
- `frontend-craft/src/project/` 与 `backend-craft/src/project/frameworks.ts`：各产品的框架规则及 catalog 组合，不反向导入产品到 common。
- 迁入内容及桌面专项在 common 的 `skills/` 与 `localized/zh-CN/skills/`，服务框架在 backend 对应目录；两产品通过 A8 生成公共副本。

```ts
// applicability.ts；字段可选，兼容原 metadata。
type ProjectRole = 'ui'|'desktop-core'|'native-library'|'service'|'cli'|'unknown';
type TaskKind = 'ui'|'ipc'|'native-memory'|'api'|'data'|'build'|'review';
interface CapabilityApplicability {
  languages?: string[]; frameworks?: string[];
  roles?: ProjectRole[]; taskKinds?: TaskKind[];
}
interface CapabilityCandidate {
  id: string; sourcePackage: string; applicability?: CapabilityApplicability;
}
// project/types.ts
interface FrameworkEvidence {
  id: string; version?: string; paths: string[];
}
interface ProjectUnit {
  root: string; languages: string[]; frameworks: FrameworkEvidence[];
  roles: ProjectRole[]; evidence: string[]; buildFiles: string[];
  relatedRoots: string[]; ambiguous: boolean;
}
interface ProjectInspection {
  schemaVersion: 1; workspace: string; units: ProjectUnit[];
  warnings: string[]; truncated: boolean;
}
interface FrameworkDetector {
  id: string;
  detect(input: {
    root: string; files: readonly string[];
    readManifest: (relative: string) => string | undefined;
  }): { evidence: FrameworkEvidence; roles: ProjectRole[];
       relatedRoots: string[] } | undefined;
}
interface CapabilityRecommendation {
  id: string; projectRoots: string[];
  reasons: Array<'language'|'framework'|'role'|'task'>;
}
```

接口按所属任务增量落盘：B1 定义 applicability，B5 定义 project 类型/扫描，B6 定义推荐。relatedRoots 必须有明确框架布局或 workspace 成员证据，不以目录嵌套就传播角色。

## B1：能力适用模型与元数据校验

**Files:**
- Create: `craft-common/src/content/applicability.ts`, `craft-common/tests/content/applicability.test.ts`。
- Modify: `craft-common/src/index.ts`, `tests/content/metadata.test.ts`, `frontend-craft/tests/install/metadata-consistency.test.ts`, `backend-craft/scripts/check-content.ts`。

**Interfaces:** `readCapabilityCandidates(metadata: unknown, sources: Readonly<Record<string,string>>): CapabilityCandidate[]`；sources 来自已验证 catalog/lock 的 ID -> 来源包映射。已存在但未填 applicability 的条目继续有效，不根据 fec/bec 前缀推断语言或角色。未知属性保持现有索引内容，不破坏消费者。

- [x] Step 1：写旧 metadata 无新字段仍通过、多语言/多角色有效、AI 宿主名不能当 role、重复 ID/非法字段类型失败的测试。
  核心断言：`assert.equal(readCapabilityCandidates([{id:'cc-example'}], {'cc-example':'@bovinphang/craft-common'})[0].applicability, undefined)`；非法 role 或 sources 中没有该 ID 必须 throws。
- [x] Step 2：运行 common applicability/metadata 局部测试，确认 RED；实际旧 metadata 没有 sourcePackage，不假定旧 JSON 已有新字段。
- [x] Step 3：实现可选字段验证和各产品内容校验兼容；统一来源从 catalog/lock 读取，不信任条目自报任意来源。
- [x] Step 4：三仓相关内容测试及 `pnpm typecheck` 通过；建议：`feat(common): describe capability applicability independently of products`。

## B2：十二项跨领域入口迁移

**Files:**
- Create: common `skills/` 与 `localized/zh-CN/skills/` 下的 `cc-rust-project-standard`, `cc-go-project-standard`, `cc-java-project-standard`, `cc-python-project-standard`, `cc-c-project-standard`, `cc-cpp-project-standard`, `cc-rust-async`, `cc-go-concurrency`, `cc-python-async`, `cc-java-runtime`, `cc-native-memory-safety`, `cc-typescript-project-standard`；每个目录完整迁入原 references/scripts/assets。
- Modify: common 双语 `skills/metadata.json`, `relations.json`, `eval_queries.json`；对应产品双语索引。
- Modify: `backend-craft/skills/bec-architecture-design/`, `bec-api-design/`, `bec-transaction-management/` 及对应中文目录（接回原语言条目中的领域段落）。
- Modify: `backend-craft/src/project/languages/rust.ts`, `go.ts`, `java.ts`, `python.ts`, `c.ts`, `cpp.ts`；三仓 agents/commands/templates 中精确命中旧 ID 的受维护引用。
- Remove: 设计第 8 节对应的十一个原 bec 目录和一个原 fec 目录及其中文镜像；仅在源内容迁入、资源核对和引用改写完成后删除，不触及用户安装目录。
- Create: `craft-common/tests/content/cross-domain-skills.test.ts`。
- Modify: `craft-common/tests/content/metadata.test.ts`, `catalog.test.ts`, `skill-package.test.ts` 中固定公共 ID/数量的断言；本阶段公共入口准确为 19，B3 后为 21，不通过过滤目录弱化检查。
- Modify: `backend-craft/tests/content/skills.test.ts`, `tests/project/languages.test.ts`, `frontend-craft/tests/install/routing.test.ts`。

**Interfaces:** 十二个旧 -> 新 ID 一一采用设计表。现有语言模块的 skillIds 使用 cc 名称；源码目录在本任务迁移完毕，用户运行时目录的安全退役在 B7 完成。迁移中间阶段不发布包。

- [x] Step 1：写资源闭合、双语 ID 一致、正反触发及去领域化用例：Rust 库、Go CLI、Java 桌面模块、Python 脚本、C 库、C++ 桌面资源、通用 TS SDK 都可使用对应 cc 入口；语言入口不能要求 HTTP controller 或数据库分层。
- [x] Step 2：运行新内容测试确认 RED；逐项记录原文件清单和哈希，核对附属资源而非只拷 SKILL.md。
- [x] Step 3：移动并审查正文，服务约定回归既有 bec 领域内容；TS 中 React/Vue 约定回归现有领域入口。同步版权/来源与关系，不能用全仓字符串替换误改历史记录或合法领域规则名。
- [x] Step 4：更新语言模块、受维护引用与双语索引；重打 common tarball 并重新安装两产品后运行 `pnpm run sync:common`，生成副本。旧名称只允许存在于迁移表/历史说明/旧安装测试夹具中，独立 Skill 参考全部本地闭合。
- [x] Step 5：common 运行 `pnpm exec node --import tsx --test --test-concurrency=1 tests/content/cross-domain-skills.test.ts tests/content/metadata.test.ts`；两产品 `pnpm run check:common` 及各自相关 node:test 路由/语言测试通过。建议：`feat(common): centralize cross-domain language engineering skills`。

## B3：Tauri 与 Electron 专项

**Files:**
- Create: common 双语 `skills/cc-tauri-project-standard/SKILL.md`, `references/practice.md`, `references/verification.md`, `examples/minimal/`。
- Create: common 双语 `skills/cc-electron-project-standard/` 下同样文件。
- Create: `craft-common/tests/frameworks/tauri.test.ts`, `electron.test.ts`, `fixtures.ts`；测试直接使用英文入口 examples，中文引用相同语义且资源在单包中存在。
- Modify: common 双语 metadata/relations/eval_queries；`craft-common/tests/content/metadata.test.ts`, `resource-closure.test.ts`, `skill-package.test.ts`, `scripts/pack-skills.ts`（仅在存在硬编码清单时调整）。

**Interfaces:** 两个 cc 专项有明确 description，引用 Rust/TS 等基础时依然提供完成专项所需的本地参考；不假定兄弟 Skill 安装。专项样例不依赖完整产品源码。

- [x] Step 1：在实施时核验目标版本官方架构、IPC、安全及测试资料；将版本、URL、核验日期写入 references，不把 latest 的行为无条件应用到旧工程。
- [x] Step 2：写内容正反触发测试：Tauri command/权限调用应命中，普通 Rust 库不命中；Electron preload/IPC 命中，普通 Node HTTP 服务不命中。
- [x] Step 3：为 Tauri 最小样例写“拒绝越过允许目录的 command 输入”测试；为 Electron 样例写“拒绝不可信 sender 或不合规 IPC 参数”测试。先运行有缺陷版本观察真实业务失败，再实现受保护版本通过；两种状态使用同一案例，仅切换明确标注的缺陷函数。
- [x] Step 4：完成双语 Skill、实践检查和样例。Tauri 至少检查 command/core 与权限配置；Electron 至少检查 main/preload/renderer 契约。实际 GUI 启动、安装包和签名单独验证，不用普通 node 测试替代。
- [x] Step 5：运行 `pnpm exec node --import tsx --test --test-concurrency=1 tests/frameworks/tauri.test.ts tests/frameworks/electron.test.ts tests/content/resource-closure.test.ts tests/content/metadata.test.ts`；重打包并同步两产品公共快照。工具不存在时写 MISSING 证据，不能把启动失败当业务 RED。建议：`feat(common): add Tauri and Electron engineering specialties`。

## B4：五个服务框架专项

**Files:**
- Create: backend 双语 `skills/bec-spring-boot-project-standard/`, `bec-fastapi-project-standard/`, `bec-gin-project-standard/`, `bec-axum-project-standard/`, `bec-drogon-project-standard/`。
- 每目录 Create: `SKILL.md`, `references/practice.md`, `references/verification.md`, `examples/minimal/`。
- Create: `backend-craft/tests/frameworks/spring-boot.test.ts`, `fastapi.test.ts`, `gin.test.ts`, `axum.test.ts`, `drogon.test.ts`, `fixtures.ts`。
- Modify: backend 双语 metadata/relations/eval_queries，`tests/content/skills.test.ts`, `tests/packaging/packages.test.ts`, `scripts/pack-skills.ts`。

**Interfaces:** 五个独立入口 ID 与设计一致。每项先定位现有语言/框架版本，不要求框架迁移或固定全生态最新版；正文聚焦设计第 9 节列出的机制。

- [x] Step 1：核验官方版本资料，写正反触发与资源闭合测试；仅语言文件、无关包名及注释里出现框架名不算命中证据。
- [x] Step 2：分别建立一个明确缺陷/修复样例，并写断言：

| 框架 | 业务失败 -> 修复后的断言 |
| --- | --- |
| Spring Boot | 错误输入被当成功 -> HTTP 400 且无持久化副作用；事务说明另给真实数据库验证边界 |
| FastAPI | 资源未按 lifespan 初始化/释放 -> 请求期可用且退出后关闭，测试真正进入 lifespan |
| Gin | 失败校验后继续处理 -> 返回 400 且业务处理计数为 0 |
| Axum | 提取失败被映射成成功 -> 4xx 且 handler 副作用未发生 |
| Drogon | Filter 拒绝后仍执行处理 -> 拒绝状态且 Controller 副作用未发生 |

- [x] Step 3：逐框架执行同一测试的缺陷版本与修复版本，记录 RED/GREEN；缺工具、未准备依赖或数据库缺失记 MISSING，不自动下载安装或启动外部服务。
- [x] Step 4：完成双语内容及本地参考；不复制通用语言/TDD正文为第二维护源，必要方法通过已有生成机制内嵌。
- [x] Step 5：运行 backend 内容/闭合测试及可用框架工具的真实样例；每个专项独立记录环境边界。建议按框架分别准备 `feat(backend): add <framework> engineering specialty`，不混成无法评审的一个大提交。

## B5：公共多维工程扫描

**Files:**
- Create: `craft-common/src/project/types.ts`, `evidence.ts`, `discover.ts`, `frameworks.ts`。
- Create: `craft-common/tests/project/discover.test.ts`, `frameworks.test.ts`, `fixtures/`。
- Modify: `craft-common/src/index.ts`, `backend-craft/src/project/discover.ts`, `evidence.ts`, `types.ts`, `backend-craft/tests/project/discover.test.ts`。
- Create: `frontend-craft/src/project/frameworks.ts`, `backend-craft/src/project/frameworks.ts`。

**Interfaces:** `inspectWorkspace(options: { workspace: string; taskPath?: string; maxDepth?: number; maxEntries?: number; detectors?: readonly FrameworkDetector[] }): ProjectInspection`。内置识别 JS/TS 及已有六语言，内置 Tauri/Electron；产品分别注册 React/Vue/Next/Nuxt/Vite 与 B4 五框架。Tauri 与 Electron 是框架事实，不直接注册执行任务。

- [x] Step 1：从 backend 当前扫描测试提取已有安全与边界用例；新增以下夹具：React+Tauri、Electron 三进程、C 库+Rust FFI、UI+独立服务、普通 Rust 库、Python CLI、仅字符串假框架。
  核心断言：普通库 `frameworks` 不包含 axum，`roles` 不包含 service；Tauri 的 Web 与 src-tauri 通过明确布局关联，不将相邻 Rust crate 标成桌面核心。
- [x] Step 2：增加畸形/超大清单、package.json 工作区成员、Cargo workspace、任务路径越界、链接、敏感文件排除和扫描截断测试；从清单取版本约束，解析不明时保留警告而不猜精确版本。
- [x] Step 3：运行 common 两个 project 测试文件确认 RED；将 backend 扫描机制抽入 common，bounded readManifest 只能读取扫描范围内白名单清单，不允许 detector 任意打开绝对路径或敏感文件。
- [x] Step 4：实现基于依赖键/清单结构的 detector；不凭目录名、源码单个关键词或语言推断框架。roles 不明设 unknown；relatedRoots 只接受工作区成员或明确框架布局证据。
- [x] Step 5：backend 旧 inspectProject 输出继续符合既有 Project/Inspection 六语言语义：将 common units 映射到旧 projects，JS/TS 不注入旧 LanguageId。新完整 units 通过可选字段暴露，验证计划仍用原六语言模块。
- [x] Step 6：common 与 backend discover/validation-plan 旧测试通过；建议：`feat(common): inspect mixed projects using explicit technical evidence`。

## B6：候选能力推荐与两产品 inspect

**Files:**
- Create: `craft-common/src/project/recommend.ts`, `craft-common/tests/project/recommend.test.ts`。
- Create: `frontend-craft/src/project/inspect.ts`, `frontend-craft/tests/project/inspect.test.ts`。
- Modify: `frontend-craft/src/install/cli.ts`, `src/openclaw/framework-hint.ts`, `tests/install/cli.test.ts`。
- Modify: `backend-craft/src/cli.ts`, `src/cli/inspect.ts`, `src/cli/parse.ts`, `tests/cli/main.test.ts`。
- Modify: `craft-common/src/index.ts` 与双语 metadata applicability 字段。

**Interfaces:**
- `recommendCapabilities(input: { inspection: ProjectInspection; catalog: readonly CapabilityCandidate[]; task?: { path?: string; kind?: TaskKind } }): CapabilityRecommendation[]`。
- `fec project inspect [path] [--task-path relative] [--task-kind kind] [--json]`；backend 保留 `bec project inspect [path] [--json]`，新增相同两个可选 task 参数。
- workspace 由位置参数明确，task-path 必须在其内部；缺 task 时只给工程级候选，不声称知道用户意图。fec JSON 使用 ProjectInspection 加 recommendations；bec 保留原字段，加可选 units/recommendations。
- frontend `buildFrameworkHint(workspaceDir: string): string` 保持原返回契约，只委托检测，不执行验证或增加后台扫描。

- [x] Step 1：写四个核心推荐断言：UI 样式任务只推荐 UI；Tauri IPC 同时推荐桌面/Rust及相关 UI；普通 Rust 库不推荐 Axum；相邻服务不污染桌面任务。catalog 中没有的 bec 入口绝不出现在 fec 推荐中。
- [x] Step 2：定义匹配规则并测试：framework 条件必须被实际证据满足；同维度值为 OR、已声明的不同维度为 AND；task 未给时不强制匹配 taskKinds，task 给定则排除冲突候选；语言基础条目不因没有框架被排除。
- [x] Step 3：运行 common recommend 测试确认 RED；实现最近子工程选择，跨边界 taskKind=ipc 时只扩展有证据关联的应用节点，结果按 id 稳定排序并附 reasons，不输出敏感原文。
- [x] Step 4：写两产品 CLI 错误参数/越界/缺清单/扫描不完整/只读测试，确认 RED；接入 B5、实际交付 catalog 和新增命令参数。前端现有 install/setup/update 路由不得被 project 抢占。
- [x] Step 5：运行两产品 CLI 与 OpenClaw 提示回归；backend validate 计划及退出码不变。建议：`feat(inspect): recommend installed capabilities for scoped mixed-project tasks`。

## B7：旧入口退役与协调升级

**Files:**
- Modify: `frontend-craft/src/install/migration.ts`, `src/install/product-definition.ts`, `tests/install/migration.test.ts`, `common-install.test.ts`。
- Create: `backend-craft/src/install/migration.ts`, `backend-craft/tests/install/migration.test.ts`。
- Modify: `backend-craft/src/cli.ts`, `src/install/lifecycle.ts`, `src/product.ts`（声明迁移入口）。
- Modify: 两产品双语 agents/commands/templates 中受维护旧引用与双语 skills 索引；核对 B2 已删除原十二个源码入口并由公共快照替代，不能再次清理用户未知目录。
- Modify: `frontend-craft/docs/common-migration.md`, `docs/zh-CN/common-migration.md`, `backend-craft/docs/coexistence.md`, `docs/extending-languages.md`。

**Interfaces:** 产品保留 `LEGACY_SKILL_IDS: Readonly<Record<string,string>>`（仅包含自身原入口）；公共 session.retireTree 执行机制。新增 `bec runtime check-migration [runtime] [--local|--global] [--json]`，沿用前端只读检查的安全约束与 0/1/2 退出码，不移入公共产品特例。

- [x] Step 1：写受托管未修改旧目录可退役、用户编辑/未知附属文件/链接/所有权不明阻断、跨 root 伪造清单拒绝、dry-run 零写入测试；报告不能输出完整用户原文或敏感内容。
- [x] Step 2：运行两产品 migration 局部测试，确认新增旧名场景 RED；扫描包括不安装标准 Skill 的宿主转换引用，不假造别名功能。
- [x] Step 3：旧目录退役与新公共部署放在 A5 同一事务；先预检全部路径再写入。仓库源码删除旧目录前已在 B2 完成内容/资源核对，用户安装目录只按所有权操作。
- [x] Step 4：增加旧公共摘要/版本消费者阻断回归，提供协调升级步骤：旧 CLI 分别卸载 -> 整合残留 -> 新匹配产品安装。新 CLI 不自动升级/卸载另一个产品。
- [x] Step 5：两产品检查报告及安装回归 PASS；迁移指南解释旧产品命令与新 cc 入口，保留领域 Skill 名称。建议：`feat(migration): retire owned legacy language entries safely`。

## B8：全分发验收和文档同步

**Files:**
- Modify: `craft-common/docs/consuming-common.md`, `README.md`, `frontend-craft/README.md`, `README.zh-CN.md`, `backend-craft/README.md`, `README.zh-CN.md`, `docs/project-structure.md`。
- Modify: 三仓 `package.json` 的实际内容/分发契约、精确依赖与 lockfile，以及生成 `common-content.lock.json`；后端 OpenClaw/Claude 数量契约和前端版本同步脚本按实际清单更新。
- Modify: `craft-common/tests/content/npm-pack.test.ts`, `skill-package.test.ts`, `frontend-craft/tests/install/common-packaging.test.ts`, `npm-pack.test.ts`, `skill-package.test.ts`, `backend-craft/tests/packaging/packages.test.ts`。
- Modify: 三仓 `.github/workflows/ci.yml`，以及 `backend-craft/.github/workflows/language-fixtures.yml` 中相关数量/入口契约，支持既有 Windows/Linux 门禁和专项环境结果。
- Create: `craft-common/docs/verification/cross-domain-capabilities.md`；继续更新 A 的验证记录，不覆盖历史报告。

**Interfaces:** 期望 common 入口数为 21（既有 7 + 迁入 12 + 桌面 2）；backend 专属为 21（既有 27 - 迁出 11 + 新增 5），组合 42。frontend 专属从本地 A1 基线减去迁出的 TS 项，再加完整 common；数量由真实目录核算，不照抄旧文档 56 等历史值。

- [x] Step 1：新增打包断言，确保七个专项及十二迁移项的独立包有 SKILL.md、所需 references/examples/脚本且无仓库越界引用；原生单产品包公共快照完整，来源版本一致。
- [x] Step 2：重打同候选 common 包并重新安装，更新真实完整性摘要，再运行两产品 `pnpm run sync:common`、`pnpm run check:common`。public registry 发布前不会假定该候选可下载。
- [x] Step 3：各仓执行 `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test`；common 执行 `pnpm run pack:skills`，两个产品执行既有 `pnpm run pack:all`，backend 再执行真实本地前端的 `verify:coexistence`。没有新变更时不重复已包含的构建/测试。
- [x] Step 4：按 B3/B4 逐框架记录真实 RED/GREEN、工具版本、平台及 MISSING/NOT RUN；GUI、签名、数据库集成分列。只通过静态检查的专项不得标为框架运行时已验证。
- [x] Step 5：验证旧消费者残留保护、双产品共存与部分卸载、inspect 只读及未安装能力过滤，确认无公共文件双重认领、未知文件覆盖、临时 registry 地址或相邻源码依赖。
- [x] Step 6：同步中英文 README、职责、消费/迁移/框架/验证说明和来源清单；不改历史证据以伪装成当前数据。建议：`docs(craft): document cross-domain capabilities and coordinated upgrades`。
- [x] Step 7：全量 diff 独立评审，修复已证实问题并仅重跑相关验证；按执行索引最终条件交付三仓结果。实际 publish、push、commit 仍需独立明确授权。

## 自审覆盖与执行边界

- 设计 8–9 的十二项迁移与七框架分别对应 B2–B4；设计 10 的模型、证据、推荐与兼容对应 B1/B5/B6。
- 设计 7/11 的旧名、版本协调及分发闭合对应 B7/B8；设计 12 的环境真实性与验收矩阵对应 B3/B4/B8。
- 五项 Review Focus 全部有上述任务中的具体反例；所有 public 接口均在其所有任务定义，不使用未定义的跨任务函数。
- 本计划编写时没有执行这些任务，也没有声称测试通过；复选框只在取得对应证据后勾选。

执行状态（2026-11-08）：已授权的实施与验证完成，最终证据见docs/verification/cross-domain-capabilities.md。复选框不表示执行commit、push或publish；这些仍待明确授权。
