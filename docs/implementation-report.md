# frontend-craft 3.0 公共能力抽取交付报告

本报告记录开发验收时点。验收后用户已授权将两个仓库分别提交、合并到 main 并推送远程；下文“不提交”的记录及裁定描述原开发阶段边界，Git 集成按后续授权执行。npm 发布仍是独立步骤。

## 后续状态

本报告下文保留最初抽取阶段的版本与验证结果。当前源码版本已为 1.0.1，frontend-craft 3.0.0 与 backend-craft 1.0.0 均精确依赖该版本；后端已实现产品级公共事务接入。当前消费契约以[消费指南](consuming-common.md)及各产品代码、锁文件为准。历史测试数量和 registry 查询仅对应原验收时点。

## 交付范围

本次依据 `docs/backend-craft项目.md`、`docs/Craft-AI-Coding生态建设.md` 及已批准设计实施。frontend-craft 直接按未发布的 3.0.0 开发，公共包首版为 `@bovinphang/craft-common@1.0.0`，产品精确依赖 1.0.0。backend-craft 未修改。

公共源位于 craft-common；frontend-craft 携带由固定公共包生成的中英文分发快照，用户不需要手动安装第三个插件。保留 54 个前端领域 Skill，加入 7 个公共 Skill，共 61 个。

| 公共入口 | 能力及原前端职责 |
| --- | --- |
| cc-drawio-studio | 整体迁入原 draw.io 能力，包含脚本、data、styles 和第三方声明 |
| cc-technical-diagrams | 从图片能力中抽取技术图、交互预览、导出及 PNG QA；前端保留 UI/产品/品牌视觉生成 |
| cc-source-driven-development | 跨栈源码与权威资料核验；保留前端领域规则 |
| cc-doc-sync-core | 通用文档事实同步；fec-doc-sync 保留前端流程 |
| cc-debug-methodology | 通用诊断方法；fec-debug-framework 保留前端采集与排查 |
| cc-refactoring-core | 通用行为保持重构；前端重构子系统保留 |
| cc-tdd-methodology | 通用红绿重构；fec-tdd-workflow 保留前端测试选型 |

旧公共 Skill 不保留别名。公共独立包版本来自 common，领域包版本来自 frontend；两者均完整携带运行资源及本地方法引用。

## 关键文件与行为

- craft-common 的 `src/content/` 负责显式根目录、递归资源闭合、来源版本及稳定内容摘要；`methods/` 是可内嵌方法的权威源。
- craft-common 的 `src/install/` 按真实 Skill 目标管理独立账本、精确兼容、消费者引用、事务回滚和恢复。最后消费者退出才回收未修改文件，用户修改和残留所有权保留。
- frontend-craft 的 `scripts/sync-common.ts`、`common-content.lock.json` 负责快照生成及完整集合检查。多余文件、未知来源和手工修改会阻断；仅删除旧锁认领且未修改的过期资源。
- frontend-craft 的 `src/install/shared/common-install.ts`、`product-write-plan.ts` 将产品文件与公共变更纳入同一事务，dry-run 不写目录；迁入旧全局目录也先按暂存视图预检。同清单路径不能切换 Runtime、scope 或公共目标。
- `src/install/migration.ts` 提供只读迁移报告，旧入口只有清单归属和逐文件哈希均一致才随安装退役。检查仅输出位置、标识和建议，不回显完整匹配行。

迁移检查：

```sh
fec runtime check-migration codex --local --json
```

退出码 0 表示无待处理项，1 表示有旧引用或旧安装，2 表示参数或读取错误。省略 Runtime 可检查全部已支持 Runtime。详见 frontend-craft 的 `docs/zh-CN/common-migration.md`。

## 独立评审处置

最终独立评审无 Critical，发现 5 项 Important 和 1 项 Minor。技术图表指南错误路由影响用户迁移结果，因此上调 Important，合计 6 项进入一次修复轮。代码问题均以真实失败测试先复现，再修复并验证；文档路由以定向检查和既有内容质量检查验证。

| 问题 | 处置与回归证据 |
| --- | --- |
| 旧入口退役后留下空目录，第二次安装被阻断 | 无异常节点的空目录视为已退役；二次安装测试 RED→GREEN |
| 旧全局目录迁入绕过旧入口检查 | 暂存文件参与检查；未修改旧文件退役，修改文件在安装和 dry-run 中均阻断，RED→GREEN |
| 同一清单切换 scope/runtime 遗留消费者 | 写入前拒绝身份变化，原身份卸载清理完整，RED→GREEN |
| 合法 junction 根被错误拒绝 | 产品路径统一规范化后执行；根 junction 成功、内部链接仍拒绝，RED→GREEN |
| 快照检查遗漏额外文件和上游删除残留 | 完整枚举、保护修改、按旧锁安全清理，RED→GREEN |
| 技术图表示例仍调用前端图片入口 | 中英文 README、OpenClaw README、项目结构及图表示例改用 cc-technical-diagrams |

评审未判断事项均在下方裁定和边界中明确处理，没有将未验证内容当作通过。没有再派复审。

## 验证记录

本地验证环境为 Windows、Node 24.14.0、pnpm 12.4.1。以下命令均已实际执行并读取结果：

