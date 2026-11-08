# 成熟工程实践分层融合设计

日期：2026-11-08

状态：用户已选择方案 B，并于 2026-11-08 批准本文，进入实施计划阶段；尚未开始本轮产品实现。设计稿不自动提交，commit、push、publish 均需另行明确授权。

## 1. 意图与依据

将成熟企业公开的工程经验和语言官方实践，转化为本项目 AI Skills 能执行、能解释取舍、能验证的开发指导。主要交付是增强后的 Skills、独立参考资源、原创案例和验证证据；不是给三个工具仓库换一套技术栈或一次性开启所有严格检查。

用户选择的 B 为：公共原则集中维护，语言和场景分别细化，生成完整分发副本。用户未指定某家公司为唯一标准，也没有授权照搬其内部约束。本设计选择、预算和具体范围中尚非用户逐项指定的部分均为设计者建议，随本文一并请求批准。

执行基于 `D:\code\github\frontend\ai-coding-craft` 下三个仓库的当前工作区，包含上一轮尚未提交的实现；不能只看 HEAD、远端或 npm 发布版。保持这些变化及其原始验收记录，不 reset、pull、覆盖旧归档或把旧证据改记为本轮通过。

## 2. 现状与要补的缺口

- common 当前有 21 个公共入口；frontend 53 个专属 +21 公共 =74；backend 21 个专属 +21 公共 =42。语言、角色、框架和任务已经分维描述。
- 共享方法由 common `methods/*.md` 维护，`readMethodResource` 提供读取，产品的 `SnapshotDeclarations.domainMethods/extraResources` 声明生成目标。独立 Skill 包要求资源在自己的目录内闭合。
- 七种语言已覆盖项目定位、错误、资源与验证，但部分参考仍是六条概要和一个链接；Java scope 示例还有重复。需要补充决策条件、例外、反例、验证和更准确的来源。
- frontend 已有较细的 API、测试、评审指导，backend 已有服务契约与失败语义。适合增强和纠偏，而非复制第二套 TDD、调试、重构流程。
- **同步风险**：common `scripts/sync-methods.ts` 的 definitions 仍只有原来的 7 项，并重建整个 metadata/relations。原样运行可能丢失后加的 14 项及 applicability。本文将其有限修正列为新内容接入前置条件。
- `tests/fixtures/cross-domain-resources.json` 当前断言迁移后资源集合完全相等；新增资源需要显式更新当前清单，同时保留上一轮原始文件哈希来源记录，不能借更新删除旧资源。

## 3. 目标、非目标与失败标准

### 目标

1. 以公共原则 → 语言细则 → 场景实践 → 证据的结构增强内容；只有 common 是跨领域规范的手工维护源。
2. 七种语言均有明确的判断与验证案例，C 与 C++ 保持各自所有权、错误与 ABI 契约。
3. 前端、桌面、服务都能应用公共原则；语言本身不推断服务、框架或必须采用的分层架构。
4. 规则有来源、适用条件、级别和例外，项目既有工具与已声明的兼容契约得到尊重。
5. 双语、独立包、CLI/native 分发、无原生 Skill 宿主的私有参考资料保持完整。
6. 分开验证内容完整性、样例真实行为、AI 决策表现；分别报告覆盖和未验证边界。

### 非目标

- 不新增通用 CLI、规则执行平台、公司配置 profile 或全局自动加载器。
- 不更改安装事务、路径/锁模型、旧入口映射、inspect CLI/schema、角色枚举及推荐算法；仅为新增共享资源扩展现有内容同步机制。
- 不强制升级用户项目语言/框架版本、切换包管理器、启用微服务或套用某家公司的命名与格式。
- 不把仓库改成 React/Vite 应用，也不把示例测试依赖加入产品运行时。
- 不承诺桌面 GUI/签名、跨系统 exactly-once、数据库事务隔离或生产负载；这些需要各自真实环境证据。

### 失败标准

仅增加长文和链接；各仓各抄一份通用规范；没有条件就全局强制企业风格；吞掉未知情况后宣称合规；以结构测试、编译成功或静态查询冒充业务/模型效果；同步丢失原入口或原用户修改。

## 4. 已考虑的方案

