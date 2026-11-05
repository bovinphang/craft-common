# frontend-craft 3.0 公共能力抽取设计

日期：2026-11-05
状态：用户已于 2026-11-05 批准，进入实施计划阶段；本文件不代表功能已经实现。

## 1. 意图与已确认决定

将 frontend-craft 中稳定、跨技术栈的公共能力提取到独立仓库 craft-common，供 frontend-craft 和未来的 backend-craft 消费，减少重复维护，又保留前端专业流程的深度。

用户已确认：frontend-craft 3.x 尚未发布，本次直接按 frontend-craft 3.0 开发，公共能力统一使用 `cc-*`，提供迁移检查和指南。不采用 3.x 保留旧名称、4.0 再改名的兼容窗口。

参考材料：上级目录 `docs/backend-craft项目.md`、`docs/Craft-AI-Coding生态建设.md`。其中关于 3.0 已发布及应保留旧名称的假设，由上述用户决定覆盖。

面向用户仍是前端、后端两个产品；craft-common 是自动随产品交付的 npm 能力包，不要求额外手动安装公共插件。

## 2. 当前事实与约束

- 三个子目录是独立 Git 仓库，上级目录不是 Git 仓库；craft-common、backend-craft 当前只有 LICENSE。
- frontend-craft 的 package.json 版本为 3.0.0，使用 TypeScript、pnpm、Node >=22、esbuild，现有测试通过 `tsx` 和 `node:test` 执行。不得因为通用 AGENTS 示例提到 Vite、Vitest 就替换现有工具链。
- 当前有 56 个 Skill 目录、14 个 Agent 文件；正文默认英文，`localized/zh-CN` 提供中文内容，另有多语言文档。
- 安装器支持 registry 中声明的 15 个 Runtime，但各 Runtime 的 skills、rules、commands 等能力不同。Copilot、Trae、Cline 当前不直接安装标准 Skill，不新增其未经验证的 Skill 支持。
- 当前 `InstallContext` 只有一个 contentRoot；多数适配器复制该目录下 skills。Codex 实际写入 `.agents/skills`，不等于其配置 baseDir；OpenClaw 本地安装亦可能跨 baseDir 写入项目 skills。
- `src/install/shared/fs.ts` 使用单个模块级清单会话和固定 `frontend-craft.manifest.json`；更新以哈希保护用户修改，卸载根据文件所有权执行。共享管理不能让同一 cc 文件同时归两个产品独占所有。
- 发布渠道包括 npm CLI、原生 Claude 插件、OpenClaw 包、独立 Skill 包。独立 Skill 必须资源闭合，不依赖相邻 Skill 或仓库目录。
- 项目 Git 规则要求未经用户确认不直接 commit。本阶段只写设计文件，不提交、不发布、不创建实施脚手架。

## 3. 目标、非目标与失败判据

### 目标

1. craft-common 成为本期抽取的公共内容及必要共享安装协议的唯一维护来源。
2. frontend-craft 3.0 交付前端专属与公共能力，公共入口仅使用 cc 前缀。
3. CLI 安装场景对同一个真实 Skill 目标目录只部署一份公共内容，消费者可独立安装、升级和卸载。
4. 保留中英文内容、图表功能及附属资源，确保所有现有发布渠道单产品交付完整。
5. 检测旧名称引用与旧安装残留，给出可审阅的迁移报告；不静默删除用户修改、不假装存在通用 Runtime 名称别名机制。

### 非目标

- 本期不建设 backend-craft 的业务 Skills、CLI 或 fullstack-craft；用消费者测试夹具验证未来接入契约。
- 不整体搬迁现有 Runtime 适配器、Hooks、CLI 自更新器、全部 Agents、规则或工具链。
- 不新建文档示例中尚无成熟实现的 cc-api-contract、cc-architecture-documentation 或公共 Agent。
- 不批量迁移 alchemy、全部重构目录、测试策略、依赖升级等额外候选能力；可记录后续候选，首期按第 5 节清单交付。
- 不以本期 CLI 去重测试声称各 Runtime 原生插件管理器的双产品发现与去重已受支持。原生渠道本期保证单产品内容完整；未来双原生插件接入须单独验证 Runtime 支持并制定交付方案。

### 失败判据

公共源码仍需跨仓库手工同步；仅移动 SKILL.md 造成脚本、样式或引用丢失；公共 Skill 包含前端限定作为通用结论；安装顺序决定公共内容版本；卸载一个消费者删除另一个消费者的公共文件；静默覆盖用户修改；保留两个竞争的旧、新公共 Skill；收窄现有平台支持却未报告。

