# craft-common

Craft AI Coding 的公共能力包，由 frontend-craft 和backend-craft 自动交付；用户无需手动安装第三个插件。

公共能力使用 `cc-*` 标识。此仓库是公共 Skill、资源与方法的唯一维护来源，产品中的对应目录由固定版本生成并校验。

开发要求 Node.js >=22 和 pnpm 12.4.1。使用 `pnpm install`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 校验。

提供可编辑 draw.io、结构化技术图表、源码核验、文档事实同步、诊断、行为保持重构和 TDD 七个公共入口，并包含对应的中英文内容及完整运行资源。

共享安装协议以真实 Skill 目标定位消费者，检查精确版本、语言和内容摘要，在事务中更新产品文件与公共账本；卸载保留其他消费者及用户修改。原生插件双产品去重需另外按 Runtime 验证。

消费和维护约定见[消费指南](docs/consuming-common.md)。公共包和前端 3.0 的公开发布仍是独立发布步骤，仓库中的本地验证不代表 npm registry 已有可下载版本。
