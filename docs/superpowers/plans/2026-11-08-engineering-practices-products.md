# 场景适配、模型对照与三仓交付 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将公共规范融入 22 个产品专属入口，完成 UI/服务案例、四组配对评估和实际分发验收。

**Architecture:** 消费 A 产出的六方法 SDK 和三份公共资源；产品声明自己的目标与差异，不维护公共正文。真实案例、模型表现和分发/安装证据分别记录，最后进行一次整体独立评审。

**Tech Stack:** 继承总计划；React 场景使用独立样例依赖和现有 node:test，服务场景使用 Go 标准库 HTTP 测试，框架验证复用既有维护命令。

**Spec:** [已批准设计](../specs/2026-11-08-engineering-practices-integration-design.md)；[总计划及 Global Constraints](2026-11-08-engineering-practices-integration.md)和[A计划接口](2026-11-08-engineering-practices-common.md)均须读取。

## Global Constraints

A7通过后才执行B1。保持21/74/42、36入口和原安装保护，版本/SRI精确一致；不得为了读取未发布包永久放开供应链检查、改成本地源码依赖或覆盖上一轮归档。以下各任务不提交代码。

## Review Focus

继承总计划五项风险；重点为产品副本的真实来源、错误重试语义、归档闭合、模型比较污染与无 Skill 宿主实际安装路径。

## 固定产品目标

各项手工文件为 `<repo>/skills/<id>/references/engineering-practices.md` 和 `<repo>/localized/zh-CN/skills/<id>/references/engineering-practices.md`，并更新对应 SKILL.md/既有参考。每项生成总计划的三份公共副本，不能手工编辑副本。topic 拼成 `<id>:<topic>`，每项两卡是本轮具体内容划分，而非跨项目数量制度。

| repo / id | topic |
| --- | --- |
| frontend-craft / fec-react-project-standard | effect-cleanup, stale-results |
| frontend-craft / fec-vue3-project-standard | watcher-cleanup, stale-results |
| frontend-craft / fec-api-integration | retry-safety, consumer-contract |
| frontend-craft / fec-data-fetching | mutation-retry, query-order |
| frontend-craft / fec-code-review | evidence-severity, review-scope |
| frontend-craft / fec-testing-strategy | risk-layer, real-boundary |
| frontend-craft / fec-security-review | input-trust, secret-boundary |
| frontend-craft / fec-dependency-upgrade | compatibility, artifact-consumer |
| backend-craft / bec-architecture-design | failure-units, reversible-change |
| backend-craft / bec-api-design | idempotent-intent, compatibility-window |
| backend-craft / bec-auth-security | verified-context, object-scope |
| backend-craft / bec-database-design | migration-compatibility, query-bounds |
| backend-craft / bec-transaction-management | commit-ambiguity, replay-boundaries |
| backend-craft / bec-observability | correlated-errors, safe-diagnostics |
| backend-craft / bec-testing-strategy | fault-matrix, real-integration |
| backend-craft / bec-code-review | evidence-severity, compatibility |
| backend-craft / bec-dependency-management | platform-compatibility, artifact-consumer |
| backend-craft / bec-spring-boot-project-standard | validation-effects, lifecycle-boundary |
| backend-craft / bec-fastapi-project-standard | lifespan-ownership, cancellation-boundary |
| backend-craft / bec-gin-project-standard | abort-return, context-lifecycle |
| backend-craft / bec-axum-project-standard | rejection-contract, state-lifecycle |
| backend-craft / bec-drogon-project-standard | filter-continuation, callback-lifetime |

产品内容测试复用本仓已有 frontmatter/YAML 工具读取卡片，针对本表校验自己的 ID/字段/锚点；核心八卡和来源与已安装 common 的同字节副本比较，不复制第二套规范或新增公共 SDK 验证 API。

## B1：精确候选与生成资源接入

**Files:**
- Modify: `frontend-craft/package.json`, `pnpm-lock.yaml`, `src/install/shared/snapshot-declarations.ts`。
- Modify: `backend-craft/package.json`, `pnpm-lock.yaml`, `src/content/snapshot-declarations.ts`。
- Generated: 两产品 common-content.lock.json、完整 cc 树/混合索引、22入口的 references/common 三文件。
- Create: `frontend-craft/tests/install/engineering-snapshot.test.ts`, `backend-craft/tests/content/engineering-snapshot.test.ts`。

