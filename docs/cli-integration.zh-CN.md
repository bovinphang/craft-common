# 共享 CLI 接入

[English](cli-integration.md) · [文档导航](README.zh-CN.md)

本指南面向 2.1.0 的库集成开发者。Frontend Craft 和 Backend Craft 提供实际终端命令，公共包导出命令组合 API。公开版本说明见[项目首页](../README.zh-CN.md#库集成开发者)。

## 组合入口

```ts
import {
  createCraftCli,
  renderCliHelp,
  type CliProductAdapter,
  type CliProductDefinition,
} from "@bovinphang/craft-common";

export function composeProductCli(
  definition: CliProductDefinition,
  adapter: CliProductAdapter,
) {
  return createCraftCli(
    { ...definition, help: renderCliHelp(definition) },
    adapter,
  );
}
```

由产品填入实际 definition 和 adapter，得到 run(argv, io)。CliIO 需要 cwd、home、productRoot、env、stdout、stderr，可提供 isTTY 与 signal。产品将返回的 0 / 1 / 2 赋给进程退出码。

## 接口职责

| 接口 | 产品提供的内容 |
| --- | --- |
| CliProductDefinition | 包名、命令名、bin 名、版本、Runtime 列表及可选默认值 |
| adapter.discover | 按 Runtime 与范围发现托管安装，返回各自语言和清单位置 |
| adapter.resource | 执行 install / update / uninstall，尊重 dryRun、范围、语言和所有权 |
| adapter.command | 扩展产品专属命令，未处理时返回 undefined |
| adapter.prompts | 提供 Runtime、语言及位置交互，可复用 createCliPrompts |
| adapter.lifecycle | 委托 CLI 自更新、自卸载，可复用 createCliLifecycle |

JSON 输出通过 value 生成单个 JSON 值，普通文本通过 text 输出，诊断使用 stderr。产品适配器应保证预览操作只读，并保留各自已有清单和安装契约。

## 默认值与命令语义

下表为未覆盖 CliProductDefinition.defaults 时的行为。

| 命令或环境 | 行为 |
| --- | --- |
| setup [runtime] / setup all | 默认当前项目 local，显式 global 可覆盖 |
| 普通交互 install | 询问 Runtime、语言与位置 |
| 普通非交互 install | 默认 claude、global、en |
| runtime install --all | 为全部已声明 Runtime 规划或安装资源 |
| runtime update [runtime] | 使用当前包资源，默认沿用已发现安装的语言 |
| runtime uninstall [runtime] | 由产品适配器移除托管资源 |
| update / upgrade | 升级产品 CLI 并刷新当前项目及全局资源 |
| uninstall / remove | 移除 CLI，purge 可先清理资源，非交互要求 yes |

脚本应显式传入 --local 或 --global。setup all 和 runtime install --all 分别用于对应入口，普通 install 为兼容别名。

## 包管理器与生命周期

createCliLifecycle 结合 identifyInstallation、原安装路径与包管理器入口核验来源。支持已核实的 npm/pnpm 安装，开发目录、未知来源及共享 pnpm 安装组会被拒绝。临时 npx 运行要求已是最新版，自卸载受到限制。

调用方提供 pluginRoot、cwd、purgeResources 和 describeResources。自更新成功后由新 CLI 刷新资源；CLI 更新失败时停止资源刷新，资源失败时保留已更新 CLI。预览可能查询 registry，资源预览应保持只读。

## Claude 来源与缓存

createClaudeCacheManager 提供本产品的原生/CLI 来源报告与缓存清理计划。产品负责将来源检查接入安装流程。清理保护当前安装，缺少可靠元数据时拒绝删除。CLI 与原生来源冲突的交互策略由产品声明。

## 接入验证

复用 tests/cli 中的模式覆盖默认值、参数错误、单 JSON 输出、语言保留、部分失败、自更新与卸载，以及隔离目录下的预览零写入。包管理器生命周期使用注入 runner、临时 home 和模拟安装来源验证。产品专属验证及真实宿主发现分别记录。