| 方案 | 做法 | 取舍 |
| --- | --- | --- |
| A：逐项扩充 | 每个既有 Skill 分别增加企业规范与示例 | 局部快，但跨语言原则重复，后续易出现相互冲突和多源维护 |
| B：分层融合（用户选择） | common 维护公共原则与来源，语言/场景只维护差异，完整副本由同步生成 | 需要先整理内容边界和验证映射；长期一致性较好，适合已有三仓架构 |

本轮采用 B，首轮不增加 Skill ID。入口总数保持 21/74/42；新知识通过已匹配 Skill 的本地 references 按需读取。

## 5. 规则结构与冲突处理

### 5.1 八组公共原则

公共正文 `methods/engineering-practices.md`，中文为 `localized/zh-CN/methods/engineering-practices.md`。正文自包含，不引用仓库 tests、其他 Skill 或兄弟产品。章节用稳定锚点标识，主 Skill 只指引本次相关章节，不要求每次通读。

| ID | 原则及最小判断 |
| --- | --- |
| ENG-CONTRACT | 明确输入、输出、失败与兼容契约；外部输入按实际边界验证，破坏性变化有迁移决策 |
| ENG-ERROR | 失败不伪装成成功；保留有用原因，按调用边界转换，面向用户的错误不泄露敏感细节 |
| ENG-RESOURCE | 创建、借用、转移、关闭的责任明确；部分初始化、重复关闭及失败退出有契约 |
| ENG-CONCURRENCY | 后台工作有退出和等待责任；时限、取消、共享状态、重复调用按实际语义处理 |
| ENG-BOUNDARY | 区分受信身份与客户端声明，约束长度/规模/路径/权限；安全与运行时验证不靠静态类型代替 |
| ENG-DEPENDENCY | 按已有工具链和受支持版本决策；公共 API、声明文件、依赖和发布产物可被真实消费者使用 |
| ENG-VERIFICATION | 由行为风险选择验证层；正反和失败路径有证据，测试未执行或全跳过不能称为通过 |
| ENG-OPERABILITY | 诊断、重试、恢复和回滚有边界；记录必要关联信息，避免敏感数据与无界副作用 |

已有 source-driven/TDD/debug/refactoring/doc-sync 方法继续负责相应流程；新方法只定义工程决策原则和到既有流程的语义指引，不再复制其步骤。

### 5.2 三种规则级别

- `required`：给定场景下的安全、正确性或已承诺兼容底线，例如错误不得返回伪成功。不能把个人格式偏好标为底线。
- `recommended`：通常更可维护的默认做法；项目有合理约定时可选择别的实现并说明取舍。
- `conditional`：只有可核验的触发条件满足时适用，例如网络操作的重试、MSVC 的 SAL、跨 DLL 的分配器配对。

每张规则卡必须包含：ID、问题/风险、适用与不适用条件、级别、推荐决策、可接受例外、原创正反示意、验证方法、来源 ID、相关真实案例 ID或明确“本轮仅审阅/未运行”。英文中文的 ID、级别和语义一致，表达可以本地化。

### 5.3 冲突优先级

先遵守用户明确目标、项目当前安全/兼容契约与事实，再按具体语言/版本和实际场景选择来源。企业的风格选择是可参考的上下文，不能单凭公司知名度覆盖项目约定。若本地约定会破坏已确认的安全或正确性，需要提出有证据的冲突和最小修正，不静默照办。

必须提供四个冲突反例：Google C++ 异常政策不能覆盖已使用异常的库；Google TS/JS 内部约束不能直接成为外部项目统一要求；MSVC SAL 不能强加给非 MSVC 工程；服务重试原则不能授权浏览器无幂等保障地重放扣款。

## 6. 有界内容范围

### 6.1 common：14 个既有入口

七种项目标准各至少补三类完整决策卡，新增本地 `references/engineering-practices.md`；现有正文/参考指向它并去除重复或错误表述。

