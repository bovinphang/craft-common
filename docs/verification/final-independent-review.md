# 最终候选独立评审（2026-11-08）

本轮结论：**当前被审阅候选尚不可交付，需先修复 5 项 Important 并重新完成最终门禁。** 无已确认 Critical，无另列 Minor。主代理已接受以下五项；本报告记录修复前的独立发现，不把尚未执行的修复或验证记为通过。

## 范围与方法

唯一独立评审轮次；未派生审阅代理。依据已批准的 product-installation-foundation design、engine/capabilities plans、progress ledger 及 cross-domain-capabilities 验证记录，审查三个独立仓库的 `git diff HEAD` 和 `git ls-files --others --exclude-standard`，包括新增 src、测试、双语 Skills、示例、来源清单与分发脚本。没有修改业务代码、索引、HEAD 或分支；本报告是审阅者唯一写入的仓库文件。小型复现只写入系统临时目录，没有重新构建共享工作目录 dist。

| 仓库 | 审阅基线 |
| --- | --- |
| craft-common | `3a7625bb47db450c310b26a6a25050715bfe6195` |
| frontend-craft | `036f2b2a904469917a2e55cede8d21366e5f3263` |
| backend-craft | `e1720b2ce16ead22776a93ef750914811e71cc09` |

检查重点涵盖公共会话、路径与所有权、配置条目、锁与恢复、产品委托、旧入口退役、只读发现和推荐、CLI 兼容、内容来源与独立资源闭合。生成的公共副本通过逐文件摘要核对，未把三个仓库相同字节当作三份不同实现重复评审。下面行号对应本轮修复前候选。

## Critical

无已确认问题。

## Important

### I1：后端 inspect 破坏原有文件路径与任务路径语义

- 位置：`backend-craft/src/cli/inspect.ts:28-30`；CLI 调用方为 `backend-craft/src/cli.ts` 的 project inspect 分支。
- 触发：原有合法命令 `bec project inspect src/lib.rs --json`，仓库根有 Cargo.toml。旧 `inspect(cwd, target)` 把 positional 当任务位置，在 cwd 内定位最近项目；新的 `inspectCapabilities` 直接把 positional 当目录 workspace。
- 实测：临时 Cargo 工程中，旧 API `inspect(root, 'src/lib.rs').projects.length` 为 1；新 API 对相同参数抛出“工作区必须是目录”。传入没有自身清单的子目录也会改变旧有最近项目选择语义。
- 影响：既有 CLI 调用和以源码文件为目标的自动化失败，违反旧 inspect/projects 兼容要求；新增参数不能静默重新定义原位置参数。
- 建议：复用并显式区分旧 positional 任务语义与新增 workspace/task-path 解析，让 recommendations 使用同一规范化任务路径。测试至少覆盖已有文件、未建文件、项目内子目录、工作区外目录/文件，以及新 task-path 与 task-kind 组合。
- 验收：旧受支持调用的 projects 根和退出码保持一致，新 units/recommendations 仍只作用于所属最近项目。

### I2：无原生 Skill 宿主丢失迁入 common 的语言参考能力

- 位置：`backend-craft/src/install/adapters/shared.ts:45-53`、`:140-141`。
- 触发：Cline、Trae、Copilot 等无原生 Skill 目标的安装；此路径不运行公共 Skill 部署，而 `reference-skills` 复制和指南均过滤为 `bec-`。
- 实测：在临时 Cline local 根实际调用 installRuntime，reference-skills 仅 21 个后端领域/框架入口；`cc-rust-project-standard/SKILL.md` 和旧 `bec-rust-project-standard/SKILL.md` 均不存在，生成指南也无新语言入口。
- 影响：迁移前可用的六语言规范、并发和内存参考资料被退役后没有替代；提示用户“选择最近工程语言规范”却没有交付对应资料。CLI/catalog 的 42 项计数不能证明这些宿主的实际安装资源闭合。
- 建议：对无 Skill 宿主，以明确的产品私有参考资料目录交付所需完整 common 内容并生成可达链接，继续明确其不是原生 Skill；不绕开 common 命名空间所有权保护、不新增第二套公共账本。
- 验收：三类宿主 local/global、双语安装后参考链接和资源闭合；旧入口迁移、更新、保留用户修改、卸载同样有效。

