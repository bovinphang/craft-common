# 工程结构与维护

[English](project-structure.md) · [文档导航](README.zh-CN.md)

本项目是 TypeScript / ESM 公共库，使用 esbuild 打包及 TypeScript 声明生成，测试基于 Node.js node:test。运行要求 Node.js 22+，包管理器固定 pnpm 12.4.1。

## 模块职责

| 目录 | 职责 |
| --- | --- |
| `src/content/` | 目录、资源闭合、方法、适用条件与产品快照 |
| `src/project/` | 有界工程证据、桌面识别与推荐 |
| `src/install/` | 公共身份、规划、事务与恢复 |
| `src/install/product/` | Runtime 目标、显式会话、条目所有权与产品生命周期 |
| `src/cli/` | 命令调度、交互、包管理器、生命周期与 Claude 缓存 |
| `skills/` | 21 个 cc-* 入口及完整资源 |
| `methods/` | 六类方法源与工程实践来源记录 |
| `localized/zh-CN/` | 中文 Skill 与方法镜像 |
| `scripts/` | 方法同步、构建、测试、独立包与工程验证 |
| `tests/` | Node.js 单元、集成测试与隔离行为样例 |
| `docs/` | 用户、开发者指南与历史证据 |

src/index.ts 为公共导出入口，package.json 的 exports 指向 dist/index.js 和 dist/index.d.ts。公共包未声明 bin；产品负责提供终端入口。

## 生成内容边界

先维护 methods/ 及中文镜像，再同步 Skill 中的嵌入副本。工程实践来源与规则记录在对应 JSON 文件中，领域参考在各 Skill 内维护。

```sh
pnpm run sync:methods
pnpm run sync:methods -- --check
```

同步预检双语资源并增量更新，保留 21 个入口、适用条件及自定义字段。产品再通过各自 sync:common 生成副本和来源锁。dist、skill-packages 和 npm-packages 为生成输出，由脚本维护。

## 日常检查与打包

```sh
pnpm lint
pnpm typecheck
pnpm run sync:methods -- --check
pnpm build
pnpm test
pnpm run pack:skills
pnpm exec npm pack
```

test 脚本递归发现 tests/**/*.test.ts，串行执行。build 生成 ESM bundle 和声明。pack:skills 生成 21 个双语独立 Skill 包及 index.json；npm pack 生成公共库归档并触发 prepack 构建。

使用 npm 打包器核验实际归档中的样例锁文件。2.0.0 发行记录包含 pnpm 12.4.1 打包嵌套 pnpm-lock.yaml 的已知限制。

## 工程实践样例

```sh
pnpm run verify:engineering
pnpm run verify:engineering -- --prepare
```

verify:engineering 使用隔离样例与现有工具链，--prepare 显式准备依赖。具体语言、Docker 和案例选择参数见 scripts/verify-engineering.ts。八个公共案例覆盖七语言及 IPC 处理核心，真实 RED/GREEN、工具、输入摘要和测试计数分别记录。缺工具按 MISSING 处理；GUI、签名、外部数据库与分布式语义需额外验证。

[贡献指南](../CONTRIBUTING.zh-CN.md) · [历史工程实践覆盖](https://github.com/bovinphang/craft-common/blob/main/docs/verification/engineering-practices/coverage.md)