| 入口 | 三类重点 |
| --- | --- |
| cc-typescript-project-standard | unknown 与运行时校验；异步状态和错误边界；模块/声明/exports 与消费者验证 |
| cc-rust-project-standard | 借用/所有权与公共 API；Result 原因与边界；unsafe/FFI 的证据和最小范围 |
| cc-go-project-standard | 包/消费者接口边界；错误处理一次并保留原因；context 和后台资源责任 |
| cc-java-project-standard | 公共模块/兼容性；异常分类及原因；AutoCloseable/executor 和桌面线程边界 |
| cc-python-project-standard | 导入安全与依赖；类型及外部数据边界；上下文管理器和异常清理 |
| cc-c-project-standard | 长度/溢出/符号；分配、释放与部分清理；纯 C ABI/回调借用契约 |
| cc-cpp-project-standard | RAII 和借用区别；异常保证及 ABI；析构/回调/并发卸载生命周期 |

五个既有专项 `cc-rust-async`、`cc-go-concurrency`、`cc-python-async`、`cc-java-runtime`、`cc-native-memory-safety` 补充取消、停止等待、资源、诊断边界；每项至少两条特有决策，引用公共原则但不复制通用正文。

`cc-tauri-project-standard` 与 `cc-electron-project-standard` 增强 IPC 契约、信任身份、取消/关闭和故障恢复的具体应用，保留上轮真实示例与 NOT RUN 边界。

其余七个公共入口保持原职责；必要时只增加简短的相关章节导航，不注入整套规范或扩大 description 触发范围。

### 6.2 frontend：8 个专属入口

`fec-react-project-standard`、`fec-vue3-project-standard`、`fec-api-integration`、`fec-data-fetching`、`fec-code-review`、`fec-testing-strategy`、`fec-security-review`、`fec-dependency-upgrade`。

各入口新增本地 `references/engineering-practices.md` 场景补充，主要覆盖：副作用清理/过期结果、输入与类型边界、读与写请求不同的重试条件、兼容窗口、敏感信息、基于风险的评审与验证、依赖变更的消费者影响。React/Vue 有各自清理机制，不能写成通用 HTTP 服务层。

### 6.3 backend：14 个专属入口

基础九项：`bec-architecture-design`、`bec-api-design`、`bec-auth-security`、`bec-database-design`、`bec-transaction-management`、`bec-observability`、`bec-testing-strategy`、`bec-code-review`、`bec-dependency-management`。

另增强既有 Spring Boot、FastAPI、Gin、Axum、Drogon 五个专项。内容聚焦失败分类、时限与取消、幂等和兼容、资源启动关闭、数据与授权边界；不把客户端成功重试当作数据库/消息系统的原子性证明。

基础规则和框架机制分开维护。例如幂等前提在公共/服务契约中，框架专项说明实际请求、提取器、Filter、生命周期中的落点，不再复写整段原则。其余专属 Skill 不批量加通用内容。

### 6.4 读取顺序

先读仓库事实与当前已匹配的 Skill，再选语言或场景参考及相应公共章节。一般语言组织问题不因此加载全部框架；纯 C/C++/Rust 库不因规则来源含服务经验而获得 HTTP、数据库或微服务义务。JavaScript 工程可以使用语言无关原则和已有前端场景指导，本轮不新增 JavaScript 语言入口或要求迁移 TypeScript。

## 7. 唯一源、同步与 API

### 7.1 新公共源

- `methods/engineering-practices.md`：八张公共规则卡及读取说明，英文规范正文。
- 对应中文 `.md`：同 ID/级别/适用范围的自然中文正文。
- `methods/engineering-practices.sources.json`：唯一维护的来源记录。
- `methods/engineering-practices.rules.json`：**只登记 §5.1 的八张公共规则卡**，提供正文锚点、sourceIds、适用语言/角色/任务、caseIds；不复制规范正文，也不是运行时强制策略引擎。不得把产品专属或其他入口的卡片加入这个公共映射。
- 中文侧两个 JSON 是同字节生成副本，不能成为第二维护源。

来源字段最少为 `id, publisher, title, url, section, checkedAt, versionScope, revision?, licenseStatus, adoption, limits`。公共规则字段最少为 `id, kind("core"), level, anchor, sourceIds, languages?, roles?, taskKinds?, caseIds`；没有 ownerSkill 或跨入口正文路径。八个 anchor 都解析到同包的公共正文，不依赖兄弟 Skill。复用既有角色/任务词汇；不扩展运行时 applicability schema。来源版次不明时明确记 unknown，不猜版本或声称最新。