**Interfaces:**
- 消费 A3 `readMethodResource(root,'engineering-practices',language)` 及六方法 SnapshotDeclarations；签名不变。
- 前端8/后端14目标分别加一条 domainMethods 正文映射和两条 extraResources JSON映射。既有方法、extraResources、retiredIds 保留。
- 两产品同步来自实际安装的新 common tarball，不从兄弟源码目录生成最终副本。新增未发布候选的工作归档与最终黄金归档分开存储。

- [x] Step 1：写内容来源/数量断言，先在原产品副本观察缺新资源 RED。
  ```ts
  assert.equal(ccCatalog.skills.length, 21);
  assert.equal(ownTargets.length, product === 'frontend' ? 8 : 14);
  assert.deepEqual(generatedCore, installedCommonCore);
  assert.deepEqual(generatedRules.rules.map(x => x.id).sort(), CORE_IDS.slice().sort());
  ```
  Run: 前端 `pnpm exec node --import tsx --test tests/install/engineering-snapshot.test.ts`；后端对应 `tests/content/engineering-snapshot.test.ts`。
  Expected: 缺资源 RED；没有修改旧保护断言或改为只检查文件名。
- [x] Step 2：在 common 运行实际 `pnpm pack`，产物放新任务工作目录；用已有 local-registry.ts 和临时项目级 scoped registry 精确更新两产品依赖。原 .npmrc/策略不得被覆盖；记录本轮临时修改和真实SRI。候选暂不公开发布。
  Expected: 两产品 package dependency 精确相同，无 file/link/邻仓引用，golden旧包未被覆盖。
- [x] Step 3：添加映射，分别运行 `pnpm run sync:common`、`pnpm run check:common`；确认 source 包中的双语正文及两个 JSON 完整后再接受生成结果。
  Expected: 21/74/42、三文件同字节、所有映射纳入来源锁；既有领域 metadata/适用范围/查询未丢失。
- [x] Step 4：局部快照测试和两产品 typecheck PASS，记录同步差异。B2/B3 尚未完成的本地卡不假造占位正文，先不生成指向它们的 SKILL 导航。
  建议 `feat(craft): deliver shared engineering references from the pinned candidate`，不提交。

## B2：八项前端实践与真实 React 案例

**Files:**
- Create/Modify: 本表八个 frontend 入口的双语本地参考、SKILL和相关旧参考。
- Create: `frontend-craft/tests/content/engineering-practices.test.ts`。
- Create: `frontend-craft/skills/fec-react-project-standard/examples/engineering/{request-view.mjs,request-view.test.mjs,package.json,pnpm-workspace.yaml,pnpm-lock.yaml,README.md}` 及中文同代码/锁。
- Create: `frontend-craft/tests/engineering/react-state.test.ts`, `scripts/verify-engineering.ts`；维护 `verify:engineering` 命令及必要的任务输出 ignore。

**Interfaces:**
- 消费 B1 三公共资源和总计划卡片格式，不改变 runtime applicability/推荐算法。
- 产品维护函数 `verifyEngineeringExamples({root:string,prepare:boolean}):CaseEvidence[]` 只拥有 EP-UI-01；报告沿用总计划格式，准备/缺环境/失败退出码同 A5。
- 样例导出真实组件 `RequestView({requestId,load})`；`load(id:string,options:{signal:AbortSignal}):Promise<string>` 是可控外部边界，成功结果显示在 `role="status"` 节点。测试以 rerender 切换 A/B，卸载后检查传入 signal 已取消，不依赖 React 对已卸载 setState 是否报警。
- 缓存为本任务 reports/临时目录，记录 source+lock hash；正常测试只使用匹配的准备环境，否则 MISSING，不自动安装。样例自有 pnpm-workspace 标记避免安装误改父产品 lock，依赖不进入产品运行时。

- [x] Step 1：写八入口 topic/条件/本地闭合断言，然后补正文。针对现有 API 指导中“429/5xx/断网即可重试”的宽泛表达增加幂等、请求意图、预算和用户恢复条件；不是仅在末尾追加一段相互矛盾说明。
  Expected: 缺卡 RED →8×2语言卡片与公共导航 PASS；Vue清理API按实际版本注明，未要求迁移框架。