## 4. 方案比较与选择

| 方案 | 优点 | 成本及结论 |
| --- | --- | --- |
| 3.x 保留旧 fec 公共名称，4.0 切 cc | 已发布用户无须立即迁移 | 用户确认 3.x 未发布，明确不选 |
| frontend-craft 3.0 直接交付 cc 公共入口，提供迁移检查和指南 | 在首次 3.0 发布前确立边界，不积累别名债务 | 需处理本地历史安装和引用；用户已选择 |
| 同时长期注册 fec 与 cc 公共 Skill | 表面兼容旧调用 | 重复发现、重复触发、所有权不清，与生态文档目标冲突，排除 |

实现层采用公共 npm 包加可复现内容组合。相对 Git 子模块或运行时依赖相邻仓库，它能支持独立发布、离线使用已安装产品及现有打包流程。精确版本固定与生成副本校验是本设计建议，不是用户此前已决定的细节。

## 5. 首期能力边界

| 来源 | craft-common 新入口 | frontend-craft 处理 |
| --- | --- | --- |
| fec-drawio-studio | cc-drawio-studio | 整体迁出旧公共入口，完整迁移 scripts/references/data/styles 与许可证信息 |
| fec-image-generation 的结构化技术图表部分 | cc-technical-diagrams | 保留 fec-image-generation，聚焦视觉资产生成与编辑；技术图表渲染、布局、导出、PNG 检查脚本及对应示例迁入 common |
| fec-source-driven-development 的通用方法 | cc-source-driven-development | 旧 Skill 公共入口替换为 cc；前端版本敏感检查点保留在前端规则/领域引用中 |
| fec-doc-sync 的证据、事实同步与多语言一致性方法 | cc-doc-sync-core | 保留 fec-doc-sync，负责前端事实源、入口和输出范围 |
| fec-debug-framework 的五步诊断方法 | cc-debug-methodology | 保留 fec-debug-framework，负责 build/runtime/ui/api 的前端证据与诊断模块 |
| fec-refactoring 的行为保持原则和通用流程 | cc-refactoring-core | 保留 fec-refactoring 及现有重构子系统，负责前端观察契约、框架适配和任务编排 |
| fec-tdd-workflow 的红绿重构与回归证明方法 | cc-tdd-methodology | 保留 fec-tdd-workflow，负责组件、hooks、路由和浏览器测试选择 |

共新增七个公共 Skill 入口。其中只有 drawio、源码验证的旧公共入口被完整替换；其余为拆分，不能简单全局替换 fec 名称。

代码评审和安全评审仍由前端维护，本期不为相似章节额外创立公共 Review/Security Skill。若其现有引用触及上述方法，则更新引用，不扩展到专业检查点迁移。

技术图表脚本移入 cc-technical-diagrams；PNG QA 若被视觉资产流程继续使用，通过公共包导出的资源生成其本地副本，禁止留下需人工双改的脚本。保持图表脚本内部相对导入、样式、字体策略和测试样例闭合。

## 6. 公共包与内容组合

craft-common 的计划结构：

```text
skills/cc-*/                  # 七个公共 Skill 的权威内容和资源
localized/zh-CN/skills/cc-*/  # 中文内容；可共享脚本但交付包须资源闭合
methods/                     # 前端领域流程复用的通用方法源，无额外发现入口
src/                         # 内容目录解析、导出与共享安装协议
scripts/                     # 校验、构建、组合资源及打包
tests/                       # 方法边界、包闭合、共享安装契约
docs/                        # 维护、消费和迁移说明
package.json                 # @bovinphang/craft-common，首版 1.0.0
```