语言/场景卡片以各自的 `references/engineering-practices.md` 为唯一正文维护源，标识采用 `<skill-id>:<topic>`，其卡内包含 §5.2 要求的字段。内容检查器只解析并验证当前入口的卡片、其本地锚点和引用，不要求建立全局语言/场景 JSON，也不让 common 反向读取产品源码。需要结构化覆盖报告时从本地卡片提取，报告是生成证据，不能成为第二规范源。

### 7.2 现有接口的最小扩展

`MethodName` 增加 `engineering-practices`，`readMethodResource` 的显式允许表相应增加一项。其余签名不变。旧五个方法的行为保持兼容；新方法读取和链接/缺文件安全测试遵循现有协议。

公共 14 个增强入口和产品 22 个专属增强入口，均生成以下文件：

```text
references/common/engineering-practices.md       # 自包含公共正文的原样副本
references/common/engineering-practices.sources.json
references/common/engineering-practices.rules.json
references/engineering-practices.md              # 本入口手工维护的语言/场景细则
```

公共原样副本只链接自己内部章节和官方网络来源，不链接其他 Skill、本仓库 methods 或 tests。两个 JSON 随包携带；公共 rules.json 的八项都必须在本包公共正文解析成功，语言/场景卡的锚点只在本入口细则内解析。来源/案例 ID 是证据标识，不可伪装成不存在的本地可运行路径；属于本入口的实际案例必须链接到本入口 examples 中的真实文件，其他入口的案例 ID 仅作为证据目录标识，不构成本包运行依赖。完整来源表可以包含当前卡片未使用的来源，不能据此要求加载其全部内容。

产品通过现有 `domainMethods` 映射正文，通过 `extraResources` 映射两个 JSON；common 自己的生成器使用同一方法资源和声明。生成副本允许物理重复以保证独立分发，正文只在 common 的源维护。

### 7.3 修正同步器但不扩大为新平台

`sync:methods` 只更新自身声明拥有的资源及索引条目。预读/校验完整双语输入与目标、再开始写入；未知/损坏索引拒绝，不能静默重置。更新原七项时保留已有额外 metadata 字段（包括 applicability）及非拥有条目；保留全部 21 项和已有 eval_queries，不能缩减查询。公共包版本变化时，所有 21 项的 version 统一与 package.json 对齐；这是公共发布身份的整体更新，不允许其余 14 项残留旧版本，也不借此重写其正文、适用范围或查询。

新增 14 项公共规则副本用明确的目标清单生成，不靠前缀猜测。第二次同步幂等；临时目录测试先证明当前生成器会丢失条目，再修复。原七项方法正文不因接入本轮而被无关重写。

结构检查、同步和打包用现有 TypeScript/node:test 工具，不新增通用配置 DSL。生成器和清单文件的最终模块拆分留给实现者。

## 8. 来源选择与原创整合

以下均为本次已读取的一手来源候选，不代表所有知名公司统一采用其全部内容。实施时为实际采纳段落补齐具体 section/revision/licenseStatus，若文档改变则重新核对。

