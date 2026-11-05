# frontend-craft 3.0 公共能力抽取实施计划

> **面向执行代理：** 必须使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 逐任务实施；执行方式由用户选择。本计划用复选框跟踪进度，实施与验证已经完成，详见交付报告和执行账本。

**目标：** 在 frontend-craft 3.0 中交付七个由 craft-common 唯一维护的 cc 公共入口，以及安全共享安装和只读迁移检查。

**架构：** common 发布固定版本内容和共享安装协议，前端生成可校验的分发快照。原有 Runtime 适配继续负责领域文件；共享公共文件由按实际目标目录定位的独立账本管理。

**技术栈：** TypeScript、Node >=22.0.0、ESM、pnpm@12.4.1、esbuild、tsx、node:test，沿用现有 ESLint 和严格类型检查。

**设计依据：** [已批准的设计](../specs/2026-11-05-common-capabilities-extraction-design.md)。执行者须先读设计和本计划。

## 全局约束

- frontend-craft 为 3.0.0；`@bovinphang/craft-common` 首版 1.0.0，产品依赖精确固定为 `1.0.0`。
- 公共入口为 cc-*，前端专业入口为 fec-*；不注册旧、新两个公共入口，不引入第三个需要用户手动安装的插件。
- 首期七个公共入口及保留的前端入口严格按设计第 5 节，不扩大迁移范围；backend-craft 不修改。
- 延续默认英文内容、localized/zh-CN 内容及现有多语言文档事实。计划、说明和报告使用中文，已有产品正文遵循仓库语言惯例。
- 无 Skill 能力的 Runtime 保留现有降级，不伪造支持；原生插件本期验收单产品完整交付，不承诺双产品原生去重。
- 只删除清单托管且哈希未变化的文件；用户修改、未知文件、路径越界、损坏账本均不能通过 force 静默接管公共内容。
- dry-run 零写入；公共文件不可被产品独占清单重复认领；最后消费者退出才清理未修改公共内容。
- 未发布公共包用本地 tarball 在临时测试项目联调；最终产品依赖不能保留 file/link/workspace 协议或相邻仓库绝对路径。不实际发布 npm、推送或提交 Git。
- 每个任务结束审阅其 diff 并记录验证；项目要求用户确认后才能 commit，因此以下“提交边界”仅表示建议批次，不执行提交命令。

## 重点审阅条件

1. 含空格、中文、Windows 盘符的路径和指向同一目标的 junction：身份一致且无越界。任务 6、8 用实际临时目录验证。
2. 两消费者同版本但中文/英文不同，或源摘要不同：先报冲突，产品文件与公共文件都零变更。任务 6、8 验证。
3. 进程在资源写入与账本替换之间中断、两个进程同时安装：无成功假象、不误删、可恢复或安全拒绝。任务 7 验证。
4. 公共文件用户修改、最后卸载留下残留，随后重新安装：保留修改及清单，不能把残留当无主文件覆盖。任务 6、7 验证。
5. tarball 装入空目录且源码目录不可用，动态脚本读取 styles/data/本地方法：全部可运行，cc 包版本不能被产品版本覆盖。任务 2、4、5、10 验证。

## 文件责任与接口地图

所有路径以 `D:/code/github/craft-ai-coding/` 为工作区根；下文 C 表示 craft-common，F 表示 frontend-craft。它们是独立仓库，不在父目录执行 Git。