| 仓库 | 验证 | 结果 |
| --- | --- | --- |
| craft-common | pnpm lint / pnpm typecheck | 退出 0 |
| craft-common | pnpm test | 75/75，通过 |
| craft-common | pnpm pack、pnpm run pack:skills | 构建、声明及公共独立包通过 |
| frontend-craft | pnpm lint、pnpm typecheck:openclaw | 退出 0 |
| frontend-craft | pnpm pack:all | 退出 0；内含 TS/脚本类型检查、315/315 测试、OpenClaw 构建/原生包、61 个独立包检查 |
| frontend-craft | 临时来源下安装真实 common tarball | 安装通过，junction 完整安装回归通过 |
| frontend-craft | 标准目标 URL 的锁重解析及 offline frozen 安装 | 退出 0；不代表公开 registry 已发布 |

覆盖包含：中英文目录、完整资源及动态 data/styles、源码不可用时包内资源读取、两消费者兼容/冲突、部分卸载、修改保护、真实子进程中断恢复、本地并发锁、路径越界、迁移预检、dry-run 零写入和快照删除残留。

逐次 RED/GREEN 和原始输出保存在本地忽略目录 `.superpowers/sdd/2026-11-05-common-capabilities-extraction/`，执行账本为其中 `progress.md`。未产生提交，因此保留本地验证记录。

## 发布与适用边界

- 未执行 commit、merge、push 或 npm publish；两个仓库保留 `refactor/common-capabilities` 分支中的工作区变更。
- 公共包尚未公开发布，公开 registry 实测返回 404。本地临时 registry、真实 tarball 和离线 frozen 安装只证明本地交付链；先发布 common，再发布 frontend，随后补验公开 registry 的 frozen 安装。
- Node >=22 是声明及 CI 目标；本地实际为 Windows、Node 24.14.0，未声称已经在 Node 22 或 Linux 执行。
- CLI 使用 frontend/backend 消费者夹具验证共享生命周期；backend-craft 产品尚未接入。
- Claude/OpenClaw 原生渠道验收单产品完整资源；不承诺双原生产品同时启用时去重。
- Copilot/Trae/Cline 沿用已有非标准 Skill 路径，未新增公共 Skill 支持或产品整体事务保证。
- 事务保证本地主机并发和进程中断恢复，不保证操作系统断电级持久性或多主机共享文件系统协调。

## 执行裁定及代价

- 沿用用户当前两个 checkout，仅建立功能分支，不创建新 worktree — 上级指令要求优先复用当前 checkout，用户未要求新 worktree；代价是变更直接显示在这两个 checkout，均可通过 diff 审阅。
- 不调用会自动 commit 的技能脚本；以本文件逐任务记录同等证据 — 项目规则禁止未经确认提交；代价是最终评审使用工作区差异而非提交范围。
- 本期提取的是已有方法的公共引用版本，不新增治理纪律；应用测试记录实际限制，不为了制造 RED 虚构代理违规。自动测试 RED 证明的是新目录/导出/完整发现契约缺失，领域适用性另作应用验收 — 与已批准的保留行为目标一致；代价是没有可量化的原方法违规率。
- 任务 4 的全套校验依赖任务 5 修复原有“全部元数据跟产品版本”假设，因此两项联动后统一跑全套，不把中间红灯称为完成 — 代码迁出与元数据契约不可分割；代价是一个较大的审阅批次。
- craft-manifests 中按实际目标路径摘要设子目录 — 同一父目录下 skills 与 other-skills 必须有不同账本；仍处于设计规定的父目录 craft-manifests 内；代价是账本路径更长，但由产品依赖指针定位。
- recoverSharedTransaction 增加可选 allowedProductRoots 参数 — 恢复不能信任日志自称可写的任意产品绝对路径，恢复产品文件须由当前调用方明确提供根边界；代价是跨产品恢复可能安全拒绝并要求用原安装上下文重跑。
- SharedRequest 增加 retainConsumer 可选字段 — 前端部分卸载保留修改文件及产品清单时仍需保留公共依赖，不能过早回收；代价是卸载调用方须根据实际 skipped 结果声明保留。本路径已先 RED 后 GREEN 验证。
- 无标准 Skill 的 Cline/Copilot/Trae 延用已有产品安装行为，不引入公共文件事务；Cline 的旧文件转目录操作因无公共资源不会导致半次公共安装 — 限制改动范围并遵守现有能力矩阵；代价是这些 Runtime 的原产品专属安装仍非事务化。
- 将技术图表指南错误路由从 Minor 上调 Important 并修正 — 用户照当前指南会调用已移出技术图能力的前端入口，影响本次迁移可用性；代价是多修改中英文示例和入口文档。
- 组合 metadata/relations/eval_queries 索引允许维护产品自有条目，纯公共快照和方法副本禁止覆盖修改 — 产品索引既是输入又是生成结果，整文件旧 hash 不能阻断正常领域维护；代价是索引前端部分的语义仍由内容质量检查负责。
- Claude/OpenClaw 双原生产品去重继续排除 — 本期交付单产品完整快照，CLI 双消费者测试不替代 Runtime 验证；代价是双原生同时启用不能宣称无重复。
- 无标准 Skill Runtime 继续沿用原安装行为 — 不伪造公共 Skill 支持；代价是这些 Runtime 的原产品专属安装仍非整体事务化。
- 公开 registry frozen 安装保留为发布前置 — common 尚未发布且实际查询返回 404，本地 tarball/cache 验证不等于公开可用；代价是正式发布前必须按顺序发布并补验。
- 事务保证限定为本地主机并发和进程中断恢复 — 不宣称断电级持久性或跨主机共享文件系统锁；代价是这两类故障未受当前协议保证。
- 不自动提交、合并、推送、发布，也不删除未提交的唯一验证账本 — 已批准计划明确这些操作不在本次范围，直接保留功能分支；代价是后续需用户处理版本集成。

## 延后 Minor

无。原唯一 Minor 因实际迁移影响上调并已修复。