### I3：前端旧入口检查在锁外过期，锁内未重新检查整棵目录

- 位置：`frontend-craft/src/install/shared/common-install.ts:68-75`、`:91-93`。
- 触发：inspectLegacyCommonInstall 在配置锁和事务恢复前运行一次，随后 adapter.plan 只对已收集文件逐个 retireTree；旧目录在异步恢复等待期间新增未知文件或被修改。
- 实测：临时 Claude 安装包含合法历史清单及旧 `fec-typescript-project-standard/SKILL.md`。调用 runCommonAwareInstall 后，在 queueMicrotask 中往旧目录添加 user.md，利用 lifecycle 的 await 恢复边界使新增发生于预检之后、实际规划之前。实际结果为 `INSTALL_SUCCEEDED oldExists=false extraExists=true newExists=true`：旧入口已删除、新 cc 入口已部署，未知文件留在原目录，却没有按要求阻断整次迁移。
- 影响：预检已知的目录状态不能代表锁内状态；迁移应遇到未知/修改内容时整体拒绝，而当前可能产生半迁移的旧目录和新部署。
- 建议：保留锁外快速预检，并在 adapter.plan 的锁内重新执行同等严格的完整检查，保留 relocation seed/pending 的支持；只在再次无冲突后退役。不要仅检查预检时枚举出的文件。
- 验收：在预检与锁内规划之间注入新增文件及已知文件修改，均拒绝整个部署并保留原状态。无需把这一要求扩大为抵御任意非合作进程在最终检查后的所有文件系统竞争。

### I4：前端只读 global 迁移检查信任清单根，扩大了读取范围

- 位置：`frontend-craft/src/install/migration.ts:120-129`；辅助解析为 `frontend-craft/src/install/manifest-installs.ts` 的 resolveManifestFile。
- 触发：global manifest 声明 `root: 'cwd'` 或不属于当前 Runtime 允许根的 home 路径。检查器直接用 resolveManifestFile 拼接并扫描，没有执行 MANIFEST_CODEC + ProductContext allowedRoots 校验，也没有校验文件祖先链接。
- 实测：设置临时 CLAUDE_CONFIG_DIR，放入结构合法的 global manifest，files 为 `{ root: 'cwd', path: 'notes.md', hash: '0'.repeat(64) }`；cwd 是全局安装根外的另一个临时目录。checkMigration 读取根外 notes.md 并报告旧 Skill 引用，`errors=[]`、`exitCode=1`。同一清单通过正常 MANIFEST_CODEC.decode(toProductContext(global)) 会正确拒绝 `Product path exceeds its allowed boundary`。
- 影响：只读检查与安装器使用不同信任边界，伪造清单可使工具读取未授权根中的普通文本；沿文件路径中的 junction 也可绕过仅检查终端节点的 scan。报告不回显整行降低了泄露内容，但没有满足不扩大读取范围的要求。
- 建议：先按实际 runtime/scope 构建同一 ProductContext，验证完整清单身份、所有 owned references 和 shared paths，再扫描已验证规范路径；无效路径返回 2，禁止先读后报错。根内链接拒绝应复用 common 的祖先检查。
- 验收：global 的 cwd/home 越界、伪造 runtime/scope、祖先 junction 均不读取目标字节并返回 2；正常 Codex 独立 skills 根和允许的声明根别名继续有效。

### I5：前端旧入口根的悬空链接被当作不存在

- 位置：`frontend-craft/src/install/migration.ts:204`。
- 触发：旧 fec Skill 根是指向不存在目标的 junction/symlink。existsSync 跟随链接返回 false，walk 的 lstat 链接拒绝逻辑完全未执行。
- 实测：Windows 临时目录中创建旧 `fec-typescript-project-standard` junction，目标目录不存在。`lstatSync(...).isSymbolicLink()` 为 true，`existsSync(...)` 为 false，而 inspectLegacyCommonInstall 返回 `{ findings: [], retiredFiles: [] }`。
- 影响：明确应阻断的旧根链接被跳过，check-migration 可声称无冲突，安装也可继续新公共部署；当前 live-link 测试不能覆盖此情况。
- 建议：以 lstat 检查根，只把真正 ENOENT 当不存在；检测到链接立即生成 conflict。与后端已采用的根 lstat 方式保持相同保护。
- 验收：悬空目录链接、悬空文件链接和有效链接均返回 conflict/退出码 2，实际安装不得创建新公共内容；普通不存在目录仍允许安装。

