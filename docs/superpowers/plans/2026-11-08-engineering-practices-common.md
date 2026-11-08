# 公共规范、同步与语言案例 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 形成可靠的公共规范源、不会丢入口的生成器，以及 14 个公共入口的工程细则与八组真实案例。

**Architecture:** 先冻结基线，再修复旧同步器；八张 core 卡原样生成到每入口，语言卡只在自己的参考中维护。维护工具与产品运行时隔离，SDK 仅增加一个 MethodName。

**Tech Stack:** 继承总计划的 TypeScript/ESM、node:test 和语言工具；宿主缺环境时使用显式准备的 Docker。

**Spec:** [已批准设计](../specs/2026-11-08-engineering-practices-integration-design.md)；[总计划及 Global Constraints](2026-11-08-engineering-practices-integration.md)是本文件的共同约束。

## Global Constraints

执行总计划所有约束；尤其不执行当前破坏性 sync:methods 于真实源树，不修改上轮成果/证据，不提交，不增加入口或全局加载器。下文 source 路径均相对于工作区，命令标明仓库。

## Review Focus

总计划五项风险由 A2/A3/A6 与 B2/B5/B6 联合覆盖；本计划着重零写入预检、增量索引、公共锚点、真实 RED 判定。

## 固定的公共目标与局部卡片

下表是 `craft-common/scripts/engineering-targets.ts` 的明确目标，不能从名称前缀推断。`topic` 均拼接为 `<id>:<topic>`。

| id | 本地 topic |
| --- | --- |
| cc-typescript-project-standard | input-validation, async-errors, package-contract |
| cc-rust-project-standard | ownership-api, result-boundaries, unsafe-ffi |
| cc-go-project-standard | package-interfaces, error-boundaries, context-ownership |
| cc-java-project-standard | module-contract, exception-causes, resource-lifecycle |
| cc-python-project-standard | import-safety, external-data, context-cleanup |
| cc-c-project-standard | allocation-size, partial-cleanup, c-abi |
| cc-cpp-project-standard | raii-borrowing, exception-abi, teardown-lifetime |
| cc-rust-async | cancellation, guard-lifetime |
| cc-go-concurrency | shutdown-wait, channel-ownership |
| cc-python-async | cancellation, blocking-io |
| cc-java-runtime | executor-lifecycle, diagnostic-bounds |
| cc-native-memory-safety | allocator-pairs, teardown-races |
| cc-tauri-project-standard | ipc-validation, cancellation-cleanup |
| cc-electron-project-standard | ipc-trust, cancellation-cleanup |

每个目标的手工文件为 `craft-common/skills/<id>/references/engineering-practices.md` 及 `craft-common/localized/zh-CN/skills/<id>/references/engineering-practices.md`；修改对应 `SKILL.md` 和已有 `references/practice.md`（TS 使用已有类型参考）。每个目标还由同步生成总计划指定的三份 references/common 文件。后文引用本表即为这些精确路径的展开。

## A1：冻结当前成果与模型任务

**Files:**
- Create: `craft-common/tests/evals/engineering-practices/scenarios.json`, `README.md`。
- Create: `craft-common/tests/content/engineering-eval-contract.test.ts`。
- Evidence only: 新任务目录 `baseline/`, `evals/old/`, `progress.md`，不写上一轮任务目录。

**Interfaces:**
- 产出 `scenarios.json: {schemaVersion:1,cases:[{id,prompt,language,materials:[{repo,skillId,paths}],criteria:[{id,critical,expectation}]}]}`，固定 Q1–Q4，严格对应设计§10 的四项观察标准。
- 基线清单记录每仓当前 branch/HEAD/status、非忽略项目文件的路径/哈希/快照位置以及排除原因。快照不是 HEAD 导出；包含相关未跟踪源码。敏感文件、链接、依赖、构建和缓存不读取；原快照不可覆盖。
- 每个模型材料包记录所选文件/片段与 SHA256；中文任务统一使用 zh-CN 材料。相同选材策略与 192KiB 上限应用于旧/新材料，按内容哈希去重、不截断；超限先缩小并登记相关片段后再冻结。英文模型表现不由这四组推断。

