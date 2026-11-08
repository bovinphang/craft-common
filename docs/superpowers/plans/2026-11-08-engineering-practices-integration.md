# 成熟工程实践分层融合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task using the user's preserved native execution method. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在三仓既有入口中融合可追溯、按条件适用、可验证的工程规范，保持单一公共源和完整独立分发。

**Architecture:** A 计划完成公共规范、同步安全和语言/桌面基础；B 计划消费该接口完成产品场景、模型对照、分发与评审。公共规则映射只有八张 core 卡，语言与场景细则属于当前入口，不建立跨产品正文依赖。

**Tech Stack:** TypeScript/ESM、Node >=22、pnpm 12.4.1、esbuild、现有 node:test；语言原生工具及隔离 Docker 样例。React 样例测试依赖只在自己的准备环境中。

**Spec:** [已批准设计](../specs/2026-11-08-engineering-practices-integration-design.md)。执行者同时读取本索引、对应子计划和设计。

## Global Constraints

- 基线为 `D:\code\github\frontend\ai-coding-craft` 三个本地工作区，包含上一轮全部未提交成果；不以 HEAD/registry 替换，不 pull/reset，不删除上轮任务目录。
- common/front/back 入口数固定 21/74/42；增强的独立入口为 common14 + frontend8 + backend14 =36；两产品都交付完整 common。
- `en`/`zh-CN` 同步；示例代码/锁文件同字节，说明自然本地化。公共原则手工源仅在 common，产品副本由既有快照机制生成。
- 公共 JSON 只含 ENG-CONTRACT、ENG-ERROR、ENG-RESOURCE、ENG-CONCURRENCY、ENG-BOUNDARY、ENG-DEPENDENCY、ENG-VERIFICATION、ENG-OPERABILITY；不得有 ownerSkill 或跨入口锚点。
- `required/recommended/conditional` 是唯一规则级别；核心和本地卡均覆盖风险、适用/不适用、决策、例外、正反示意、验证、来源与案例/未运行状态。
- 既有安装机制、inspect schema/算法、角色和 TaskKind 枚举、旧名映射保持原契约；本轮只扩展共享方法、内容、生成和相应验证。
- 十组真实行为案例及四组旧/新材料配对任务均不可省略；环境失败不是业务 RED，结构检查不是模型效果。
- 新候选建议 `2.0.0-dev.20261108.1`，占用时递增最后后缀；保留旧候选及归档。frontend3.0.0、backend1.0.0 保持；两产品精确依赖同一新候选、同一实际 SRI。
- 每张规则按问题组织，引用一手来源；原创表述/代码，未知许可不复用非平凡表达；企业风格不能自动覆盖项目安全、兼容和工具链事实。
- 维护脚本不注册新用户 CLI/bin；检查和安装不自动准备样例依赖；准备操作显式执行，源只读，缓存/日志在任务或 reports 目录。
- 顺序实施沿用当前会话 native 模式；只有四组模型对照（8份回答）、一个独立评分者和最后一次整体评审使用独立上下文，不为每个任务派实现/评审代理。
- commit/push/publish 无授权；每任务给出 Conventional Commit 建议即可，不执行提交。阶段门禁通过不表示公开源已提供候选。

## Review Focus

1. 增量生成碰到非原七项 metadata、自定义字段和新版本：必须保留所有入口/适用范围并统一版本；A2、A3 的 clone/零写入/幂等测试覆盖。
2. 公共规则目录在独立包中出现无法解析的其他入口锚点，或本地卡跨产品依赖：A3 的八锚点和 B6 的真实归档/离库验证覆盖。
3. 有缺陷样例编译失败、零测试、全跳过、缺依赖却被记成 RED/GREEN：A4–A7、B2–B3 及 B6 验证判定器反例覆盖。
4. 来源冲突导致强制 Google 异常/TS 风格、SAL 或不安全写重试：A3/A6、B2 和 B5 的冲突反例与固定评分覆盖。
5. 新规范在无 Skill 宿主、部分卸载或旧公共消费者中丢资源/扩大权限：B4、B6 实际安装、用户编辑、版本冲突和共存覆盖。

## 任务顺序与恢复

1. [A：规范源、同步与公共入口](2026-11-08-engineering-practices-common.md)：A1–A7。
2. [B：场景、对照与交付](2026-11-08-engineering-practices-products.md)：B1–B6。

仅在 A7 公共阶段门禁通过后开始 B1。源码实现顺序保持上述依赖；独立的只读检查可并行，不能在测试/归档读取同一树时重建或改写该树。

新 ledger 位于 common `.superpowers/sdd/2026-11-08-engineering-practices-integration/progress.md`，记录命令、退出码、实际数量及 `Ruling: 决策 — 理由 — 代价`。不得复用上轮 ledger 作为本轮结果。

## 文件职责与共同契约

