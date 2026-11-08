# 消费 craft-common

统一底座正式版本号为 `@bovinphang/craft-common@2.0.0`，当前待发布，要求 Node >=22、ESM。保留 1.0.1 的事务恢复、Windows 等价路径和固定换行修复。两产品精确使用同一精确版本；公共内容在本仓库维护，产品只维护生成的分发副本。公共源码不依赖任何产品。

## 内容与分发

`readContentCatalog(packageRoot, language)` 显式接收包根，返回 `en` 或 `zh-CN` 的 21 个入口、完整文件哈希、来源版本和摘要；不要依赖 bundle 后的 import.meta.url 定位内容。

`readMethodResource(packageRoot, method, language)` 提供源码核验、文档同步、诊断、重构、TDD、工程实践六类通用方法字节。领域 Skill 将方法内嵌为本地 references，独立发布时不依赖相邻 Skill。修改 methods 后运行 `pnpm run sync:methods` 更新公共入口引用；评估样例独立维护。

frontend-craft / backend-craft 的 `pnpm run sync:common` 生成中英文公共快照、领域方法副本和来源锁；`pnpm run check:common` 只读比对。Git 原生插件也携带这些生成快照，不要求用户执行构建。禁止手工修改生成文件。公共独立包用 2.0.0，领域独立包跟随其产品版本。两个消费者需使用相同版本、语言及精确内容摘要；升级前先通过旧产品卸载退出旧公共引用并处理保留的用户修改。

检查覆盖完整公共文件集合；同步仅清理旧锁认领且哈希未变的过期文件。额外未知文件和手工修改会阻断同步并保留原文件。组合索引中的产品自有条目仍在产品维护，公共条目来自本包。

## 安装契约

`runProductLifecycle({ action, definition, context, codec, adapter, common? })` 是两产品统一入口。`definition` 声明产品身份和资源策略；`codec` 兼容本产品历史清单；`adapter.plan(context, session)` 用显式会话生成计划，不直接写磁盘。无标准 Skill 的宿主仍使用同一产品事务，提供 `common` 时再协调公共资源与消费者账本。

`resolveRuntimeTargets` 统一十五宿主的配置目录、实际 Skill 目标和允许根；显式 `compatibility` 保留历史环境变量解释差异。`createInstallSession` 支持读己之写、未知/修改文件保护、精确共享配置条目及部分卸载。会话没有全局草稿；结束后不能继续写入。

配置路径锁跨产品、跨 Skill 目标协调同一配置；恢复及重新读盘均在锁内完成。dry-run 运行真实规划但不创建锁、不恢复残留事务、不写文件。历史目录搬迁用 `seed` 规划复制，保留原所有权哈希；Cline 文件变目录也在事务中保留原文及备份。

`syncProductSnapshot({ productRoot, commonRoot, check, domainMethods, extraResources, retiredIds })` 统一构建快照同步。产品声明资源映射，common 预检完整双语资源、旧锁哈希、未知输出和混合索引；任何预检失败均不开始写入。

`resolveSharedIdentity(skillsDir)` 规范化真实目标及现存祖先路径，将状态放在父目录 `craft-manifests/<目标路径摘要>/` 中。配置目录不同但真实 Skill 目录相同时复用；同一父目录的不同目标互相隔离。

`planSharedDeployment(request)` 只读生成变更和冲突。消费者由产品名、真实产品清单路径和作用域标识。初版要求版本、语言和内容摘要精确一致，拒绝未知同名文件及用户修改。不要让产品清单再次认领 cc 文件。

`executeSharedPlan(request, { dryRun, productMutations, allowedProductRoots })` 在排他锁内重新规划，协调资源、公共账本与产品文件。产品先生成 `{ path, beforeHash, after }` 变更；公共与产品重复认领、哈希变化或越界均拒绝。部分卸载时使用 `retainConsumer: true` 保留依赖；完全卸载才释放引用。

`recoverSharedTransaction(skillsDir, allowedProductRoots?)` 在确认本地进程已退出时恢复。产品根边界必须由调用方提供，不信任日志自称的任意路径；上下文不匹配时安全拒绝。提交前回滚，提交后验证并清理记录，外部修改保留现场。

允许产品声明的根目录本身是 junction；根内部的符号链接仍拒绝。事务写入、日志及恢复使用规范化真实路径。协议保证本地主机并发和进程中断恢复，不保证断电级持久性或多主机共享文件系统协调。

公共包单元测试使用 frontend/backend 消费者夹具验证协议；backend-craft 现已接入公共事务，产品级共存证据见 backend-craft 的 `docs/verification/coexistence.md`，安装约定见其 `docs/coexistence.md`。原生插件双产品发现和去重需要 Runtime 专项验证，不能用 CLI 测试替代。

## 开发与发布边界

未公开发布时，通过 `pnpm exec npm pack` 产物和 `scripts/local-registry.ts` 临时本地服务联调；pnpm 12 使用临时项目级 scoped registry，不修改用户全局 registry，联调后移除该临时配置。已消费候选的tarball不可用不同字节覆盖；每次变化使用新的精确候选版本，保留旧归档，并以新真实归档重新安装、更新SRI。

先发布公共包，再发布依赖它的产品；发布属于独立操作。本次不实际发布。发布前必须将产品锁中的开发服务地址清理为标准来源，并在公共包真实可下载后重新做公开 registry 的 frozen 安装校验。不能把本地缓存成功当作公开可下载。

## 工程结构与维护入口

