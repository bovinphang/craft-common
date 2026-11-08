# 消费 craft-common

公共包当前修复版为 `@bovinphang/craft-common@1.0.1`（首版 1.0.0），要求 Node >=22、ESM。1.0.1 修复较大事务日志恢复的正则栈溢出及 Windows 等价大小写路径的遍历挂起，并固定分发文本换行。消费者精确固定版本，公共内容在本仓库维护，产品只维护自动生成的分发副本。公共源码不依赖 frontend-craft。

## 内容与分发

`readContentCatalog(packageRoot, language)` 显式接收包根，返回 `en` 或 `zh-CN` 的七个入口、完整文件哈希、来源版本和摘要；不要依赖 bundle 后的 import.meta.url 定位内容。

`readMethodResource(packageRoot, method, language)` 提供源码核验、文档同步、诊断、重构、TDD 的通用方法字节。领域 Skill 将方法内嵌为本地 references，独立发布时不依赖相邻 Skill。修改 methods 后运行 `pnpm run sync:methods` 更新公共入口引用；评估样例独立维护。

frontend-craft / backend-craft 的 `pnpm run sync:common` 生成中英文公共快照、领域方法副本和来源锁；`pnpm run check:common` 只读比对。Git 原生插件也携带这些生成快照，不要求用户执行构建。禁止手工修改生成文件。公共独立包用 1.0.1，领域独立包跟随其产品版本。两个消费者需使用相同版本、语言及精确内容摘要；升级前先通过旧产品卸载退出旧公共引用并处理保留的用户修改。

检查覆盖完整公共文件集合；同步仅清理旧锁认领且哈希未变的过期文件。额外未知文件和手工修改会阻断同步并保留原文件。组合索引中的产品自有条目仍在产品维护，公共条目来自本包。

## 安装契约

`resolveSharedIdentity(skillsDir)` 规范化真实目标及现存祖先路径，将状态放在父目录 `craft-manifests/<目标路径摘要>/` 中。配置目录不同但真实 Skill 目录相同时复用；同一父目录的不同目标互相隔离。

`planSharedDeployment(request)` 只读生成变更和冲突。消费者由产品名、真实产品清单路径和作用域标识。初版要求版本、语言和内容摘要精确一致，拒绝未知同名文件及用户修改。不要让产品清单再次认领 cc 文件。

`executeSharedPlan(request, { dryRun, productMutations, allowedProductRoots })` 在排他锁内重新规划，协调资源、公共账本与产品文件。产品先生成 `{ path, beforeHash, after }` 变更；公共与产品重复认领、哈希变化或越界均拒绝。部分卸载时使用 `retainConsumer: true` 保留依赖；完全卸载才释放引用。

`recoverSharedTransaction(skillsDir, allowedProductRoots?)` 在确认本地进程已退出时恢复。产品根边界必须由调用方提供，不信任日志自称的任意路径；上下文不匹配时安全拒绝。提交前回滚，提交后验证并清理记录，外部修改保留现场。

允许产品声明的根目录本身是 junction；根内部的符号链接仍拒绝。事务写入、日志及恢复使用规范化真实路径。协议保证本地主机并发和进程中断恢复，不保证断电级持久性或多主机共享文件系统协调。

公共包单元测试使用 frontend/backend 消费者夹具验证协议；backend-craft 现已接入公共事务，产品级共存证据见 backend-craft 的 `docs/verification/coexistence.md`，安装约定见其 `docs/coexistence.md`。原生插件双产品发现和去重需要 Runtime 专项验证，不能用 CLI 测试替代。

## 开发与发布边界

未公开发布时，通过 `pnpm pack` 产物和 `scripts/local-registry.ts` 临时本地服务联调；只给当前 pnpm 进程指定临时 npmrc，不修改用户全局 registry。同一个开发版本的 tarball 变化后重新安装并更新真实完整性摘要。

先发布公共包，再发布依赖它的产品；发布属于独立操作。本次不实际发布。发布前必须将产品锁中的开发服务地址清理为标准来源，并在公共包真实可下载后重新做公开 registry 的 frozen 安装校验。不能把本地缓存成功当作公开可下载。

## 工程结构与维护入口

craft-common 1.0.1 是 TypeScript / ESM 公共库，不提供独立终端 CLI。运行要求 Node.js >=22，包管理器固定为 pnpm 12.4.1；构建使用 esbuild 和 TypeScript 声明生成，测试使用 Node.js `node:test`。

```text
craft-common/
├── src/
│   ├── index.ts              # 公共导出
│   ├── content/              # 内容目录、方法读取、递归资源与摘要
│   └── install/              # 共享身份、只读规划、事务、恢复及协议类型
├── skills/                   # 七个 cc-* 公共入口与完整运行资源
├── methods/                  # 源码核验、文档同步、诊断、重构、TDD 方法源
├── localized/zh-CN/          # 公共入口与方法的中文镜像
├── scripts/                  # 构建、方法同步、测试、独立包、本地 registry
├── tests/                    # 内容、资源闭合、共享安装及中断恢复测试
├── docs/consuming-common.md  # 消费 API、共享协议及发布约定
└── .github/workflows/ci.yml  # Windows/Linux、Node 22 校验
```

七个入口为 `cc-drawio-studio`、`cc-technical-diagrams`、`cc-source-driven-development`、`cc-doc-sync-core`、`cc-debug-methodology`、`cc-refactoring-core`、`cc-tdd-methodology`。`src/index.ts` 导出内容读取、资源收集、共享身份解析、规划、执行和恢复 API；调用者显式传入包根目录，不依赖打包后的源码位置猜测资源路径。

先维护 `methods/` 及对应中文内容，运行 `pnpm run sync:methods` 更新公共 Skill 内的方法副本。`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 用于开发校验。`pnpm run pack:skills` 生成七个独立 Skill 包，`pnpm pack` 构建并打包库；`dist/` 和打包输出不手工修改。

frontend-craft 3.0.0 和 backend-craft 1.0.0 均精确依赖 1.0.1。产品中的公共 Skill、领域方法副本和来源锁由各产品的 `pnpm run sync:common` 更新，再用 `pnpm run check:common` 比对。产品共同使用同一个真实 Skill 目标时，版本、语言与内容摘要必须一致。

发布顺序为公共包在前、消费者在后。源码版本、历史验收和本地缓存成功不证明公共 registry 已提供对应版本，发布前需单独验证公开源安装。仓库中的 `docs/implementation-report.md` 保留原阶段证据，不作为当前测试数量或发布状态的依据。