| 来源 | 可吸收内容 | 边界 |
| --- | --- | --- |
| [Google 评审标准](https://google.github.io/eng-practices/review/reviewer/standard.html)及[检查内容](https://google.github.io/eng-practices/review/reviewer/looking-for.html) | 有证据的代码健康、设计/正确性/可维护性评审 | 不将个人偏好升级成阻断；本项目已有评审分工继续使用 |
| [Microsoft Engineering Playbook](https://microsoft.github.io/code-with-engineering-playbook/) | 风险导向测试、评审、交付证据 | 是其公开工程团队实践，不代表微软全公司唯一制度，也不强推 Azure 工具 |
| [Google TS/JS](https://google.github.io/styleguide/tsguide.html)与[TS 发布文档](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html) | 类型/模块边界与可消费声明 | Google 明确提示其内部环境不同；遵循项目实际编译/打包模式 |
| [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) | 类型化 API、可组合性、文档及兼容 | Rust 库团队经验，指南而非对所有项目的强制条款；不强推新 edition/MSRV |
| [Uber Go Guide](https://github.com/uber-go/guide/blob/master/style.md) | 错误、所有权、边界拷贝及并发惯用法 | 不因指南使用某依赖就新增该依赖，不把其频道容量风格作为普遍正确性规则 |
| [Google Java](https://google.github.io/styleguide/javaguide.html)与[Oracle 资源关闭说明](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html) | 可读性、异常原因、资源责任 | Oracle 该教程注明旧 JDK 范围；较新 JDK/并发机制需补对应版本资料 |
| [Google Python](https://google.github.io/styleguide/pyguide.html) | 导入、异常、可变状态与类型约定 | 不要求改换项目已有 Ruff/typechecker，也不把所有风格设为底线 |
| [SEI CERT C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/)及[MEM00-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem00-c/) | 内存/错误/整数边界与责任配对 | 记录 2016 版及具体条目；recommendation 不冒称 mandatory rule，不将 C++ 机制套入纯 C |
| [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)及[Google C++](https://google.github.io/styleguide/cppguide.html) | 资源、接口、生命周期、异常策略取舍 | 存在项目上下文差异；不统一强制异常开关、编译标准或智能指针替代所有借用 |
| [Microsoft SAL](https://learn.microsoft.com/en-us/cpp/code-quality/understanding-sal?view=msvc-170) | 明确接口前置条件和输出保证 | SAL 注解只在适用工具链中作为条件性方案 |
| [AWS 时限/重试/退避](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)与[幂等 API](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) | 部分失败、重复调用、副作用和请求意图 | 以有界时限、幂等与实际错误分类为前提，不承诺跨系统 exactly-once |
| [React act](https://react.dev/reference/react/act)与[Vue watcher](https://vuejs.org/guide/essentials/watchers.html) | 真实更新断言和清理语义 | 页面显示版本不能授权升级；Vue 特定清理 API 按版本区分 |

本地 wiki.sei 的旧 URL 本次读取失败，使用已读到的 CMU SEI 官方站点与官方维护文档；Android Rust 指南本次不可读取，不作为已核验依据。论坛、博客和搜索摘要不作为规范事实来源。

采用原创的项目术语、判断流程、示例和解释，不搬运非平凡代码或大段原文。许可不明确的来源仅作事实/思想依据并链接；任何表达复用须先确认许可与署名。不得把本项目整合后的规则冒称来源企业的认证规范。

## 9. 可运行案例与内容边界

每个案例保留同一组断言，只通过明确的测试开关切换有缺陷/修复实现。默认导入或运行样例使用受保护版本。需要先实际观察预期业务失败，再记录修复通过；编译错误、缺依赖、工具启动失败不是业务 RED。

| 案例 ID | 所属入口/位置 | 真正区分的行为 |
| --- | --- | --- |
| EP-TS-01 | common TS `examples/engineering/` | 不可信输入不能靠断言进入核心并产生副作用；有效输入仍成功 |
| EP-RS-01 | common Rust 同类目录 | Result 失败路径保留原因且释放已获取资源；不以 unwrap 取代边界 |
| EP-GO-01 | common Go 同类目录 | 取消后生产者/工作者都可确认退出；使用同步事件而非任意 sleep |
| EP-JAVA-01 | common Java 同类目录 | 失败时资源关闭一次并保留原始原因；不返回伪成功 |
| EP-PY-01 | common Python 同类目录 | 导入无外部初始化，部分初始化失败也完成已取得资源清理 |
| EP-C-01 | common C 同类目录 | 输入/分配大小无溢出，失败释放已取得资源，输出初始化符合契约 |
| EP-CPP-01 | common C++ 同类目录 | 不把借用指针二次接管；部分构造和异常路径只释放自己拥有的资源 |
| EP-UI-01 | frontend `fec-react-project-standard/examples/engineering/` | 用真实 React 渲染和可控 Promise 顺序，旧请求晚到/卸载后不得覆盖当前 UI |
| EP-IPC-01 | common Electron `examples/engineering/` | 真实 handler 的取消/关闭后不得继续产生特权副作用；不宣称 GUI/sandbox 已激活 |
| EP-SVC-01 | backend `bec-api-design/examples/engineering/` | 真实 Go HTTP/httptest 调用中，提交后响应失败的重试复用结果，同 key 不同意图拒绝；内存原子性不冒称数据库/多进程保证 |

十组是首轮最低行为覆盖，不要求每张卡单独造一个测试工程。使用标准库与已有工具优先；React 样例在独立目录声明并锁定 React/DOM 测试依赖，沿用 node:test，可用 Testing Library/JSDOM，不替换三仓测试框架、不进入 CLI 运行依赖。具体锁定版本由实施者核验官方支持和准备环境后选择并记录。

各例独立运行只依赖其本地文件和显式声明/已准备的工具依赖，不引用 common/product 源码或兄弟 Skill。镜像/工具/依赖准备与案例执行分开；可用用户已提供的 Docker，源挂载只读、输出在任务目录，无全局工具替换。缺环境记 MISSING，未执行的 GUI、原生包、外部数据库等记 NOT RUN。

示例代码及锁文件保持 en/zh-CN 同字节，README/说明双语；不维护两份不同算法。既有七框架示例保留，相关内容变化时重跑其既有真实检查；本轮未改变的框架机制可沿用原始记录并明确来源时间，不伪造新执行记录。

## 10. AI 决策验证

采用四组预先定义的配对任务，控制上下文规模；不是为每条规则或每个 Skill 派一批代理。

| 任务 | 观察标准 |
| --- | --- |
| Q1：TS UI 写操作超时后有人要求自动重试 | 区分读写、请求意图与幂等；旧结果不覆盖新状态；保留当前工具链；不声称未执行检查通过 |
| Q2：Go/Rust 后台任务赶工省略关闭等待 | 明确取消、资源与等待责任；不用缓冲/Arc 掩盖生命周期；用事件协调验证；不迁移整个 workspace |
| Q3：C/C++ 插件借用指针与异常策略冲突 | 区分借用与拥有、分配器/ABI；尊重项目异常政策；提出可观测失败测试；不强推 C++ 或新标准 |
| Q4：Java/Python 库被要求套完整 Web 分层和导入时连接 | 按库/CLI/桌面职责保留边界；资源/异常明确；阻止无关框架和导入副作用；诚实报告缺工具 |

实施修改前冻结所需旧 Skill/参考资料与任务/评分表。基线是旧版材料，不是虚构“没有任何规范”的空白模型；对照为新材料。每组两份新上下文回答，共 8 份，不继承作者会话；仅可读冻结材料，不联网、不读取已变更工作区，越界则该对照无效。

评分只认输出中的可观察决策，不让回答者自评。一个独立评估者按匿名材料和固定标准检查八份回答，保留原始输出、材料摘要、运行信息和逐项理由。配对任务采用同一可用模型、参数和工具预算，实施时记录实际标识；不得用不同模型的差异归因于材料。关键错误为：泄密/越权、重复副作用、资源/生命周期错误、无授权破坏兼容、伪造执行。新材料不得增加关键错误；四组均需满足其列出的观察标准，实际无提升或两组本已通过时如实记录，不编造基线失败或宣称统计显著提升。

这是有界任务评估，不保证所有模型、所有 36 个增强入口都达到相同效果；报告对每个入口分别标记结构、运行案例和模型任务覆盖。存在关键失败时先改相关内容并重跑对应配对任务，再进入交付验收。最终全量独立代码/内容评审与这一个模型评估角色分开，不进行逐入口实现代理编排。

## 11. 版本、分发与迁移

设计者建议新候选 `@bovinphang/craft-common@2.0.0-dev.20261108.1`，保留上轮 `2.0.0-dev.20261108` 的黄金归档和证据。实施时检查新候选是否占用，已占用则递增后缀；两产品精确依赖同一新候选，产品本地未发布版本暂保持 frontend 3.0.0、backend 1.0.0。不覆盖已发布版本或上轮归档。

通过新 common tarball 联调、两产品 sync:common/check:common 更新生成副本和真实完整性摘要；开发临时源及精确候选例外只在联调期间使用，最终清理。公开 registry 可下载/frozen 安装需发布后验证，本轮不执行发布。

保持全部 21 个公共入口和 74/42 组合数量；本轮没有新的旧名退役。内容摘要/版本改变仍受既有消费者一致性保护，沿用已文档化的协调升级：各旧 CLI 退出旧公共引用、处理保留修改，再安装匹配的新产品。不能因只改文档就绕过消费者保护。

独立包内新增参考、来源、规则映射、examples、依赖声明/锁与许可证均须实际出现在归档。已有迁移原始 hash 清单不改写；“当前资源清单”更新为新的精确集合并证明旧必需文件没有丢失。npm CLI 与 Claude/OpenClaw 单产品快照保持完整；Cline/Trae/Copilot 的产品私有 common 参考资料同步包含本轮资源，仍不伪装成原生 Skill 或创建第二个共享账本。

## 12. 验收与实施顺序

这是一个跨三仓的内容与验证项目，顺序为：冻结当前基线及四组模型任务 → 来源/规则契约和同步防回归 → common 原则与七语言 → 五语言专项和七框架/前后端场景 → 对照评估 → 同版本内容同步及全分发 → 最后整体独立评审。具体任务拆分在本文批准后的 writing-plans 阶段完成。

验收至少包括：

1. 规则/来源字段、等级、唯一 ID、正反适用、双语对应、来源不可达/冲突处理、每入口覆盖映射；结构检查不声称验证模型理解。
2. sync:methods 的 21 项保留、applicability/未知 metadata 字段保留、查询不缩减、全双语预检和幂等；损坏输入在写入前拒绝。
3. 十组真实案例的业务 RED/GREEN、固定断言、版本/平台/镜像与边界，四组旧/新材料任务的原始对照与独立评分。
4. 每个增强入口在单独打包后本地引用闭合，新增文件不漏 whitelist；移除源码与兄弟 Skill 后仍可读取，示例只使用显式准备依赖。
5. 三仓按实际 scripts 运行 lint、typecheck、build、test；common pack:skills/pack，两产品 pack:all、check:common，frontend typecheck:openclaw，实际本地双产品 verify:coexistence。相关同步、案例及安装路径在 Windows/Linux 均有真实执行，其他未运行范围明确记出。
6. 既有未知文件/用户修改保护、旧入口迁移、无 Skill 宿主私有参考资料和部分卸载不回归；最终工作区无临时 registry/供应链例外、相邻源码依赖或手工改写公共副本。
7. 总体独立评审覆盖全部本轮 diff 和相关未跟踪新文件；修复有证据的重要问题后运行相关与最终门禁。旧报告不冒充本轮评审。

设计阶段只写本文并进行独立可实施性检查；不执行产品代码修改、依赖安装、新版本打包或模型任务评估。设计审批不代表已实现或验收通过。

## 13. 留给实施者的决定

- 选定与已准备环境相容的样例精确版本和目录内文件名，记录选择依据；不升级用户项目。
- 在上述 ID、字段、来源、生成与资源闭合契约内安排模块、测试文件和声明清单的组织。
- 避免无意义的规则卡数量膨胀；为列出的语言重点和场景补足可行动内容，合并同根因表述，但不减少明确的十组行为案例和四组任务对照。
- 根据实际失败调整内容表达和例外，保存未采纳/推迟来源及原因；不能以设计未规定实现细节为由跳过安全、兼容或可验证性要求。

## 14. 独立可实施性检查记录

2026-11-08，新上下文审阅者读取本文与相关代码，提出一项必须明确的问题：公共 rules.json 是否要求在每个独立包内解析其他入口卡片的 ownerSkill/anchor。原样复制全局映射与独立包只携带本入口正文存在两种不同解释。

设计者裁决：公共 JSON 只登记八张 core 卡，八个锚点全部随包可解析；语言/场景卡由各自入口的本地细则维护并做本地校验，不建立跨产品的规则正文依赖。已修订 §7.1–7.2。代价是本轮不提供全局语言/场景规则查询 API；本轮目标不需要该 API，内容覆盖报告可以从各本地卡提取。

同时明确了全 21 项版本对齐及配对评估的模型/预算一致性。没有另开一轮代理评审，也没有把审阅者原先的一项疑问改记为其声称的“无问题”；上述澄清由设计者负责。没有必须由用户追加选择的设计前置问题，用户已于 2026-11-08 批准本文。
