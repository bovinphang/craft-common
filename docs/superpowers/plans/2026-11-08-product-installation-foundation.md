# 产品安装底座与跨领域能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在三个本地仓库统一产品安装机制，使跨领域语言、桌面和服务框架能力按任务组合交付。

**Architecture:** 采用已批准的方案 B。common 提供机制和跨领域能力，前后端提供领域内容、产品声明及必要扩展。分两份顺序执行、可独立验收的计划，不在安装器抽取时同时更名大批内容。

**Tech Stack:** TypeScript / ESM、Node >=22、pnpm 12.4.1、esbuild、ESLint、tsx/node:test。

**Spec:** [已批准设计](../specs/2026-11-08-product-installation-foundation-design.md)。执行者必须同时阅读设计与本索引。

## Global Constraints

- 唯一实现基线是 `D:\code\github\frontend\ai-coding-craft` 下三个本地 checkout，不自动 pull、reset 或替换为 registry 包源码。
- 保留用户后续工作区修改；当前 HEAD 仅用于定位起点，不能据此丢弃新修改。
- 不新建第四仓库或统一 CLI；common 不反向依赖产品。
- `en` 与 `zh-CN` 同步；首期两个产品交付相同完整公共目录，不做公共子集安装。
- 用户修改和未知资源默认保护；公共文件不接受 force 覆盖或删除。
- 发布、推送、部署和 commit 均不包含在当前授权中；仓库规则要求 commit 前确认。任务验收后只准备 Conventional Commit 建议。
- 不因设计批准就假定实现通过；仅按实际输出记录 PASS/FAIL/MISSING/NOT RUN。

## Review Focus

1. 同一配置被不同公共目标的产品并发修改：A5/A9 验证串行协调或冲突无写入。
2. 目录或身份中的同名/大小写路径：A2/A4/A5 验证真实路径边界，不扩大 home 授权根。
3. 公共版本升级但正文未改：A9/B8 验证精确版本与摘要冲突，不能以内容相同绕过账本。
4. 嵌套 Tauri 工程中的普通 Rust 库：B5/B6 验证局部角色及推荐，不将全仓库视为服务端。
5. 单独分发 Skill 丢失参考或缺少工具：B3/B4/B8 验证资源闭合，缺环境不得记作框架行为通过。

## 本地基线与版本决策

记录时间：2026-11-08，分支均为 main。

| 仓库 | 本地 HEAD | 本地源码版本 |
| --- | --- | --- |
| craft-common | `3a7625bb47db450c310b26a6a25050715bfe6195` | 1.0.1 |
| frontend-craft | `036f2b2a904469917a2e55cede8d21366e5f3263` | 3.0.0 |
| backend-craft | `e1720b2ce16ead22776a93ef750914811e71cc09` | 1.0.0 |

计划编写前，前后端工作区干净；common 只有本次设计文档未跟踪。计划与设计都尚未 commit。

开发包候选：common `2.0.0-dev.20261108`；两个产品保留本地版本 frontend `3.0.0`、backend `1.0.0`，精确依赖同一候选公共版本。选择 major 候选是为公共 Skill 名称迁移和能力扩容划清边界，不是公开发布决定。若执行时该候选被占用，改用递增 prerelease 并同时更新两产品、生成锁和验证记录；不得覆盖公开版本。

公开源的旁证仅供未来发布检查：2026-11-08 查询 common 的 latest 返回 1.0.1，frontend 返回 2.9.0，backend 请求返回 404；这不决定本地代码状态，也不证明所有历史版本不存在。本次不执行 publish。

本地候选 tarball 联调复用 common 的 `scripts/local-registry.ts`：在任务使用的临时目录生成包与 npmrc，通过当前 pnpm 进程的配置接入；不改全局 registry、不用相邻源码软链接。每次重打同版本 tarball 后重新安装并记录真实 integrity，不把旧缓存成功当成新包验证。

## 两份实施计划

1. [A：统一安装引擎](2026-11-08-product-installation-foundation-engine.md)：A1–A9。先固定本地行为，再抽取机制、迁移两产品、合并内容同步机制并验证兼容。
2. [B：跨领域能力与框架](2026-11-08-product-installation-foundation-capabilities.md)：B1–B8。仅在 A9 通过后开始，执行十二项入口迁移、七个专项、工程识别与完整分发验证。

当前推荐由同一执行者按依赖顺序推进：A 中公共接口与两产品适配耦合紧，连续维护上下文能减少接口偏差。是否采用逐任务独立实现/审阅，由用户选择；计划阶段不自动开始实现。

## 执行与验证约定

- 文件路径以本地根目录为基准，前缀 `craft-common/`、`frontend-craft/`、`backend-craft/` 是三个不同仓库，不是 monorepo workspace。
- 每个任务先检查所列当前模块与周边调用，再按 RED -> GREEN 验证；纯行为基线任务按当前实现通过，不制造假失败。
- 集中测试命令优先使用现有 scripts。现有测试发现器不支持按文件过滤，任务中的 `pnpm exec node --import tsx --test --test-concurrency=1 ...` 仅复用同一 node:test 入口做局部 RED/GREEN，不新增框架或替代仓库全量验收。
- 未特别说明时，命令在任务的目标仓库执行。`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 是实际存在的命令，不使用示例中的 `type-check`。
- 阶段门禁才跑完整分发和平台矩阵；中间任务只跑相关回归。已有缺陷先记录及定位，不把它混入重构后再声称由本次引入。
- 检查失败时先定位根因；不得靠删除失败断言、降低安全保护或把 missing 改成 passed 过关。
- 分支在获准执行后按当前工作区/附属 worktree 情况决定，优先复用合适 checkout；新隔离目录遵循 using-git-worktrees，不在计划阶段创建。

## 最终完成条件

- [x] A9 与 B8 均通过；所有未运行专项列出缺失环境与影响，不能冒充全平台验收。
- [x] 三仓改动与生成来源可复现，无相邻源码依赖、临时 registry 残留或手工修改快照。
- [x] 独立评审完成，剩余问题、未验证项与本地包来源写入验证记录。
- [x] 用户收到三仓文件/职责变化、验证结果、迁移顺序和剩余风险。
- [x] commit、公开发布、推送仍待各自明确授权。

执行状态（2026-11-08）：已授权的实施与验证完成，最终证据见docs/verification/cross-domain-capabilities.md。复选框不表示执行commit、push或publish；这些仍待明确授权。