## Minor

无另外列出的可操作 Minor；未将排版、函数长度或重复文案上升为交付问题。

## 独立取得的正向证据

- 直接运行 common `node --import tsx --test`，范围为全部 `tests/install/product-*.test.ts` 和 `tests/project/*.test.ts`：**50/50 PASS，0 FAIL，0 SKIP**。包含真实进程中断后恢复、活锁阻断、配置锁释放、目录转换回滚、部分卸载、未知文件保护、junction、Windows 大小写、事实解析与任务隔离；没有重建 dist。
- 迁移来源清单的 50 个原始文件分别用 `git show <sourceCommit>:<originalPath>` 取原始字节计算 SHA256，全部匹配。十二个入口的来源保留可追溯证据。
- 英文与中文实际目录分别为 common **21**、frontend **74 = 53 + 21**、backend **42 = 21 + 21**。两产品 common-content.lock 所有文件逐一重算摘要，**0 漂移**。
- 前后端安装、事务、路径解析和快照同步主调用链已经委托 common；产品保留声明、历史清单 codec、转换和领域 detector。旧 API 导出与产品诊断兼容包装仍在。
- common 事实读取限定清单文件、大小和遍历预算，不读取源码内容推断框架；依赖键、CMake/Gradle 注释与字符串反例、工作区成员、最近任务根及桌面 IPC 关联均有实现和通过的测试证据。未发现普通 Rust 库、Python CLI 仅凭语言就被新识别器认作服务的情况。
- 检查了七框架本地示例、故障开关、独立包 whitelist 和双语资源组织；桌面 core/handler 证据与 GUI/权限激活边界明确分开。服务验证器区分依赖准备失败与真实业务断言失败，Drogon 合成 role 头明确不作为鉴权方案。
- 两产品本轮 `git diff --check HEAD` 未报告空白错误。

## 关键覆盖空白与交付条件

1. 现有测试未覆盖 I1–I5；上述反例必须作为回归用例随修复保留。尤其共存矩阵通过不等于无 Skill 宿主迁移后内容仍完整，资源数量断言需要核查实际安装路径。
2. 本轮看到的配置锁和 crash 测试证明活锁互斥、单个中断进程的后续恢复。未看到两个独立恢复者同时竞争同一 stale/reclaim lease 的确定性测试；设计要求验证竞争场景，建议补充此自动化证据。未据此推断当前锁算法已有数据损坏缺陷。
3. 全分发门禁由主代理执行，本轮五项问题确认后旧源 pack 任务将停止，需从修复后的稳定源重新运行，而不能引用修复前 PASS 作为最终候选证据。
4. 临时 registry、候选精确 SRI、自动 supply-age 例外的最终清理属于交付门禁；主代理已说明正在为未发布候选临时恢复本地 registry，本轮不将该过程状态误报为最终残留。

## Declined to judge

- **最终修复后是否全部通过**：本报告在统一修复前完成，唯一独立评审轮次不把未来代码和重跑结果算入已验证结论。主代理应在最终验收记录列出修复及直接回归证据。
- **公开 registry frozen install / 公开发布可用性**：common `2.0.0-dev.20261108` 未发布，本地 tarball 和缓存不能证明公开源可安装；应由真实发布后的验证判断，本任务不授权发布。
- **七框架全部运行环境和平台发布质量**：本轮审查了源码、用例和已记录证据，未重跑四个 Docker 框架环境或桌面 GUI；Tauri GUI 构建与实际权限激活、Electron sandbox 激活、原生签名/包、外部数据库、部署与负载均不在本轮已验证结论中。
- **LLM 自然触发/压力场景实际表现**：静态正反查询、applicability 和结构测试不等于新模型代理的行为评测；现有记录正确保留这一边界。
- **断电持久性、多主机锁及恶意非合作进程任意时刻更换路径**：方案明确没有这些保证，本轮不以单机进程中断和合作锁测试推导这些能力。

本轮审阅完成。修复 I1–I5、补齐相应回归并完成稳定源门禁之前，不建议把当前候选作为已完成交付；没有执行提交、推送或发布。