- [x] Step 2：用真实 React 渲染建立可控 Promise A/B 顺序和卸载测试；不靠真实网络/任意sleep。先让缺陷分支晚到A覆盖B或未取消资源，观察命名断言 EP-UI-01 RED。
  真实测试名固定为 `newer request survives a late older result` 与 `unmount cancels owned request`；在 act 内按 B→A 完成后断言：
  ```js
  assert.equal(view.getByRole('status').textContent, 'result-B');
  // 在独立卸载用例中保存 load 收到的 signal，然后 unmount：
  assert.equal(requestSignal.aborted, true);
  ```
  Expected: 已准备且真正执行 React/DOM 的业务失败；导入失败、零用例或只有控制器单测不算此案例证据。
- [x] Step 3：实现当前请求/关闭责任的最小修复，使用实际 act/Testing Library 更新后断言，保留缺陷开关、同组用例和默认受保护版本。精确依赖版本在准备前核验兼容 Node22；锁文件和代码双语同字节，源码不产生 node_modules/build 缓存。
  Expected: 真实组件状态与资源断言 GREEN；明确 JSDOM不是浏览器E2E/桌面GUI。
- [x] Step 4：验证维护器缺参数、无准备环境、准备hash过期、零测试/全跳过反例；显式 `pnpm run verify:engineering -- --prepare` 后再运行不带 --prepare 的复验。只安装独立样例锁定依赖。
  Run (frontend): `pnpm exec node --import tsx --test tests/content/engineering-practices.test.ts tests/engineering/react-state.test.ts tests/project/inspect.test.ts`。
  Expected: 八入口完整，React真实案例PASS、inspect现有行为不变。
- [x] Step 5：人工核对本地评审/测试策略与已有职责不冲突，记录实际覆盖。建议 `feat(frontend): integrate conditional engineering decisions and async-state evidence`，不提交。

## B3：九项服务工程实践与 HTTP 幂等案例

**Files:**
- Create/Modify: 本表 backend 基础九项双语本地参考、SKILL/practice。
- Create: `backend-craft/tests/content/engineering-practices.test.ts`。
- Create: `backend-craft/skills/bec-api-design/examples/engineering/{go.mod,server.go,server_test.go,README.md}` 及中文同代码。
- Create: `backend-craft/tests/engineering/idempotency.test.ts`, `scripts/verify-engineering.ts`；维护 `verify:engineering` 命令。

**Interfaces:**
- 同名维护函数签名复用 B2约定，但此仓只拥有 EP-SVC-01；不反向导入 common 仓库脚本。
- 示例使用 Go标准库 net/http/httptest，内存状态明确归本进程所有；提供可控“效果提交后响应失败”的注入点，固定 key+请求意图指纹，不使用sleep模拟提交。

- [x] Step 1：钉住九项自己的两卡、来源/例外，权限上下文来自已验证身份、数据库/消息提交边界及安全诊断不能被重试吞掉；先观察缺内容 RED，再写原创卡片与正确导航。
  Expected: 九项内容契约 PASS，无 HTTP/DB义务反向注入通用语言库。
- [x] Step 2：建立真实HTTP测试：同key同意图重试只产生一次副作用并复用结果；同key不同意图拒绝；并发相同请求结果一致；首次失败响应不能成为无限重放许可。先运行缺陷分支验证 EP-SVC-01业务RED。
  原生 Go 测试名固定为 `TestRetryAfterCommittedResponseFailure`、`TestSameKeyDifferentIntentRejected`、`TestConcurrentReplayHasOneEffect`。通过真实 httptest 客户端断言成功体一致、副作用计数为1；不同意图响应409且计数不增加。计数由样例测试可注入的效果边界观察，不从模拟 HTTP 返回值推断。
  Expected: 非零状态来自实际HTTP/计数断言；不是缺Go工具或任意定时器。
- [x] Step 3：实现内存范围内的幂等/意图处理，保留受保护默认行为。README说明状态码是样例契约、重试条件和预算，不能宣称数据库、消息或多进程exactly-once。
  Run (backend): `pnpm exec node --import tsx --test tests/content/engineering-practices.test.ts tests/engineering/idempotency.test.ts`；缺宿主工具用显式准备的Docker命令。
  Expected: 实际命名用例GREEN、工具/输入hash/日志可复验。
- [x] Step 4：维护器判定反例与离库目录执行通过，记录内存/HTTP范围及未运行数据库边界。建议 `feat(backend): integrate failure contracts and idempotency evidence`，不提交。

## B4：五服务框架适配与私有参考资料回归