craft-common 2.0.0 是 TypeScript / ESM 公共库，不提供独立终端 CLI。运行要求 Node.js >=22，包管理器固定为 pnpm 12.4.1；构建使用 esbuild 和 TypeScript 声明生成，测试使用 Node.js `node:test`。

```text
craft-common/
├── src/
│   ├── index.ts              # 公共导出
│   ├── content/              # 内容目录、方法读取、递归资源与摘要
│   └── install/              # 共享身份、只读规划、事务、恢复及协议类型
├── skills/                   # 21 个 cc-* 公共入口与完整运行资源
├── methods/                  # 源码核验、文档同步、诊断、重构、TDD、工程实践方法源
├── localized/zh-CN/          # 公共入口与方法的中文镜像
├── scripts/                  # 构建、方法同步、测试、独立包、本地 registry
├── tests/                    # 内容、资源闭合、共享安装及中断恢复测试
├── docs/consuming-common.md  # 消费 API、共享协议及发布约定
└── .github/workflows/ci.yml  # Windows/Linux、Node 22 校验
```

既有七个方法与图表入口为 `cc-drawio-studio`、`cc-technical-diagrams`、`cc-source-driven-development`、`cc-doc-sync-core`、`cc-debug-methodology`、`cc-refactoring-core`、`cc-tdd-methodology`。`src/index.ts` 导出内容读取、资源收集、共享身份解析、规划、执行和恢复 API；调用者显式传入包根目录，不依赖打包后的源码位置猜测资源路径。

先维护 `methods/` 及对应中文内容，运行 `pnpm run sync:methods` 更新公共 Skill 内的方法副本。`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 用于开发校验。`pnpm run pack:skills` 生成 21 个双语独立 Skill 包，`pnpm exec npm pack` 构建并打包库；`dist/` 和打包输出不手工修改。

frontend-craft 3.0.0 和 backend-craft 1.0.0 均精确依赖 2.0.0。产品中的公共 Skill、领域方法副本和来源锁由各产品的 `pnpm run sync:common` 更新，再用 `pnpm run check:common` 比对。产品共同使用同一个真实 Skill 目标时，版本、语言与内容摘要必须一致。

发布顺序为公共包在前、消费者在后。源码版本、历史验收和本地缓存成功不证明公共 registry 已提供对应版本，发布前需单独验证公开源安装。仓库中的 `docs/implementation-report.md` 保留原阶段证据，不作为当前测试数量或发布状态的依据。

## 工程事实与任务推荐

`inspectWorkspace({workspace,taskPath?,maxDepth?,maxEntries?,detectors?})` 只读扫描，返回完整 `units`、语言、框架版本约束、角色、证据路径、明确工作区/应用关联和截断警告。默认深度 12、条目 10000、清单 256 KiB；忽略链接、敏感文件和依赖产物，不执行构建脚本。语言不推断服务角色；框架必须有实际依赖证据，版本不明保留警告。

`recommendCapabilities({inspection,catalog,task?:{path?,kind?}})` 只从已交付 catalog 推荐；最近子工程限定任务范围，IPC 仅扩展有同一桌面框架证据关联的 UI/core。条件同维度 OR、跨维度 AND；任务未提供时只返回工程级候选。旧 metadata 无 applicability 仍有效，但不自动猜适用范围。候选不是自动执行或自动安装指令。

当前新增入口、迁移、实际验证边界见 [跨领域能力验收](verification/cross-domain-capabilities.md)。

<!-- engineering-practices-20261108 -->

## 工程实践源与证据

工程实践为第六类方法，不增加独立Skill、用户CLI或规则引擎。methods/engineering-practices.md及.sources.json/.rules.json是八项原则和来源的唯一手工源；核心JSON只保存core规则，不持有其他入口锚点。每个增强入口另维护自身references/engineering-practices.md；产品通过现有domainMethods/extraResources从已安装的精确common包生成三份公共资源。

sync:methods现在预检双语、增量保留完整21入口、自定义字段和适用范围；检查模式不写入，重复同步应零变化。不要恢复旧七项整表重建，也不要手工修改产品副本。示例依赖与产品工具链隔离；普通检查/安装不自动准备示例环境。

本轮common八个真实案例、前端React DOM及后端HTTP各一例按各仓verify:engineering维护，输入hash、工具、具名计数和原始RED/GREEN日志分别记录。缺编译器、GUI/签名/外部DB等未执行边界不能被结构计数或模型回答覆盖。仓库docs/verification/engineering-practices保存本轮覆盖、模型与交付报告，未随公共库分发的维护报告不作为运行时依赖。

协调升级顺序保持：用旧产品CLI退出全部旧公共消费者并处理用户编辑；安装两个匹配版本的产品；再分别同步/检查。无Skill宿主继续交付私有参考，不产生公共消费者。公共2.0.0当前待发布，公开源frozen安装需发布后另验；本地临时registry/版本例外最终恢复原策略，保留真实SRI。

当前pnpm12.4.1的pack会排除嵌套pnpm-lock.yaml，即使files显式列出也无效；本轮最小夹具和实际归档已复现。因此公共发行归档使用现有npm打包器：先构建，再执行pnpm exec npm pack（产品pack:all也使用npm打包），保留样例独立锁。不得用缺锁的pnpm pack归档联调或发布；实际归档闭合检查是门禁，源码目录存在不能代替。包管理器与依赖安装仍保持pnpm12.4.1。

当前2.0.0变更见[变更日志](../CHANGELOG.zh-CN.md)，实际归档与授权后发布顺序见[发布步骤](releases/2.0.0.md)。frontend3.0.0和backend1.0.0仍未发布；本轮不提升其版本号。
