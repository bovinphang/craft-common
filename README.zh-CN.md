<div align="center">

# Craft Common

Craft AI Coding 的公共工程能力与产品集成库。

[![CI](https://github.com/bovinphang/craft-common/actions/workflows/ci.yml/badge.svg)](https://github.com/bovinphang/craft-common/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@bovinphang/craft-common)](https://www.npmjs.com/package/@bovinphang/craft-common)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-5FA04E)

[English](README.md) · **简体中文**

</div>

Craft Common 为 [Frontend Craft](https://github.com/bovinphang/frontend-craft) 和 [Backend Craft](https://github.com/bovinphang/backend-craft) 提供 **21 个公共 Skill**、**6 类通用方法**，以及内容同步、工程识别、共享安装和产品 CLI 的基础设施。所有 Skill 与方法均提供英文和简体中文内容。

产品用户通过前端或后端插件获得公共能力；集成开发者通过 ESM 库使用导出的 API。公共能力以 cc-* 标识，源内容统一在本仓库维护。

[文档导航](docs/README.zh-CN.md) · [消费指南](docs/consuming-common.zh-CN.md) · [贡献指南](CONTRIBUTING.zh-CN.md) · [变更日志](CHANGELOG.zh-CN.md)

## 核心能力

| 能力 | 用途 |
| --- | --- |
| `readContentCatalog / readMethodResource` | 读取双语内容目录与通用方法字节 |
| `syncProductSnapshot` | 生成并核验产品副本与来源锁 |
| `inspectWorkspace / recommendCapabilities` | 有界识别工作区证据并推荐已交付能力 |
| `resolveRuntimeTargets / RUNTIME_DESCRIPTORS` | 解析 15 个 Runtime 的配置与 Skill 路径 |
| `createInstallSession / runProductLifecycle` | 规划产品托管资源并协调安装 |
| `planSharedDeployment / executeSharedPlan / recoverSharedTransaction` | 规划共享部署、提交事务与恢复中断 |
| `createCraftCli / createCliLifecycle / createCliPrompts / createClaudeCacheManager` | 在 2.1.0 中组合产品命令调度、生命周期、交互与缓存管理 |

## 开始使用

### 产品使用者

安装 Frontend Craft 或 Backend Craft，由产品交付公共 Skill、方法引用及共享资源管理。每个产品负责自己的命令、领域规范和 Runtime 适配。入口见两产品 README。

### 库集成开发者

要求 Node.js 22+，使用 TypeScript / ESM。

```sh
pnpm add --save-exact @bovinphang/craft-common@2.1.0
```

由调用方提供实际安装包根目录，读取完整内容与方法。

```ts
import {
  readContentCatalog,
  readMethodResource,
} from "@bovinphang/craft-common";

export function loadCommonContent(packageRoot: string) {
  return {
    catalog: readContentCatalog(packageRoot, "en"),
    method: readMethodResource(packageRoot, "doc-sync", "en"),
  };
}
```

目录包含每个入口的完整文件列表、来源版本、文件哈希和目录摘要。简体中文使用 zh-CN。打包后的产品应显式定位并传入公共内容根目录。完整约定见[消费指南](docs/consuming-common.zh-CN.md)。

## 公共 Skill 目录

| 领域 | Skill |
| --- | --- |
| 语言基础 | `cc-typescript-project-standard`、`cc-rust-project-standard`、`cc-go-project-standard`、`cc-java-project-standard`、`cc-python-project-standard`、`cc-c-project-standard`、`cc-cpp-project-standard` |
| 运行时与并发 | `cc-rust-async`、`cc-go-concurrency`、`cc-java-runtime`、`cc-python-async`、`cc-native-memory-safety` |
| 桌面 | `cc-electron-project-standard`、`cc-tauri-project-standard` |
| 工程方法 | `cc-source-driven-development`、`cc-doc-sync-core`、`cc-debug-methodology`、`cc-refactoring-core`、`cc-tdd-methodology` |
| 图表 | `cc-drawio-studio`、`cc-technical-diagrams` |

语言、框架和工程角色分别建模。相同语言能力可用于 UI、桌面核心、原生库、服务和 CLI，任务推荐以实际工程证据和已交付内容为依据。

## 通用方法与工程实践

六类方法为源码核验、文档同步、诊断、重构、TDD 和工程实践，对应 source-driven-development、doc-sync、debug、refactoring、tdd、engineering-practices。方法源位于 methods/ 与中文镜像，Skill 内引用由同步脚本生成。

工程实践包含八项公共原则和带适用条件的一手来源记录，规则采用 required、recommended、conditional 级别。语言与桌面入口的领域说明记录条件、例外与验证要求。

[工程实践源](methods/engineering-practices.md) · [来源记录](methods/engineering-practices.sources.json)

## 产品集成与共存

产品通过显式规划会话声明资源变更，由公共安装引擎协调路径、配置条目所有权、跨产品锁与中断恢复。两产品共享同一真实 Skill 目标时，common 版本、语言与内容摘要必须一致。未知和用户修改的文件受到保护。

dry-run 执行规划且保持磁盘只读。升级前通过各旧产品 CLI 退出旧公共引用，再安装匹配产品。原生插件共存需要额外宿主验证。集成约定见[消费指南](docs/consuming-common.zh-CN.md)，命令组合见[共享 CLI 接入](docs/cli-integration.zh-CN.md)。

## 开发与验证

源码开发使用 pnpm 12.4.1、esbuild 与 Node.js node:test。

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm run sync:methods -- --check
pnpm build
pnpm test
pnpm run pack:skills
pnpm exec npm pack
```

pack:skills 生成 21 个双语独立 Skill 包。库归档使用 npm 打包器以保留样例中的嵌套锁文件。工程实践样例需按[工程结构](docs/project-structure.zh-CN.md)单独准备和验证。

## 文档与贡献

[文档导航](docs/README.zh-CN.md)汇总消费、CLI、维护和历史证据入口。[贡献指南](CONTRIBUTING.zh-CN.md)说明双语维护、生成边界和提交前检查。通过 [GitHub Issues](https://github.com/bovinphang/craft-common/issues)反馈问题。

## 许可证

[MIT](LICENSE) © bovinphang.
