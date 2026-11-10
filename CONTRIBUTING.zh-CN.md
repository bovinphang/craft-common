# 贡献指南

[English](CONTRIBUTING.md) · [文档导航](docs/README.zh-CN.md)

欢迎贡献公共方法、语言规范、集成改进、文档及测试。先阅读受影响模块和已有产品契约，保持变更聚焦。

## 开发准备

要求 Node.js 22+、Git 和 pnpm 12.4.1。使用已有 pnpm-lock.yaml 安装依赖。

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

项目使用 TypeScript、ESM、esbuild、TypeScript 声明生成和 Node.js node:test。[工程结构](docs/project-structure.zh-CN.md)列出模块职责。

## 内容维护与双语政策

- 英文作为公共文档主入口，简体中文同步 API 名称、数量、路径、版本、命令、默认值和能力边界。
- 维护 methods/ 与中文镜像后运行 pnpm run sync:methods，再通过 --check 检查生成副本。
- Skill 入口、领域参考、工程样例及适用条件应同时检查中英文版本。
- 公共文件与方法在本仓库维护，产品通过精确依赖与 sync:common 生成副本和来源锁。
- 历史设计、发布及验收记录保留原始证据。dist、skill-packages、npm-packages 由脚本生成。

## API 与安装协议变更

导出接口维护在 src/index.ts。更改类型或行为时检查两产品调用者、旧清单、混合索引和已有内容。安装相关改动应验证显式会话、预览零写入、配置条目所有权、精确公共匹配、并发与恢复。

测试应使用临时工作区和隔离 home。CLI 包管理器测试通过注入 runner、模拟来源和命令输出验证生命周期。

## 验证清单

```sh
pnpm lint
pnpm typecheck
pnpm run sync:methods -- --check
pnpm build
pnpm test
pnpm run pack:skills
pnpm exec npm pack
```

检查实际公共库归档及 21 个独立 Skill 包中的双语入口、方法引用、脚本、样式、样例锁文件和许可证。对于工程样例变更，再执行对应 verify:engineering 检查，记录工具与依赖准备状态。

源码目录和归档验证分开记录。产品接入变化还需在产品仓执行 sync:common、check:common、构建、测试及共存验证。

## 提交与评审

- PR 描述说明动机、影响范围、兼容性及验证命令。
- 行为变更补充适当回归覆盖，文档变更检查链接和示例。
- 同步用户可见的双语说明与 Changelog。
- 说明失败、缺工具、跳过及未执行的验证。
- 使用 Conventional Commits，例如 docs: refresh common guides。
- 保留现有用户改动，避免提交生成包、依赖目录和敏感信息。

## 发行约定

公共包先发布，消费者随后发布。使用新精确版本与已验证归档，核对真实公开 SRI、产品锁及干净环境安装。公开状态见 README，历史 2.0.0 发行流程见[发布记录](docs/releases/2.0.0.md)。

通过 [GitHub Issues](https://github.com/bovinphang/craft-common/issues)反馈问题时，附上版本、系统、受影响产品与脱敏复现步骤。