| 文件/目录 | 单一职责 |
| --- | --- |
| C/package.json、tsconfig.json、eslint.config.mjs、scripts/build.ts、scripts/run-tests.ts | 公共包构建、类型声明和既有风格的测试工具链 |
| C/skills、localized/zh-CN/skills、methods | 公共 Skill 权威内容、资源、元数据、触发评估与可内嵌方法 |
| C/src/content/{types,catalog,resources}.ts | 内容契约、基于显式包根的目录读取、完整资源清单 |
| C/src/install/{types,identity,planner,transaction}.ts | 共享数据类型、目标身份、只读计划、持久事务执行和恢复 |
| C/src/index.ts | 导出内容与安装稳定 API，禁止导入 F 源码 |
| F/scripts/sync-common.ts、common-content.lock.json | 从精确公共包生成分发快照、组合索引和内容锁 |
| F/src/install/shared/{common-content,common-install}.ts | 从产品快照读取公共内容；协调前端与公共安装 |
| F/src/install/{runtime-skill-targets,migration}.ts | Runtime 实际 Skill 目标解析、迁移扫描和旧入口预检 |
| F/src/install/shared/fs.ts、settings.ts、types.ts、manifest-installs.ts、cli.ts | 保留已有行为，增加可计划写入与公共依赖生命周期接入 |
| F/scripts/{skill-packaging,pack-skills,check-skills-publish,sync-version}.ts | 按来源版本打包，递归携带运行资源，校验生成内容 |
| C/tests、F/tests/install | 各模块行为、现有适配回归和本地 tarball 交付验证 |

## 任务 1：建立可构建的公共内容包

**文件：** 新建 C/package.json、pnpm-lock.yaml、tsconfig.json、eslint.config.mjs、.gitignore、src/index.ts、src/content/types.ts、src/content/catalog.ts、scripts/build.ts、scripts/run-tests.ts、tests/content/catalog.test.ts、README.md。

**接口：** `InstallLanguage = "en" | "zh-CN"`；`ContentFile = { relativePath: string; hash: string }`；`SkillRecord = { id: string; version: string; sourcePackage: string; repository: string; files: ContentFile[] }`；`ContentCatalog = { schemaVersion: 1; packageName: "@bovinphang/craft-common"; packageVersion: string; language: InstallLanguage; root: string; skills: SkillRecord[]; digest: string }`。

产出 `readContentCatalog(packageRoot: string, language: InstallLanguage): ContentCatalog`，根路径必须由调用者传入，避免 bundle 后定位错误。根目录不进入 digest；路径排序、POSIX 相对路径和文件字节决定摘要。