- [x] Step 1：用 executing-plans 工作区约定建立本任务 ledger；在任何规范/生成器改动前，保存实际当前源码快照、状态和上轮归档索引。对复制前后文件哈希核对；若用户同时改动导致漂移，重新冻结该基线并记录。
  Expected: 21/74/42，已有全部未提交成果可在快照恢复；没有读写敏感文件或上轮缓存。
- [x] Step 2：先写四任务结构断言，再创建预登记 JSON/说明。
  ```ts
  assert.deepEqual(cases.map(c => c.id), ['Q1','Q2','Q3','Q4']);
  assert.ok(cases.every(c => c.language === 'zh-CN' && c.criteria.length === 4));
  assert.ok(cases.every(c => c.materials.length > 0 && c.criteria.some(x => x.critical)));
  ```
  Run (common): `pnpm exec node --import tsx --test tests/content/engineering-eval-contract.test.ts`。
  Expected: 缺文件 RED → 四组及材料/评分契约 PASS；这里不是业务或模型失败证据。
- [x] Step 3：固定材料：Q1 用 common TS + fec-react/api-integration/data-fetching；Q2 用 common Go/Rust 项目与并发/async；Q3 用 common C/C++/native-memory；Q4 用 common Java/Python 项目与相关 runtime/async。以显式 repo/skillId 声明定位，验证来自实际 catalog，不读取后来变更的工作树。
  Expected: 四个旧材料包的所有选择都能解析，元数据/哈希可重算；没有不存在的新参考。
- [x] Step 4：运行四个新的基线上下文回答，仅提供冻结材料和任务，不继承作者会话。相同模型/参数、最多四次冻结目录只读访问、零联网/写入，回答上限 1200 中文字。可直接内联全部包以免工具越界。保存原始回答及实际运行信息；工具越界或模型配置不一致则该次作废重跑。
  Expected: 四份旧回答完整保存；不要求其失败、不让回答者自评。基线冻结和采样完成后才开始 A2。
- [x] Step 5：ledger 记录基线、材料包及回答摘要。建议提交名 `test(evals): freeze engineering-practice comparison cases`，本次不提交。

## A2：增量同步和双语预检

**Files:**
- Modify: `craft-common/scripts/sync-methods.ts`。
- Create: `craft-common/scripts/method-definitions.ts`, `scripts/lib/method-sync.ts`。
- Create: `craft-common/tests/content/method-sync.test.ts`, `tests/content/method-sync-fixtures.ts`。

**Interfaces:**
- `syncMethods(input:{root:string;check?:boolean}):{changed:string[]}`，仅维护脚本导出；入口用 import.meta 主程序守卫。
- `planMethodSync(root:string):Array<{relativePath:string;bytes:Buffer}>`，完整读取/验证后返回确定性写集，不写文件。
- 原七个 definitions/categorization 原样搬到定义文件；未接入 A3 前只生成原五方法资源。原五 `readMethodResource` 接口不变。

- [x] Step 1：建立临时克隆夹具，复制实际 package/src/methods/skills/中文树，工具依赖可用指向既有 node_modules 的测试 junction。运行**夹具中的**旧入口，绝不运行真实树的旧生成器；先观察 21 →7 的真实内容丢失 RED。
  ```ts
  assert.equal(after.metadata.length, 21);
  assert.deepEqual(after.metadata.find(x => x.id === 'cc-rust-project-standard').applicability, beforeApp);
  assert.equal(after.metadata.find(x => x.id === 'cc-rust-project-standard').customField, 'fixture-preserved');
  ```
  `customField` 是夹具预先加在该 metadata 条目上的未知字段；不是在数组根上添加属性。
  Run (common): `pnpm exec node --import tsx --test tests/content/method-sync.test.ts`。
  Expected: 旧克隆明确失败于丢失条目/字段；夹具外文件哈希完全不变。