- 延续 TypeScript、pnpm、Node 22+、ESM 和现有测试运行方式，不另建前端框架工程。
- frontend-craft 精确依赖 `@bovinphang/craft-common@1.0.0`，更新 common 必须显式更新依赖与内容锁。暂不使用宽松范围自动覆盖已部署公共内容。
- 发布依赖不能是指向 `../craft-common` 的路径。未发布阶段通过本地 npm tarball 做跨仓库联调；真实 npm 发布不属于本次执行授权。
- 公共包提供稳定的 JS 导出，定位自己的内容根、版本、方法资源及安装契约。不能假设 esbuild 后的 import.meta.url 仍位于 common 的 node_modules 目录。
- frontend-craft 由明确的同步步骤从固定版本包生成 `skills/cc-*`、中文对应目录和需要内嵌的通用方法资源；这些是禁止手改的分发快照，记录源包版本及逐文件哈希。
- 为兼容原生 Git 插件无构建步骤的发现方式，公共 Skill 的生成快照纳入产品仓库版本管理。CI 从精确公共包重建比对，禁止漂移。公共能力修改入口始终在 craft-common。
- 前端领域 Skill 引用自己的 `references/common/` 方法资源副本，由同一步骤生成。这样独立包不需访问 `../cc-*`，也不会因缺少相邻 Skill 失效；原有重复通用正文相应精简。
- 使用产品组合目录让现有适配器继续转换前端部分；安装协调层把 cc 交给公共所有权会话，不能沿用产品清单重复记录 cc 文件。
- 公共 metadata、relations、eval queries 在 common 维护；产品组合索引包含 cc 与 fec，保留来源包、源版本和真实仓库地址。公共独立包使用 common 版本，前端独立包使用前端版本，不能把 cc 发布元数据统一覆盖成 3.0.0。
- 独立 Skill 的正文、脚本导入、Markdown 引用和 CSS/data/styles 等运行依赖必须递归闭合。修正目前仅按正文直接链接复制、文件白名单缺少 styles 等会阻断公共图表发布的逻辑；不引入无关压缩改造。

## 7. CLI 共享安装协议

### 7.1 身份与账本

公共部署身份按真实目标路径确定，不只按 Runtime 名称或配置 baseDir 判断。将同一真实 skills 目录的公共状态置于其父目录的 `craft-manifests/`；不同配置目录但同一真实 skills 目录共用账本。存在符号链接时需规范化真实祖先目录并防止路径越界。

保留现有 `frontend-craft.manifest.json` 作为产品文件清单，新增 common 清单和消费者锁；不为了目录美观一次迁移全部现有产品清单。

账本必须包含 schemaVersion、公共包精确版本、内容语言、源内容摘要、实际部署文件哈希及消费者集合。消费者标识由产品名、真实产品清单路径、作用域组合产生；同一消费者重复安装只更新自身记录，不累加引用计数。

产品清单记录其公共依赖身份及账本位置，不把 cc 文件列为自身独占文件。无 Skill 能力的 Runtime 不写入虚假公共 Skill 引用。共同使用的方法已内嵌进领域分发文件，不视为独立公共 Skill 安装。

### 7.2 安装、更新与卸载

1. 修改文件前完成内容、版本、语言、所有权及所有消费者约束检查。获取按共享目录区分的排他锁，再读取账本并生成完整写入计划。
2. 首个消费者部署 cc 并注册自身；相同版本、语言、内容摘要的后续消费者复用。不同消费者的相同 common 版本必须内容相同。
3. 公共文件有用户修改或未知来源同名文件时，不接管、不覆盖，报告冲突并在写入前失败。
4. 首期消费者声明精确版本。存在其他消费者要求不同版本时拒绝升级，不自动降级或采用后安装者覆盖。唯一消费者升级时仅更新仍与清单哈希一致的公共文件。
5. 相同目标中的语言也是内容契约。不同消费者要求不同语言则显式冲突；不悄悄把另一产品的中文替换成英文。
6. 卸载先移除当前消费者引用；仍有消费者则保留 common。最后一个消费者才回收哈希未变化的公共托管文件。用户修改或未知文件保留，保存其所有权记录和未完成清理状态；不得因引用归零删除整棵 skills 目录。
7. 更新过程中废弃的文件只按旧清单和匹配哈希回收；空目录清理不越过公共目标边界。
8. 写入通过临时文件、原子替换及持久化事务记录协调文件和账本；失败保留恢复信息，下一次操作先恢复或安全拒绝。不能把半次安装记成成功，也不能因陈旧引用误删公共文件。对并发或中断无法确认的锁提供诊断，不盲目删除。
9. `--dry-run` 只读，无锁文件、临时文件、账本或资源写入，输出复用、部署、冲突及回收计划。现有 runtime install/update/uninstall 和 CLI `--purge` 路径都走同一公共协调协议。

共享协议只抽取必要的身份、计划、所有权与事务能力。Runtime 路径与专属 hooks/settings 转换继续由现有前端适配器负责；不顺带泛化所有安装器。

## 8. 旧名称迁移检查

建议新增命令 `fec runtime check-migration [runtime]`，作为本期计划实现的新命令；它不是现有能力。默认检查当前项目及明确选择的安装范围，输出可读报告并支持 JSON。具体参数解析可由实施者遵循现有 CLI 约定细化。