| 位置 | 职责 |
| --- | --- |
| common `methods/engineering-practices.md` 及中文镜像 | 八组公共原则唯一正文 |
| common `methods/engineering-practices.{sources,rules}.json` | 来源记录、八张 core 卡元数据；中文为生成副本 |
| common `scripts/lib/engineering-content.ts` | 本轮公共源与公共入口内容检查，维护代码，不新增 SDK 验证 API |
| common `scripts/lib/method-sync.ts`、`scripts/method-definitions.ts` | 现有同步器的显式定义、预检/增量规划；CLI 薄壳 |
| common `scripts/engineering-targets.ts` | common14 入口和公共副本目标的显式声明 |
| 各增强 Skill `references/engineering-practices.md` | 本入口语言/场景卡唯一正文 |
| 产品现有 snapshot-declarations.ts | 8/14 专属入口的公共资源声明；不复制同步算法 |
| 三仓 `tests/engineering/` 和 `scripts/verify-engineering.ts` | 本仓样例验证和证据；不是产品运行时依赖 |
| common `tests/evals/engineering-practices/` | 四组预登记任务、固定评分、选材清单 |
| common `docs/verification/engineering-practices/` | 本轮覆盖矩阵、原始对照索引、验证与最终评审 |

### 内容数据约定

`sources.json` 为 `{schemaVersion:1,sources:[...]}`；`rules.json` 为 `{schemaVersion:1,rules:[...]}`。字段按设计§7；source ID 使用小写 kebab-case，URL 为无凭据 HTTPS，`licenseStatus` 为 `verified|unknown`，`adoption` 为 `adopt|conditional|defer|reject`；unknown 仅允许原创摘要/链接。`limits`、`versionScope` 必须非空；没有可确定版次时写 unknown，不编造 revision。

公共八卡 ID 是 `<a id="ENG-…"></a>` 的显式锚点，rules.kind 恒为 core。`caseIds` 是十个案例 ID 的证据标识；仅本入口拥有的案例需要本地文件，不要求携带其他入口的样例。

本地参考 Markdown 的 YAML frontmatter 为 `practiceCards: [{id,level,sourceIds,caseIds,evidence}]`，`evidence` 为 `case|review-only|not-run`。正文每卡具有同 ID 显式锚点和风险、适用/不适用、决策、例外、正反示意、验证小节。ID 是 `<skill-id>:<topic>`，英文中文元数据等价、锚点一致。这里只确定静态文档格式，不形成规则执行 DSL。

生成文件固定为每入口 `references/common/engineering-practices.md` 和同目录 `engineering-practices.sources.json`、`engineering-practices.rules.json`。本地正文链接公共章节时使用 `common/engineering-practices.md#ENG-…`，不引用 methods、tests 或兄弟 Skill。

`CaseEvidence` 的共享报告格式如下，仅是三仓维护报告的结构约定，不增加 SDK 导出或相邻仓脚本依赖：

```ts
type RunEvidence = {
  exitCode: number | null;
  testNames: string[];
  tests: { total: number; passed: number; failed: number; skipped: number };
  assertionMarkers: string[];
  logPath: string;
};
type CaseEvidence = {
  caseId: string;
  status: 'PASS' | 'FAIL' | 'MISSING' | 'NOT_RUN';
  platform: string;
  toolVersions: Record<string, string>;
  sourceHash: string;
  commands: string[];
  broken?: RunEvidence;
  fixed?: RunEvidence;
  scope: string;
  reason?: string;
};
```

只有已编译/准备完成、broken 实际出现指定业务断言失败、fixed 同组非零用例通过才可记 PASS；不以一行 PASS 文本代替真实测试执行。

### 验证命令约定

任务的局部测试统一用现有入口：在标明仓库运行 `pnpm exec node --import tsx --test --test-concurrency=1 <test-files>`。每任务下面列出确切文件和 PASS 条件；全量命令在 B6。导出的维护函数必须有 CLI 主入口守卫，导入不能写工作树。

任务内新接口只在所在子计划定义一次，后续按 Interfaces 消费。提交步骤由本节明确替换为“记录建议，不提交”。

## 自审映射及执行交接

设计§1–4与基线/范围：A1；§5/7/8：A2–A3；§6 common/§9语言：A4–A7；§6产品/§9场景：B2–B4；§10：A1/B5；§11：B1/B6；§12全分发/平台/评审：A7/B6。

执行前必须保存非 HEAD 的真实本轮基线，防止最终审阅遗漏原本未跟踪文件。现有供给策略会核验未发布包，使用上轮已验证的临时本地源流程，结束清理；不以公共安装失败作为业务测试失败，也不保留永久例外。

- [x] 计划自审：章节覆盖、步骤可判定、跨任务签名、五项 Review Focus 对应测试、文档体量。已修正 metadata 未知字段断言位置、分阶段本地卡测试边界、八案例维护命令及报告字段；补足 React/HTTP 实际观测断言。计划主要记录文件、接口和验收决策，未展开实现函数体。
- [x] 用户审阅计划确认后，使用 executing-plans 顺序实施；保留已选择的 native 方式，不重复要求用户选择执行方式。
