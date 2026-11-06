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

消费者测试使用 frontend/backend 夹具验证，不代表 backend-craft 产品已经实现。原生插件双产品发现和去重需要 Runtime 专项验证，不能用 CLI 测试替代。

## 开发与发布边界

未公开发布时，通过 `pnpm pack` 产物和 `scripts/local-registry.ts` 临时本地服务联调；只给当前 pnpm 进程指定临时 npmrc，不修改用户全局 registry。同一个开发版本的 tarball 变化后重新安装并更新真实完整性摘要。

先发布公共包，再发布依赖它的产品；发布属于独立操作。本次不实际发布。发布前必须将产品锁中的开发服务地址清理为标准来源，并在公共包真实可下载后重新做公开 registry 的 frozen 安装校验。不能把本地缓存成功当作公开可下载。