- [x] Step 2：增加预检反例：中文方法缺失、畸形/重复 ID 索引、指向不存在入口的索引、内部链接、输出父目录链接。修改一个 EN 方法为新内容以确保写集非空，再破坏 ZH 输入，断言调用失败且**所有输出**保持调用前字节。
  Expected: 旧实现存在局部先写行为；测试不得把测试构造输入的变化算成生成器写入。
- [x] Step 3：实现增量规划/应用，复用现有 `snapshotPath` 的祖先/相对路径检查，不复制第二套路径算法。按真实 cc 目录核对索引；保留非拥有合法条目、额外字段、relations 与 eval_queries。只更新拥有的生成字段；版本发布身份统一刷新全部 common 条目。
  Expected: 所有 21 项 version 等于 package.version；applicability/自定义字段、查询和原方法正文未无关丢失。
- [x] Step 4：添加 check/幂等断言：有漂移时 check 报错且不写；正常同步后再次同步 changed=[]；读取模块不能写树。错误输入未写任何生成文件/创建输出目录。
  Run 同上，加 `tests/content/metadata.test.ts`。
  Expected: 全部 PASS；当前真实 21 入口可以安全同步后保持预期语义。
- [x] Step 5：记录真实树同步前后的限定差异与新测试结果。建议 `fix(common): preserve complete catalogs during method synchronization`，不提交。

## A3：公共源、规则契约与十四入口副本

**Files:**
- Create: `craft-common/methods/engineering-practices.md`, `engineering-practices.sources.json`, `engineering-practices.rules.json`，以及 `localized/zh-CN/methods/` 中同名文件（两个 JSON 由生成器复制）。
- Modify: `craft-common/src/content/catalog.ts`, `scripts/lib/method-sync.ts`, `package.json`；仅依赖元数据确有变化时更新 lock。
- Create: `craft-common/scripts/engineering-targets.ts`, `scripts/lib/engineering-content.ts`。
- Create: `craft-common/tests/content/engineering-core.test.ts`, `engineering-resources.test.ts`。
- Modify: `craft-common/tests/content/metadata.test.ts`, `tests/fixtures/cross-domain-resources.json`。

**Interfaces:**
- `MethodName` 增加 `'engineering-practices'`；`readMethodResource(packageRoot,method,language):Buffer` 原签名不变。
- 维护模块 `validateCoreResources({markdown:string,sources:unknown,rules:unknown}):void`；`parsePracticeCards(markdown:string,ownerSkill:string):PracticeCard[]`。PracticeCard 对应总计划 frontmatter，检查当前入口锚点/必备小节；不导出到公共 SDK、不反向读取产品。
- 生成器消费本计划的明确 14 目标；prod 后续只消费三份资源字节及六方法 SDK。core rules 只允许总计划八 ID、kind=core、无 ownerSkill/外部正文路径。

- [x] Step 1：写 API/JSON/锚点/元数据错误断言，再写实际正文和 JSON。
  ```ts
  assert.equal(rules.rules.length, 8);
  assert.deepEqual(new Set(rules.rules.map(x => x.id)), new Set(CORE_IDS));
  assert.ok(rules.rules.every(x => x.kind === 'core' && !('ownerSkill' in x)));
  assert.throws(() => validateCoreResources({ ...input, rules: foreignAnchor }));
  ```
  Run (common): `pnpm exec node --import tsx --test tests/content/engineering-core.test.ts tests/content/engineering-resources.test.ts`。
  Expected: 公共源测试先因缺新方法/资源而 RED；随后先实现公共源/生成契约，语言本地卡断言分别在 A4–A7 随对应正文加入，不在本任务要求尚未创建的十四份本地卡全绿。不是人为降低旧断言。
- [x] Step 2：核验设计§8 实际采用段落，登记 source ID/section/checkedAt/versionScope/revision/许可状态/取舍。公共来源含语言官方资料和七框架既有官方参考；禁止用搜索摘要、不可达页或未知版次推导结论。正文原创覆盖八原则与四冲突例，API 显式允许第六方法。
  Expected: 所有使用的 sourceIds 可解析；来源URL无凭据；延期/拒绝项保留 limits，不被正文宣称采纳。