**Files:**
- Create/Modify: 本表 backend 五框架的双语本地参考、SKILL/practice/verification，保留既有 minimal 示例。
- Modify: `backend-craft/tests/content/engineering-practices.test.ts`, `tests/install/lifecycle.test.ts`, `tests/install/migration.test.ts`。
- Modify only if needed: 三仓内容/打包验证声明和既有 CI 文件；不重写安装器/事务/宿主路径。

**Interfaces:** 后端专属增强14项完整；A7桌面+本任务五服务构成原七框架适配。No-Skill资源仍由已实现的 planCore 私有 reference-skills 交付，不产生 common consumer。

- [x] Step 1：对五框架的 topic、实际框架机制和来源做缺卡 RED，补本地卡；框架只解释落点，不复制整段公共工程正文。Drogon合成角色头仍明确非鉴权实现。
  Expected: 五项静态契约通过；没有把抽取/Filter/异常/上下文生命期写成相同万能模板。
- [x] Step 2：重跑已有五服务真实样例：宿主 FastAPI，以及已有 `pnpm run verify:frameworks -- --framework 'gin,drogon,axum,spring-boot'` 的隔离Docker；默认不准备，确实缺环境时使用显式 --prepare并分开记日志。桌面 A7结果一起汇总。
  Expected: 有缺陷与修复的业务断言真实执行；未知依赖不能转成“原样例仍通过”。GUI/外部DB边界继续单列。
- [x] Step 3：扩充三类无 Skill 宿主 × local/global × en/zh-CN 安装回归，检查 private cc/域参考内新增三文件、局部卡、真实source版本及链接；原生Skill目标也检查相同来源但不能被产品独占认领。
  ```ts
  assert.ok(exists(privateReference + '/references/common/engineering-practices.rules.json'));
  assert.equal(manifest.common, undefined); // no-Skill宿主
  assert.match(read(editedRule), /USER_EDIT/); // update/partial uninstall保护
  ```
  Expected: 新文件确实落在参考目录，用户编辑被保留、部分卸载保留所有权、最终恢复/完整卸载有效。
- [x] Step 4：检查旧候选消费者/新内容冲突，断言安装零写入且不自动更新另一产品；不放宽账本以省略协调升级。运行相应 migration/lifecycle/snapshot回归及typecheck。
  Expected: 原安装保护成立；规则内容增强不改变CLI退出码/inspect/旧名策略。
- [x] Step 5：登记全部36入口及其结构/案例/模型覆盖，未覆盖语义显式标注。建议 `feat(craft): adapt shared practices to framework boundaries`，不提交。

## B5：新材料对照、独立评分与纠偏

**Files:**
- Evidence: 本轮 `evals/new/`, `evals/anonymous/`, `evals/scoring/`，旧回答只读保留。
- Create: `craft-common/docs/verification/engineering-practices/model-evaluation.md`，可链接已脱敏原始回答/材料清单。
- Modify only for verified failures: A/B相应原始规范与其生成/案例，不为提高分数改题或评分。

**Interfaces:** 消费 A1 冻结的四任务/四旧回答/固定rubric以及当前对应材料。每条评分为 `{caseId,answerId,criteria:[{id,pass,evidence}],criticalViolations:[],notes}`；独立评分者在揭盲前不知道old/new标签，不让回答者自评。

- [x] Step 1：按A1相同选材算法、语言、上限和模型/预算生成新包。若继承模型配置无法匹配或材料越界，保留无效尝试并以同一可用配置重新运行受影响的旧/新一对，不把模型差异算成材料提升。
  Expected: 控制项相同、材料hash差异可解释；没有读取修改后工作区污染旧材料。
- [x] Step 2：执行四份新上下文回答，保存原文与允许的工具轨迹；作者不能先挑选“最好的一次”。对匿名8份答案和固定rubric调用一个独立评分者。
  Expected: 8份有效回答、4×2×4项判定和原文证据，无法证明的评分不自动通过。
- [x] Step 3：实施者核验评分所指证据与任务事实。四份新回答均满足设计观察标准且不新增关键错误；两臂原本都好时报告“未观察到提升”，不制造旧版错误。
  Expected: 仅任务范围内的有界结论，不声称全部36入口/所有模型均验证有效。
- [x] Step 4：有关键失败则修改其负责的内容并重跑对应旧/新配对、真实样例与相关契约；公共八卡变化可能影响四组，按材料依赖重跑。仍未证明时保留NOT PROVEN和原始失败，不进入“全部验收完成”。
  Expected: 关键问题有实际收敛证据，失败记录不被覆盖。