- 直接替换映射：fec-drawio-studio → cc-drawio-studio；fec-source-driven-development → cc-source-driven-development。
- 拆分映射：fec-image-generation 的技术图表调用 → cc-technical-diagrams；视觉调用继续使用原入口。doc/debug/refactoring/tdd 的原前端入口仍有效，仅公共任务改用对应 cc 入口，不能机械改名。
- 检查命令、Agent、项目配置、说明文档、自动化引用及本地安装目录；报告路径、行号、旧标识、映射类型和建议。排除 Git、依赖、构建产物、二进制及符号链接遍历；不读取或打印密钥文件内容。
- 默认只读，不自动重写用户项目。产品仓库内的受控引用由本次开发更新；用户项目中的修改通过指南人工审阅。
- 正常安装/更新前执行旧安装预检。旧清单托管且哈希未变的整体迁出 Skill 可计划移除；修改过的旧 Skill 或未知来源旧目录阻止完成迁移并报告，避免新旧入口同时竞争。拆分后仍保留的 fec 入口不删除。
- 无旧清单时不认领现存旧目录。损坏清单、越界路径、不可读文件作为阻断项报告，不以扫描成功掩盖。
- 退出码约定：0 无待处理项，1 有迁移项或冲突，2 参数、读取或账本错误。指南注明检查操作不修改文件，并给出安装前后示例、映射表和受保护残留的处理办法。

## 9. 本期验证与交付验收

实施前记录原有 lint/typecheck/test 基线，保留既有失败证据。之后在两仓库运行各自 package.json 中真实存在的校验命令；common 创建等价 lint、typecheck、test、build 脚本，前端延用 `pnpm lint`、`pnpm typecheck`、`pnpm test` 及现有发布检查。

必须覆盖以下有行为意义的场景：

1. 七个公共入口的英文/中文 frontmatter、触发边界、资源闭合、脚本相对路径及第三方声明；common 不反向依赖 frontend-craft。
2. 前端专业流程仍含领域检查，源码验证的前端扩展、图像生成与技术图表不发生职责遗漏。
3. 使用 frontend/backend 两个消费者夹具验证两种安装顺序、重复安装、单方卸载、最后卸载、版本及语言冲突、用户修改、未知同名文件、损坏清单、并发与中断恢复、dry-run 零写入。
4. 同一路径的不同消费者共享、不同路径及本地/全局作用域隔离；Codex 自定义配置目录与 `.agents/skills` 分离；不同 Runtime 共享同一实际目标的情况。
5. 迁移检查区分完整改名与拆分；保留 fec 前端入口；修改过的旧公共 Skill 被报告且不误删；检查不泄露敏感内容。
6. 15 个 Runtime 的现有能力不倒退；有 Skill 支持的安装路径验证 cc 实际存在，无 Skill 支持的保持其现有降级行为。
7. npm tarball 安装后移走源码目录仍能使用 CLI 和图表资源；本地 common tarball 联调不依赖兄弟仓库绝对路径。Claude 原生插件快照和 OpenClaw 包具备完整 cc 资源；独立包可移到空目录后运行。
8. `metadata/relations/eval_queries`、版本同步、内容审计及命令适配接受 cc/fec 双来源，公共独立包版本和仓库归属正确，不靠放宽全部校验绕过。
9. README、中文 README、其余已有语言入口、Runtime 文档、示例、变更记录同步公共事实；扫描旧标识时对历史记录、迁移表及保留入口明确分类。

最终交付包括两仓库代码差异、common 消费说明、迁移指南、运行过的验证证据和剩余平台限制。backend-craft 仅作为未来消费者，不修改其内容。

## 10. 实施顺序、回退与留给实施者的决定

顺序：记录基线 → common 内容与闭合资源 → 产品内容组合与元数据 → 共享安装协议 → 前端安装和生命周期接入 → 迁移检查 → 各渠道打包与文档验证。每一步保持可独立审阅；依赖尚未发布时用本地 tarball 验证，发布 common 在前、frontend 在后，仅记录发布顺序，不实际执行发布。

回退以产品固定依赖及内容锁为边界。回退应用代码不自动恢复旧名 Skill；目标目录的公共内容仍受其他消费者约束、用户修改保护和事务恢复规则控制，禁止通过复制旧包覆盖现有共享状态。

留给实施者：模块和类型具体命名、局部帮助函数拆分、测试夹具组织、JSON 报告字段的最终命名、事务实现的具体文件结构、生成快照的注释格式。不允许自行扩大迁移清单、引入新的必需外部图表工具、承诺未经验证的原生双插件去重，或跳过公共所有权保护。

本设计新增的建议包括：七个入口的首期清单、common 1.0.0 精确依赖、生成分发快照、只读迁移检查、旧产品清单保留、原生渠道双产品共存暂不纳入本期保证。用户批准本设计后，下一步才使用 writing-plans 编写可执行计划。