- [x] Step 3：在确认新版本未占用后设置新候选（默认 `2.0.0-dev.20261108.1`）。接入十四目标的原样副本及中文 JSON 复制，先完整预检再写。更新当前资源精确清单，但保留旧必需文件及旧原始哈希记录。
  Expected: 14×2 入口有三文件，coreJSON 八锚点在每包可解析；21项 metadata 新版本一致；其余七入口不被注入。
- [x] Step 4：加已知源不变断言、空/重复 source ID、缺 source、非 core 规则、外部 anchor、无条件强制 SAL/写重试表达的内容审阅检查、双语等级/ID 漂移反例。静态冲突检查只证明表达存在/级别和条件齐全，模型选择留 B5。
  Run 上述两文件以及 `tests/content/method-sync.test.ts tests/content/metadata.test.ts tests/content/cross-domain-skills.test.ts`，再 `pnpm typecheck`。
  Expected: PASS；第二次同步无变化；旧五方法读取和其字节保持有效。
- [x] Step 5：记录新 source/rule 清单和未采纳理由。建议 `feat(common): add conditional engineering-practice resources`，不提交。

## A4：TypeScript、Rust 与两组真实行为

**Files:**
- Create/Modify: 本表 TS/Rust 的 EN/ZH 本地参考、SKILL.md 与原参考。
- Create: `craft-common/skills/cc-typescript-project-standard/examples/engineering/{input.ts,boundary.test.ts,package.json,tsconfig.json,README.md}`，工具锁文件准备时生成并镜像。
- Create: `craft-common/skills/cc-rust-project-standard/examples/engineering/{Cargo.toml,Cargo.lock,src/lib.rs,README.md}`；同代码复制到中文镜像。
- Create: `craft-common/tests/engineering/{fixtures.ts,typescript.test.ts,rust.test.ts}`；更新当前资源清单。

**Interfaces:**
- TS/Rust topic 采用本表三项；均包含公共章节和来源，不包含 React/HTTP 的强制结构。
- 测试 `execute(command,args,cwd,env):{status:number|null;output:string;error?:Error}` 复用现有 fixtures 执行方式并清除 NODE_TEST_CONTEXT，默认离线、不自动安装。
- 行为开关统一 `CRAFT_ENGINEERING_DEFECTIVE=1|0`，默认0。CaseEvidence 按总计划记录；工具/编译准备在执行前单独验证。

- [x] Step 1：写本地卡和资源结构测试，再加入 TS/Rust 三卡双语正文；由 parsePracticeCards 验证 namespace、等级、正反/例外/证据及 sourceIds。修正 TS 过宽绝对禁令，不把项目有理由使用的配置直接当错误。
  Run (common): `pnpm exec node --import tsx --test tests/content/engineering-resources.test.ts`。
  Expected: 缺卡/资源 RED → 两入口卡片和生成副本 PASS。
- [x] Step 2：先建立固定的实际测试：TS 断言非法 unknown 输入不造成副作用、有效输入成功；Rust 断言错误原因和 Drop 释放次数。先让有缺陷分支通过工具准备与编译，再观察命名业务断言失败。
  Expected: EP-TS-01/EP-RS-01 真正 RED；缺编译器、类型包或零测试记录为 MISSING/FAIL，不冒充 RED。
- [x] Step 3：实现最小修复，保留同组用例和显式缺陷分支；发布默认受保护。样例 package/tool 配置自包含，TS 依赖的编译工具/类型必须显式声明，测试仅将其当准备好的外部工具，不导入仓库源码。
  Run (common): `pnpm exec node --import tsx --test tests/engineering/typescript.test.ts tests/engineering/rust.test.ts`。
  Expected: 每组都观察到缺陷非零+命名断言，修复为实际非零数量测试通过；Rust版本/MSRV及TS工具版本被记录。
- [x] Step 4：加入“编译失败不算RED、过滤为零测试不算GREEN”判定器测试；样例只在临时副本编译，源码/归档不得出现 target/build/node_modules 等产物。
  Expected: 误判反例拒绝；两个实际例和独立目录准备/运行说明有效。
- [x] Step 5：记录覆盖和缺环境；建议 `feat(common): deepen TypeScript and Rust engineering contracts`，不提交。