- [x] Step 5：汇总独立评分与实施者复核分工，建议 `test(evals): record bounded engineering-practice comparisons`，不提交。

## B6：最终精确归档、双平台门禁与一次独立评审

**Files:**
- Modify: 三仓 README/README.zh-CN.md（现有文件）、common docs/consuming-common.md、产品维护/迁移文档及确需更新的 CI 命令。
- Generated: 新候选tarball/两产品精确锁和common-content.lock.json；独立包及native归档。
- Create: `craft-common/docs/verification/engineering-practices/{coverage.md,examples.json,artifacts.json,final-review.md,remediation.md}`。
- Modify: 三仓现有 packaging/资源闭合测试和必要的本轮静态证据校验。

**Interfaces:** artifacts.json 记录精确路径/字节数/SHA512；coverage.md 为36入口分别列结构、原生案例与模型任务证据。source/ref/language语义不能由目录总数替代。

- [x] Step 1：新增/更新实际归档断言：每个增强入口都包含三公共文件与本地卡；十例的声明文件、锁、源、README完整，源代码/锁双语同字节；各自移出仓库与兄弟Skill后本地引用闭合。工程样例不携带node_modules、target/build、pycache、.class/.o等编译缓存；测试不能仅检查package.json.files字符串。
  Expected: 缺任一新增资源的归档先RED，修正whitelist/生成后GREEN；无公共来源漂移。
- [x] Step 2：先完成会进入归档的用户文档，再建立**本轮**最终黄金common包。若B5改过common内容，重建工作包/重启local registry/刷新两产品真实SRI后sync/check；保留此前工作归档标识，不覆盖上轮黄金包。除pnpm已知manifest规范化外核对发布文件集合和字节。
  Expected: 两产品精确版本及SRI相同，完整catalog/digest一致；不能以旧缓存通过代替新包验证。
- [x] Step 3：对稳定源码运行三仓 lint/typecheck/build/test；common pack:skills及pack，两产品pack:all，frontend另typecheck:openclaw；backend `pnpm run verify:coexistence -- --frontend-root ../frontend-craft` 必须真实39项执行，不采用其默认SKIP代替。命令传播各自退出码，长日志进本任务目录；不能用最后Get-Content的0隐藏前面失败。
  Expected: 全量及实际分发门禁PASS，所有条件SKIP单列并由相关专项补足要求，21/74/42不变。
- [x] Step 4：在隔离Linux副本运行同步、案例和相关安装/CLI回归，与Windows结果分别记录。十新例必须有实际运行证据；默认缺工具SKIP不能代替。涉及React真实DOM的用例明确其边界，不宣称完整浏览器E2E；桌面GUI/签名/外部DB仍NOT RUN。
  Expected: 至少Windows/Linux均有真实相关路径执行，平台不能执行的具体范围和补充专项可追溯。
- [x] Step 5：唯一最终整体独立评审使用 fresh context，读取A1实际基线与最终当前文件、设计/计划/证据，覆盖本轮所有源码、生成声明、双语与未跟踪新文件，不只看HEAD diff。不得把旧评审当本轮，也不复审无关上轮代码为新改动。按有证据的重要问题统一修复，保留原报告并另列修复/回归；改动涉及哪个门禁就重跑相关门禁和最终稳定源检查。
  Expected: 无未处理的已证实Critical/Important；覆盖空白有明确处理或NOT RUN边界。
- [x] Step 6：清理本任务项目级临时registry、localhost tarball URL和精确候选例外，原策略文件字节恢复、保留真实SRI并停止服务。直接调用同一sync脚本只读复核清理后的已安装快照；公开源frozen安装待实际发布后验证。最终git diff --check/本轮增量核对通过。
  Expected: 无持久临时源/相邻源码依赖、无用户文件丢失；包和logs保留用于复现，不能伪称公开可下载。
- [x] Step 7：交付三仓职责/文件、规则和来源取舍、十例/四对照/平台/分发/共存结果、迁移顺序与剩余风险。给出Conventional Commit建议而不提交；ledger标记本轮实际完成条件。

## 自审结果要求

全范围索引对应 A1–A7/B1–B6；CORE八卡、本地卡、CaseEvidence、脚本导出名与字段必须与总计划一致。五项Review Focus逐项有断言和真实路径。本轮计划不运行产品测试或模型评估；任何复选框仅在实际执行得到证据后勾选。
