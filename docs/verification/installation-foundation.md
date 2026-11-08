# 公共安装底座实施验证

基线日期：2026-11-08。以三个本地 checkout 为准，分支均为 `feature/shared-product-foundation`，尚未提交或发布。

## A1：已有行为基线

三个仓库分别运行 `pnpm build`，成功后运行 `pnpm test`：

| 仓库 | 测试总数 | 通过 | 失败 | 跳过 |
| --- | --- | --- | --- | --- |
| craft-common | 77 | 77 | 0 | 0 |
| frontend-craft | 316 | 316 | 0 | 0 |
| backend-craft | 243 | 204 | 0 | 39 |

后端跳过项保留原测试的环境条件，不视为实际功能验收通过。完整本地输出在 common 的 `.superpowers/sdd/2026-11-08-product-installation-foundation/baseline-*.log`；该目录是忽略的执行记录，不随包发布。

两个产品新增的安装契约夹具固定十五宿主的本地目录与实际 Skill 目标。前端 dry-run 测试新增临时 home/project 目录保持空的断言。配置目录不等于 Skill 目录：Codex 使用 `.agents/skills`，OpenClaw 本地使用项目 `skills`；Copilot、Trae、Cline 不新增标准 Skill 支持。

已保留的产品差异：空全局环境覆盖在前端按缺省处理，后端沿用 nullish 逻辑解析到当前目录；tilde 与相对路径解析同样通过显式 compatibility profile 保留，不在抽取中偷偷改变。

## A2：公共路径机制

首批七项新增测试已观察 RED（公共导出不存在），实现后局部测试 7/7 PASS，`pnpm typecheck` PASS。覆盖十五宿主、全局环境优先级、特殊 Skill 目录、非法输入、声明根 junction、根内链接拒绝和 Windows 路径键。

后续阶段验证只在取得实际输出后追加，不以此文档说明代替运行证据。

## A3–A9：统一产品引擎

公共实现包括独立会话、产品声明与旧清单 codec 协议、共享 JSON/TOML/text 条目算法、配置锁、无 Skill 宿主事务、共享公共资源事务和保护性内容快照同步。两产品安装器不再维护全局规划会话或第二套事务/共享配置算法。前端缓存清理、包管理器操作和内容转换仍属产品策略。

Windows、Node 24.14.1、pnpm 12.4.1 的实际记录：

| 验证 | 结果 |
| --- | --- |
| common lint / typecheck / 全量测试 | PASS，125/125 |
| backend lint / build（包含 typecheck）/ 全量测试 | PASS，206 通过、39 环境条件跳过 |
| 真实本地 frontend CLI 共存矩阵 | PASS，39/39，未跳过 |
| 前端 codec、路径别名、历史配置迁移重点回归 | PASS，最终前端全量结果后续追加 |
| 两产品 sync:common / check:common | PASS，同一精确候选 tarball |

真实矩阵执行 `pnpm run verify:coexistence -- --frontend-root ../frontend-craft`，覆盖十五宿主两种安装顺序、更新及两边分别卸载；Claude/Codex 增加 global 和中文场景，另验证语言冲突时账本和文件保持原样。逐案证据由 backend 的 `reports/backend-craft/coexistence` 生成。

版本冲突测试特意保持 Skill 文件字节相同，仅改变公共包版本，仍在调用产品 adapter 前拒绝且完整目录快照不变。语言和摘要分别验证。其他回归涵盖部分卸载、用户修改、初次安装失败清理、真实进程中断、声明根 junction/根内链接以及 Cline 历史文件转目录的回滚。

候选 `2.0.0-dev.20261108` 未发布。临时项目级 scoped registry 仅用于本地候选产物联调；最终交付前清理配置和 localhost 锁来源。公开 registry 冻结安装必须在候选真实发布后单独验证，本地缓存成功不证明公开可用。