## A5：Go、Java、Python 与三组真实行为

**Files:**
- Create/Modify: 本表 Go/Java/Python 双语本地参考、SKILL.md/原参考；删除 Java scope 重复并保持库/桌面范围。
- Create: Go `examples/engineering/{go.mod,lifecycle.go,lifecycle_test.go,README.md}`。
- Create: Java `examples/engineering/{ResourceBoundary.java,ResourceBoundaryTest.java,README.md}`。
- Create: Python `examples/engineering/{resource_boundary.py,test_resource_boundary.py,README.md}`；路径均位于对应 common Skill，代码/锁复制中文。
- Create: `craft-common/tests/engineering/{go.test.ts,java.test.ts,python.test.ts}`。
- Create: `craft-common/scripts/verify-engineering.ts`, `scripts/engineering-container.sh`；添加维护命令 `verify:engineering`。

**Interfaces:**
- `verifyEngineering({root:string,caseIds:readonly string[],prepare:boolean,environment:'host'|'docker'}):CaseEvidence[]`，只覆盖 common 拥有的案例；维护导出，不是 SDK/bin。选项未知、case不属于本仓则拒绝；MISSING 返回退出码2，FAIL返回1，全部PASS返回0。
- `--prepare` 才能准备依赖/镜像；Docker 使用已核验镜像/具体 imageId、只读 /src、工作副本和任务缓存，不挂宿主凭据/socket。默认不联网。

- [x] Step 1：写卡片边界测试及三组原生测试；Go 用控制通道安排取消和等待，Java 用实际关闭与异常原因检查（`java -ea` 或始终有效检查），Python unittest 验证 import/部分初始化清理。
  Expected: 新本地卡缺失 RED；随后受控缺陷在已准备工具里分别产生 EP-GO-01/JAVA-01/PY-01 业务 RED。
- [x] Step 2：完成三语言卡与受保护实现；每例独立源码/README，不引入 Web 框架/DB。编译执行放临时目录，Java关闭检查不能被默认禁用断言绕过，Python设置不写pycache到源。
  Run (common): `pnpm exec node --import tsx --test tests/engineering/go.test.ts tests/engineering/java.test.ts tests/engineering/python.test.ts`。
  Expected: 三组真实 GREEN；语言版本/实际测试数/范围记录，无假“全后端通过”。
- [x] Step 3：在测试中先传入未知 case、缺选项值、缺镜像、子进程语法错误、全跳过证据，验证维护器不会产生PASS；再实现维护薄壳和 Docker 执行。复用既有 runner/镜像准备模式，不改变产品安装器。
  Expected: 错误参数/工具缺失与业务失败区分；源码只读、准备有显式开关。
- [x] Step 4：显式准备需要的隔离环境，运行 `pnpm run verify:engineering -- --case EP-GO-01,EP-JAVA-01,EP-PY-01 --environment docker`（PowerShell 将列表参数作为一个带引号字符串）；没有准备时先执行带 --prepare 的同命令。
  Expected: 三组实际 PASS；每条 broken/fixed、工具、imageId、输入hash/输出证据可复验，缓存准备不算业务RED。
- [x] Step 5：更新资源清单及证据，建议 `feat(common): add Go Java and Python practice regressions`，不提交。

## A6：纯 C、C++ 与原生边界

**Files:**
- Create/Modify: 本表 C/C++ 双语本地参考、原 practice/SKILL。
- Create: 对应 `examples/engineering/{boundary.c,boundary_test.c,README.md}` 和 `{boundary.cpp,boundary_test.cpp,README.md}`；可增加明确编译配置但不能依赖兄弟目录。
- Create: `craft-common/tests/engineering/{c.test.ts,cpp.test.ts}`；扩展 common 维护 case 声明，不新增语言安装分支。

**Interfaces:** EP-C-01/EP-CPP-01，报告/开关/工具判定复用 A4/A5；C11/C++17 是样例自有目标，不是用户项目升级要求。