- [x] 记录 F 的原始 `pnpm lint`、`pnpm typecheck`、`pnpm test` 结果与 Git 状态，报告已有失败。缺依赖先检查现有配置，按仓库命令安装。
- [x] 建立最小工具链与测试夹具，新增测试“显式包根在含空格和中文路径可读取”“相同字节跨根目录摘要相同”“语言不存在即报错”“公共包名与版本为 1.0.0”。断言 `catalog.packageName === "@bovinphang/craft-common"`、`catalog.packageVersion === "1.0.0"`。
- [x] 在 C 执行 `node --import tsx --test tests/content/catalog.test.ts`；确认失败原因来自尚未实现的目录契约，不把语法或依赖错误当有效红灯。
- [x] 实现上述类型与读取函数；`exports` 提供 dist JS 和 d.ts，`files` 包含 dist、skills、localized、methods、LICENSE。补齐 lint/typecheck/test/build 脚本，复用 F 的依赖版本和测试发现模式。
- [x] 执行 C 的 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`，确认退出 0。提交边界：`feat(common): 建立公共能力包与内容契约`。

## 任务 2：迁移 draw.io 与技术图表的完整资源

**文件：** 新建 C/skills/cc-drawio-studio/**、cc-technical-diagrams/** 及 localized/zh-CN 对应内容；新建 C/src/content/resources.ts、tests/content/diagrams.test.ts、tests/content/resource-closure.test.ts。来源为 F/skills/fec-drawio-studio/**、fec-image-generation/** 和对应中文包；此任务暂不删除 F 旧目录。

**接口：** `collectSkillResources(skillRoot: string): ContentFile[]`，从完整技能目录收集发布资源并校验引用、脚本相对导入、动态 data/styles 依赖；拒绝越界路径及外部符号链接。消费任务 1 的类型，任务 5 复用此资源闭合契约。

- [x] 将既有 diagram-quality、drawio-studio-skill、image-generation-skill 测试中可独立运行的行为转为 C 测试；先在 F 当前资源上确认绿色，记录图表特征基线。
- [x] 新增断言：新公共 ID 正确；draw.io styles/schema、三个预设、shape-index、brand-icons、THIRD_PARTY_NOTICES 存在；技术图表脚本相对导入闭合；动态读取资源缺失和 `../` 越界引用会失败。
- [x] 执行 C 的上述两个测试文件，确认新路径相关断言失败，再迁移完整资源并更新内部路径、ID、可编辑图表与视觉生成的职责说明。PNG QA 归公共源所有。
- [x] 将两个 Skill 复制到临时空目录，运行既有图表 JSON 渲染、无外部工具的结构校验和无效布局样例；可选 draw.io/Graphviz/Mermaid 不可用时验证已有降级，不自动安装工具。
- [x] 执行 C 的 `pnpm test`、`pnpm typecheck`。要求已迁移行为与基线一致，额外依赖均明确记录。提交边界：`refactor(common): 提取图表能力与完整资源`。

## 任务 3：提取五类通用方法及领域复用契约

**文件：** 新建 C/skills/cc-source-driven-development、cc-doc-sync-core、cc-debug-methodology、cc-refactoring-core、cc-tdd-methodology；对应中文内容；C/methods/{source-driven-development,doc-sync,debug,refactoring,tdd}.md 和 localized/zh-CN/methods 对应文件；C/skills/{metadata,relations,eval_queries}.json；C/tests/content/methods.test.ts、metadata.test.ts。

**接口：** `readMethodResource(packageRoot: string, method: "source-driven-development" | "doc-sync" | "debug" | "refactoring" | "tdd", language: InstallLanguage): Buffer`，放在 C/src/content/catalog.ts 并从 index 导出。公共正文通过本地引用使用相同方法源的生成副本，不人工维护两份通用正文。

- [x] 新增行为清单测试：源码事实优先；文档事实和多语言一致性；五步诊断；行为保持的 GREEN→REFACTOR→GREEN；新行为的 RED→GREEN→REFACTOR。断言七个公共 ID 的集合与设计完全一致，英文/中文一一对应，元数据归属 common@1.0.0，正负触发样例齐全。
- [x] 执行 C 的这两个测试文件，确认新方法与入口断言失败。
- [x] 从 F 原内容提取通用契约；将 React/Vue、DOM、浏览器、Testing Library/Playwright 等领域步骤留给前端，公共方法不强制某个技术栈。补齐中英文引用和 metadata/relations/eval_queries。
- [x] 补充非前端案例的触发评估，同时断言公共方法不会要求后端任务运行前端专属工具；保留原约束和输出证据要求，不只做前缀替换。
- [x] 执行 C 的 `pnpm lint`、`pnpm typecheck`、`pnpm test`。提交边界：`refactor(common): 提取通用研发方法与技能元数据`。

## 任务 4：前端消费公共包并生成锁定分发快照

**文件：** 新建 F/scripts/sync-common.ts、F/common-content.lock.json、F/src/install/shared/common-content.ts、F/tests/install/common-content.test.ts；修改 F/package.json、pnpm-lock.yaml、scripts/build-dist.ts、前端领域 Skill 与中英文对应目录；生成七个 F/skills/cc-* 和中文目录、`references/common` 方法资源；删除两种语言下完整迁出的 fec-drawio-studio、fec-source-driven-development 旧目录。

**接口：** `readProductCommonCatalog(productRoot: string, language: InstallLanguage): ContentCatalog` 使用产品快照和内容锁，不依赖运行时 npm 包根；`syncCommonContent({ productRoot, commonRoot, check }: { productRoot: string; commonRoot: string; check: boolean }): void` 位于同步脚本的独立可导入模块部分，check 模式只读。

- [x] 新增测试：精确来源版本为 1.0.0、生成文件逐字节可复现、改动快照后 check 失败且不改写、bundle 后不依赖兄弟目录、缺失 common 包报清楚来源。断言产品最终 61 个 Skill 目录：56−2+7。
- [x] 在 F 执行 `node --import tsx --test tests/install/common-content.test.ts`，确认新行为失败。
- [x] 实现同步与内容锁；五个领域流程内嵌公共方法本地引用，fec-image-generation 保留视觉任务并生成所需 PNG QA 副本；前端 source-driven 规则保留领域扩展。产品的 cc 目录是受版本控制、禁止手改的生成快照。
- [x] 联调时先在 C 执行 `pnpm pack --pack-destination <工作区内临时目录>`；将其装入临时消费项目验证同步脚本的显式 commonRoot。最终 F/package.json 依赖仍为精确 `1.0.0`。未公开发布的依赖安装可用本地临时 registry 将该 tarball 以相同包名和版本提供给 pnpm，生成正式依赖条目及完整性；最终锁不得引用本地 registry 地址，须在公开发布后重新解析或明确标注该发布前阻断，禁止伪造完整性/可下载状态。
- [x] 新增 `sync:common` 和 `check:common` 脚本，构建前检查快照，不静默改源码。更新命令、Agent、规则、模板中受控引用：完整迁出才换名，拆分保留前端入口。
- [x] 执行 F 的目标测试与 `pnpm run check:common`，确认移动来源目录后产品快照仍独立。未发布依赖导致 frozen 安装暂不可验证时如实报告。提交边界：`feat(frontend): 接入公共内容包与可复现快照`。

## 任务 5：按来源维护索引、版本及独立 Skill 包

**文件：** 修改 F/scripts/skill-packaging.ts、pack-skills.ts、check-skills-publish.ts、sync-version.ts、src/install/shared/content-audit.ts、skills 三个索引及中文索引；修改 F/tests/install/{metadata-consistency,skill-package,sync-version,content-audit,refactoring-subsystem}.test.ts；新增 C/scripts/pack-skills.ts、C/tests/content/skill-package.test.ts。

**接口：** `resolveSkillOrigin(skillId: string, productRoot: string): { packageName: string; version: string; repository: string }` 位于 F/scripts/skill-packaging.ts；cc 解析内容锁，fec 解析产品 package.json。任务 2 的资源闭合契约用于独立包生成和检查。

- [x] 新增断言：cc 包名 `@bovinphang/cc-drawio-studio`、版本 1.0.0、repository 指向 craft-common；fec 包版本 3.0.0。产品 sync:version 不改变 cc 元数据；relations 允许有效 cc/fec 来源且仍拒绝不存在的 ID。
- [x] 执行上述版本与包测试，确认旧的“全部技能跟随产品版本”行为失败。
- [x] 修改索引组合、版本同步及审计，按来源合并而不手改 common 元数据。独立包递归携带 scripts/data/styles/assets/references，保留许可证声明；不放松未知 ID 或失效引用检查。
- [x] C 提供公共独立包生成入口；F 的组合打包可复用该元数据，不宣称自己是 cc 权威源。现有 standalone 正文规则扩展到两个前缀，领域包通过本地方法引用保持独立。
- [x] 执行 C 目标测试及 F 的 `pnpm run pack:skills`、`pnpm run check:skills-publish`、`pnpm run check:content`。在临时空目录运行打出的图表包，确认 scripts 的二级导入和 styles 不丢失。提交边界：`fix(packaging): 按公共来源打包资源与版本`。

## 任务 6：实现只读共享部署计划与所有权模型

**文件：** 新建 C/src/install/types.ts、identity.ts、planner.ts、C/tests/install/{identity,planner}.test.ts、fixtures.ts；导出于 C/src/index.ts。

**接口：** `Consumer = { product: string; manifestPath: string; scope: "local" | "global" }`；`SharedRequest = { action: "install" | "update" | "uninstall"; skillsDir: string; consumer: Consumer; catalog?: ContentCatalog }`，install/update 缺 catalog 报错；`FileMutation = { path: string; beforeHash: string | null; after: Buffer | null }`；`CommonPlan = { schemaVersion: 1; target: string; stateDigest: string; mutations: FileMutation[]; conflicts: string[] }`。

产出 `resolveSharedIdentity(skillsDir: string): { target: string; ledgerDir: string }`、`planSharedDeployment(request: SharedRequest): CommonPlan`。账本路径为 ledgerDir 下 craft-common.json 和 dependencies.lock.json，schemaVersion 1；按消费者标识集合管理引用，不做简单加减计数。

- [x] 写测试：frontend/backend 两顺序、幂等注册、单方/最后卸载、版本/语言/同版本摘要冲突、未知文件、用户修改、缺文件、坏账本、不存在的祖先目录、路径穿越。对冲突断言 `plan.conflicts.length > 0` 且磁盘快照不变。
- [x] 写身份测试：中文和空格路径、Windows junction 别名与真实路径同 target；不同真实目录不同 target；现存祖先 realpath 后安全拼接不存在子路径。测试创建仅限系统临时目录。
- [x] 执行 C 的这两个测试文件，确认新行为失败，再实现只读规划、字节哈希、相对路径校验、引用集合与内容冲突判定。产品 manifest 的公共依赖仅保存 target、ledgerDir、精确版本、语言和摘要。
- [x] 对最后卸载的用户修改保留零消费者残留记录；随后安装再次报保护冲突，不能回收修改或变成无主覆盖。
- [x] 执行 C 的 `pnpm typecheck`、`pnpm test`，断言所有 planner 测试零写入。提交边界：`feat(common): 增加共享部署身份与所有权计划`。

## 任务 7：事务执行、并发和中断恢复

**文件：** 新建 C/src/install/transaction.ts、C/tests/install/transaction.test.ts、C/tests/fixtures/transaction-worker.ts。

**接口：** `executeSharedPlan(request: SharedRequest, options: { dryRun: boolean; productMutations?: FileMutation[]; allowedProductRoots?: string[] }): Promise<CommonPlan>` 在持锁后重新规划与验证，冲突抛错；`recoverSharedTransaction(skillsDir: string): Promise<"clean" | "recovered">`。productMutations 缺少允许根或越界必须拒绝；CommonPlan 的 beforeHash 防止覆盖规划后的修改。

- [x] 新增实际子进程测试：排他锁争用；资源写入后/账本提交前被终止；已提交但清理前中断；恢复后重复执行；不能确认的旧锁安全报错。验证每次报告成功都满足账本与文件哈希一致。
- [x] 新增失败注入测试：产品写入失败时不能保留成功消费者状态；临时文件和日志位置在受控目录；计划后文件被编辑则拒绝；dry-run 连锁文件都不创建。包括任务 6 保留残留后的重入场景。
- [x] 执行 C 的事务测试，确认失败，再实现锁内重新读取、事务日志、原始内容备份、原子替换和幂等恢复；日志不得信任任意绝对路径，始终核对目录边界与摘要。明确提交标记前回滚、标记后继续清理的恢复规则。
- [x] 使多个替换步骤可被测试注入故障，测试接口不暴露为正常 CLI 参数；恢复无法安全完成时保留日志并报错。
- [x] 执行 C 的完整测试、lint/typecheck；Windows 和 Linux 分别由 CI 验证平台语义，本地未运行的平台不得声称通过。提交边界：`feat(common): 保护共享安装事务与故障恢复`。

## 任务 8：前端各 Runtime 与完整生命周期接入

**文件：** 新建 F/src/install/runtime-skill-targets.ts、shared/common-install.ts、F/tests/install/common-install.test.ts；修改 F/src/install/{cli,types,manifest-installs}.ts、shared/{fs,settings}.ts、converters/*.ts 的 Skill 来源选择及计划写入入口；扩展现有 cli-lifecycle、all-runtimes-dry、end-to-end、runtime-compatibility 测试。

**接口：** `getRuntimeSkillsTarget(ctx: InstallContext): string | undefined` 为技能能力匹配真实目标；`planProductMutations(operation: () => Promise<void>): Promise<FileMutation[]>` 保留既有 fs 导出，对写入/回收/共享配置变更生成内存计划而非提前写盘；`runCommonAwareInstall(ctx: InstallContext, installProduct: () => Promise<void>): Promise<void>` 协调产品计划与任务 7 事务；卸载同理通过统一协调路径调用共享协议。

- [x] 新增集成测试：Codex 的 CODEX_HOME 与 .agents/skills 分离仍正确落账；OpenClaw 项目 skills 不误记到 baseDir；消费者清单内不含 cc 文件；15 Runtime 干运行零写入，无 Skill 能力返回 undefined。
- [x] 新增测试：版本/语言冲突时产品也零修改；普通安装、runtime update/uninstall、CLI uninstall --purge 都保留其他消费者；产品安装失败不记成功公共引用。doctor/status 检查公共依赖完整性，而非只看 fec 目录。
- [x] 执行 F 的 common-install 及既有生命周期目标测试，确认新断言失败。
- [x] 在现有 fs 会话中引入计划模式并保留直接模式兼容；盘点并调整 converters、settings、卸载中的直接 fs 写入/rename/remove，确保事务前无遗漏副作用，不用全局 monkey patch。公共 cc 文件始终过滤出产品会话，按任务 6、7 单独登记。
- [x] 将目标路径解析作为适配器与协调层共同真源，避免复制一份路径规则；产品写入允许根继续按现有 baseDir/cwd/home 边界校验。受控配置合并保留用户内容。
- [x] 执行 F 的 `pnpm lint`、`pnpm typecheck`、`pnpm test`，通过隔离 HOME/配置目录的测试夹具验证，不写用户真实安装目录。提交边界：`feat(frontend): 接入公共能力共享生命周期`。

## 任务 9：迁移检查与旧公共入口安全退役

**文件：** 新建 F/src/install/migration.ts、F/tests/install/migration.test.ts、F/docs/zh-CN/common-migration.md、F/docs/common-migration.md；修改 cli.ts 帮助及参数分派；旧入口清理由 shared/common-install.ts 接入。

**接口：** `MigrationFinding = { file: string; line?: number; id: string; kind: "rename" | "split" | "legacy-install" | "conflict"; replacement?: string; message: string }`；`MigrationReport = { findings: MigrationFinding[]; errors: string[]; exitCode: 0 | 1 | 2 }`；`checkMigration(options: { cwd: string; runtime?: string; scope: "local" | "global" }): MigrationReport`。

CLI 固定为 `fec runtime check-migration [runtime] [--global|--local] [--json]`，默认 local；不传 runtime 则枚举已支持 Runtime；互斥 scope、未知选项或 runtime 返回 2。仅显式 --global 扫描其托管安装范围，不递归扫描整个用户主目录。

- [x] 新增测试断言：完整改名的两个 ID 给 rename；image 技术图表调用给 split；doc/debug/refactoring/tdd 仍可作为有效前端入口，不把名称出现一概视为必须替换；退出码分别为 0/1/2。
- [x] 新增旧安装预检测试：旧 manifest+匹配哈希可计划退役；用户编辑、未知目录、坏 manifest 阻止本次安装且零写入；可保留的 fec 入口不删除。
- [x] 新增扫描测试：项目文本中的路径/行号准确；`.git`、node_modules、dist、二进制、符号链接、`.env*`、密钥文件排除；输出仅含必要标识与定位，不回显整行潜在秘密。JSON 输出可解析且无其他日志混入。
- [x] 执行 F 的 migration.test.ts，确认新行为失败，再实现只读扫描、分类、CLI 输出和统一安装前预检。文本发现仅给建议，是否阻断依据旧安装冲突；不自动重写用户文件。
- [x] 编写中英文迁移表、检查/安装前后示例、受保护残留的人工处理、版本与语言冲突说明；示例明确原前端流程仍保留。执行目标测试和 `pnpm run check:content`。提交边界：`feat(frontend): 增加公共技能迁移检查与指南`。

## 任务 10：发布渠道闭合验证、文档与 CI

**文件：** 新建 C/.github/workflows/ci.yml、C/tests/content/npm-pack.test.ts；修改 F/.github/workflows/ci.yml、scripts/openclaw/{pack-openclaw,verify-openclaw-dist}.ts、tests/install/{npm-pack,tooling-contract,routing}.test.ts、package.json 的 Skill 脚本类型检查路径；更新 F/README*、CHANGELOG*、docs 各语言目录和 Runtime 指南、C/README.md 与 docs/consuming-common.md。

**接口：** 无新产品 API。发布验收脚本消费已定义内容锁、来源元数据、打包与安装函数，不新建第四套内容目录规则。

- [x] 新增打包回归测试：C tarball 带 exports/d.ts/中英文/全部资源；F npm CLI 解压后离开源码仍能安装；Claude Git 插件快照可发现七个 cc；OpenClaw 包含七个公共目录及命令适配；独立 cc 包动态读取样式/数据成功。
- [x] 执行目标测试定位遗漏，修正发布文件清单与路径，不让 npm prepack 静默修复受控快照。将类型检查入口从已迁出的旧图表路径改为新公共快照及仍保留视觉脚本。
- [x] CI 沿用 Node 22、pnpm 12.4.1 的 Windows/Linux 矩阵，增加 common 快照漂移校验；前端 CI 从发布的精确公共包重建比对。未发布时用临时消费项目/tarball 验证该过程并记录公开 registry 验证阻断，不提交本地镜像地址。
- [x] 同步全部现有文档入口的公共事实和示例，明确 3.0 首发 cc、只读迁移、共享卸载与原生双产品限制。搜索旧标识并将结果区分为迁移表/历史记录/保留前端流程/错误引用，修正最后一类。
- [x] 在 C 运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm pack --pack-destination <工作区内临时目录>`；在 F 运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm run check:common`、`pnpm run pack:all`、`pnpm run typecheck:openclaw`，新增失败才补跑针对性检查。
- [x] 审阅两仓库 diff，产出实施记录：实际文件、关键决定、通过命令、已有失败、未验证平台、公共依赖尚未公开发布的限制。任何未通过项必须保留为未完成或明确阻断，不能把设计通过当功能通过。提交边界：`test(release): 验证公共能力跨渠道交付`。

## 自审与执行交接

- 设计第 1–5 节：任务 1–4；内容边界及语言由任务 2、3 的清单锁定。
- 设计第 6 节：任务 1–5、10；摘要、生成副本、来源版本与独立包资源闭合均有测试。
- 设计第 7 节：任务 6–8；精确消费者、语言冲突、真实目录、事务与所有生命周期均有行为测试。
- 设计第 8 节：任务 9；命令只读、完整改名/拆分及旧安装保护均有覆盖。
- 设计第 9–10 节：任务 1 基线、任务 10 综合验证；无提交/发布、无 backend 实现，始终遵守范围。
- 接口顺序：任务 1 内容类型 → 任务 2 资源清单 → 任务 3 方法导出 → 任务 4 产品快照 → 任务 5 来源打包；任务 6 计划类型 → 任务 7 事务 → 任务 8 生命周期；任务 9 接迁移预检，任务 10 验证整体。
- 本计划的任务耦合于同一内容契约和生命周期，按顺序执行，不拆成并行独立工程。推荐主代理在当前会话逐任务实施，最后独立评审；若用户选择逐任务子代理方式，则使用对应执行技能。
- 公开 registry 尚无 common@1.0.0 时，不通过修改宿主全局 registry 解决，不声称从公开 registry frozen 安装已通过。源码、tarball 与临时消费验证可以继续；发布前 registry 复核是明确的交付限制。

计划已自审；执行方式及计划需用户确认后，才进入实现。
