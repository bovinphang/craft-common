# craft-common

> 发布状态更新：craft-common 2.0.0、frontend-craft 3.0.0、backend-craft 1.0.0 均已于2026-11-09（Asia/Shanghai）发布至 npm，版本号不变。


Craft AI Coding 的公共能力包，由 frontend-craft 和 backend-craft 自动交付；用户无需手动安装第三个插件。

公共能力使用 `cc-*` 标识。此仓库是公共 Skill、资源与方法的唯一维护来源，产品中的对应目录由固定版本生成并校验。

开发要求 Node.js >=22 和 pnpm 12.4.1。使用 `pnpm install`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 校验。

提供 21 个双语公共入口：既有七个方法与图表入口、十二个跨领域语言入口，以及 Tauri/Electron 桌面专项。TypeScript、Rust、Go、Java、Python、C、C++ 可用于 UI、桌面核心、原生库、服务或 CLI；能力由工程证据和任务选择，不按产品名称限制语言。

公共安装引擎统一十五宿主的路径、显式规划会话、共享配置所有权、跨产品配置锁及事务恢复。产品保留身份声明、历史清单编解码和内容转换。共享协议以真实 Skill 目标定位消费者，检查精确版本、语言和内容摘要；卸载保留其他消费者及用户修改。原生插件双产品去重需另外按 Runtime 验证。

消费和维护约定见[消费指南](docs/consuming-common.md)。公共包和前端 3.0 的公开发布仍是独立发布步骤，仓库中的本地验证不代表 npm registry 已有可下载版本。

[工程结构与维护入口](docs/consuming-common.md#工程结构与维护入口)说明公共源、方法同步和生成产物边界。frontend-craft 3.0.0 与 backend-craft 1.0.0 均精确依赖正式版本号 `2.0.0`，均已公开发布；公共包不提供独立 CLI。

<!-- engineering-practices-20261108 -->

## 分层工程实践

公开企业经验和语言官方资料按“公共原则 → 语言 → 场景 → 验证证据”融入既有入口。公共八项原则、31条一手来源与适用限制由 [methods](methods/engineering-practices.md) 及其 [来源记录](methods/engineering-practices.sources.json) 唯一维护；不把企业内部偏好直接变为项目强制规则。14个公共入口增强，产品分别补8个前端及14个服务入口，总数仍为21/74/42。

规则级别为required/recommended/conditional；项目兼容、安全及现有工具约定优先。每个增强入口的references/engineering-practices.md给出风险、条件、例外、正反示意和验证。代码/锁双语同字节，说明本地化；关联案例ID不证明该条全部语义。

维护者显式运行`pnpm run verify:engineering`，缺工具按MISSING报告；`--prepare`才准备环境，Docker方式见脚本参数。八个公共案例覆盖七语言及IPC，另两例由产品拥有。真实运行、四组模型对照与结构完整性分别记录，均不代表GUI、数据库或分布式保证。

[变更日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md) · [2.0.0发布步骤](docs/releases/2.0.0.md)。craft-common 2.0.0、frontend-craft 3.0.0、backend-craft 1.0.0 均已于2026-11-09（Asia/Shanghai）发布至 npm，版本号不变。