- [x] Step 1：卡片反例先钉住纯 C 不被强制 C++、C++ 本地异常政策优先、MSVC SAL 有条件；加入源/卡片缺失 RED 并补足三卡。
  Expected: 条件、例外、来源对应可检查；实际模型是否遵守由 B5 判断。
- [x] Step 2：写 C 大小/部分清理和 C++ 借用/构造失败的固定断言。可控分配/释放记录用于观察实际资源操作；不以不稳定的 UB 崩溃作为唯一证明，不允许 NDEBUG 使断言消失。
  Expected: 已编译的缺陷版本触发命名业务失败，非缺 gcc/cmake 的环境错误。
- [x] Step 3：实现受保护默认路径，保持 C ABI和C++借用契约；实际执行 host或已准备Docker版本。明确 sanitizer 是额外证据，没跑不能宣称内存安全已证明。
  Run (common): `pnpm exec node --import tsx --test tests/engineering/c.test.ts tests/engineering/cpp.test.ts`；缺宿主工具用 A5 维护命令的 Docker 环境。
  Expected: 两组真实 GREEN，输入异常和成功路径均执行；工具和实际命令记录。
- [x] Step 4：确认 EN/ZH 代码同字节、资源清单无旧文件丢失、独立目录可按 README 运行。建议 `feat(common): strengthen native ownership and ABI practices`，不提交。

## A7：五专项、桌面与公共阶段门禁

**Files:**
- Create/Modify: 本表剩余七项的双语本地参考、SKILL/practice；共五语言专项+Tauri/Electron。
- Create: `craft-common/skills/cc-electron-project-standard/examples/engineering/{ipc-lifecycle.cjs,ipc-lifecycle.test.cjs,package.json,README.md}` 及中文同代码。
- Create: `craft-common/tests/engineering/ipc-lifecycle.test.ts`；扩展 verify-engineering 的 EP-IPC-01。
- Modify: `craft-common/tests/content/engineering-resources.test.ts`, `tests/fixtures/cross-domain-resources.json`。

**Interfaces:** 至此 14 项都有本地卡及三生成副本；公共拥有的案例正好八组（七语言+IPC），UI和SVC由产品拥有，不让 common 维护器读取产品源码。

- [x] Step 1：按目标表钉住七项最少两卡、正确 sourceIds、旧例保留、没有泛化框架/服务义务，先观察缺内容 RED。
- [x] Step 2：写 IPC 关闭/取消后无特权副作用及有效调用成功用例，执行缺陷真实 RED，再实现实际 handler 的受保护逻辑。工程样例自包含，不借用其他目录的实现，也不称为 Electron GUI 测试。
  Run (common): `pnpm exec node --import tsx --test tests/engineering/ipc-lifecycle.test.ts tests/frameworks/tauri.test.ts tests/frameworks/electron.test.ts`。
  Expected: 新/旧桌面边界 PASS；缺 cargo 的平台需另有真实执行，GUI/权限激活仍 NOT RUN。
- [x] Step 3：执行八组 common 维护验证，准备与验证分开。
  Run (common): `pnpm run verify:engineering -- --case 'EP-TS-01,EP-RS-01,EP-GO-01,EP-JAVA-01,EP-PY-01,EP-C-01,EP-CPP-01,EP-IPC-01' --environment docker`；确需准备时先以同一命令增加 `--prepare`，再执行不带准备的复验。审阅十四项自然语言的条件/例外、原始引用和字数，已有八个正反查询不能被缩减；补充本轮相关负例。
  Expected: 八组有真实RED/GREEN，不用宿主SKIP代替全部证据；scope/lib/CLI/desktop/unknown 保持区别。
- [x] Step 4：运行 common `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm run pack:skills`。仅新变化/失败才重复已通过命令。Linux用隔离副本执行同步、案例和相关安装检查；记录未运行项。
  Expected: 当前公共阶段全部门禁通过，21双语入口保持；生成副本/本地引用闭合，语言/场景级规则没有进入公共rules.json。
- [x] Step 5：写阶段ledger与覆盖矩阵初稿，建议 `feat(common): integrate lifecycle and desktop engineering guidance`，不提交；然后才进入 B1。
