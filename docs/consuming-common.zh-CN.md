# 消费 Craft Common

[English](consuming-common.md) · [文档导航](README.zh-CN.md)

## 版本与职责

当前源码为 @bovinphang/craft-common 2.1.0，要求 Node.js 22+、ESM。公开版本可用性见[项目首页](../README.zh-CN.md#库集成开发者)。产品应使用精确依赖并验证实际归档与来源摘要。

公共包维护 cc-* 内容、通用方法、工程事实与稳定安装机制。产品负责身份、领域内容、历史清单编解码、Runtime 内容转换和专属命令。公共源码只依赖自身的库依赖。

## 内容读取与分发

| API | 输入与结果 |
| --- | --- |
| readContentCatalog(packageRoot, language) | 显式包根与 en / zh-CN，返回 21 个入口、完整文件清单、哈希、来源版本及摘要 |
| readMethodResource(packageRoot, method, language) | 读取通用方法的 Buffer 字节 |
| collectSkillResources(skillRoot) | 递归收集 Skill 资源，检查资源闭合与不安全链接 |
| syncProductSnapshot(input) | 按产品声明生成双语副本、方法引用与 common-content.lock.json |

方法标识为 source-driven-development、doc-sync、debug、refactoring、tdd、engineering-practices。产品将通用方法内嵌到本地 references，使独立 Skill 包携带所需方法资源。

调用方应显式定位 packageRoot。目录中的 root 是对应语言的内容目录；打包后应继续使用明确的包根定位方式。

## 产品快照同步

产品在现有维护脚本中调用 syncProductSnapshot，提供 productRoot、commonRoot、check、domainMethods、extraResources、retiredIds。

1. 从匹配的精确公共包准备双语内容和来源。
2. 执行产品的 pnpm run sync:common，生成公共 Skill、领域方法副本与混合能力索引。
3. 执行 pnpm run check:common，只读比对资源、版本与摘要。
4. 执行产品内容、构建、测试及真实归档核验。

同步预检双语完整性、旧锁哈希、未知输出和混合索引。产品自有索引条目继续由产品维护。仅旧锁认领且内容未变的过期文件会被清理；未知或修改内容会保留并阻断同步。

## 工程事实与推荐

inspectWorkspace({ workspace, taskPath?, maxDepth?, maxEntries?, detectors? }) 返回工程 units、语言、框架版本约束、角色、证据路径、关联与截断警告。默认深度 12、条目预算 10000、单清单上限 256 KiB。发现过程只读取有界工程证据，跳过内部链接、敏感文件与依赖产物。

recommendCapabilities 接收 inspection、产品能力 catalog 及可选 task，只推荐已交付能力。最近子工程限定任务范围，IPC 关联需要同一桌面框架证据。同维度条件按 OR，跨维度按 AND。省略任务时返回工程级候选；旧 metadata 可继续缺省 applicability。

## 产品安装入口

runProductLifecycle 接收 action、definition、context、codec、adapter 和可选 common。

- definition 声明包名、消费者身份、资源前缀、清单和状态目录。
- context 提供版本、Runtime、范围、语言、工作目录、home 和允许写入的根。
- codec 读写产品已有清单格式。
- adapter.plan(context, session) 在显式会话内规划资源变更。
- common 可选接入共享资源部署与消费者账本。

resolveRuntimeTargets 统一 15 个 Runtime 的配置目录、实际 Skill 目标和允许根。compatibility 保留产品历史路径与环境变量差异。createInstallSession 支持读取会话内已规划内容、配置条目所有权和部分卸载。

无标准 Skill 的宿主可通过产品事务交付私有参考资料，实际转换策略由产品适配器声明。

## 共享部署与恢复

| API | 职责 |
| --- | --- |
| resolveSharedIdentity(skillsDir) | 规范化真实目标，将状态定位到父目录 craft-manifests 下的目标路径摘要目录 |
| planSharedDeployment(request) | 只读规划公共资源及消费者变更，报告冲突 |
| executeSharedPlan(request, options) | 锁内重新规划并协调公共资源、账本及产品文件 |
| recoverSharedTransaction(skillsDir, allowedProductRoots?) | 在已确认原本地进程退出后执行受边界约束的恢复 |

相同真实 Skill 目标按精确版本、语言、内容摘要共享。消费者身份包括产品名、真实清单路径和作用域。产品清单只管理本产品私有文件及共享配置条目，cc-* 文件由公共协议跟踪。

执行时校验产品变更的 path、beforeHash、after 和允许根。部分卸载用 retainConsumer 保留公共引用，完整卸载才释放。配置路径锁跨产品协调同一配置，恢复和重新读取在锁内完成。

dry-run 运行真实规划并保持磁盘只读。提交前中断回滚，提交后验证并清理事务；发现外部编辑则保留现场。允许声明根本身为 junction，根内链接受限。协议覆盖本地主机并发和进程中断恢复，断电持久性及多主机共享文件系统需另行验证。

## 协调升级与发行

1. 备份用户编辑，确认产品、Runtime、范围及语言。
2. 使用各旧产品 CLI 退出旧公共消费者，处理保留文件后重试。
3. 从已验证归档安装 common 版本、语言与内容摘要匹配的产品。
4. 分别执行产品 doctor、公共来源检查与宿主发现确认。

公共包先发布，消费者随后发布。使用 pnpm exec npm pack 生成库归档并检查实际内容，发布后核对公开归档 SRI 和产品 frozen-lockfile 安装。临时本地 registry 联调后清理项目配置，保持最终锁文件匹配公开来源。

## 工程结构与维护入口

[工程结构](project-structure.zh-CN.md)介绍源码、生成边界和校验命令；[共享 CLI 接入](cli-integration.zh-CN.md)介绍 2.1.0 产品命令组合；[贡献指南](../CONTRIBUTING.zh-CN.md)说明维护流程。

[安装底座历史证据](https://github.com/bovinphang/craft-common/blob/main/docs/verification/installation-foundation.md)和 [2.0.0 发布记录](releases/2.0.0.md)保留原验证版本与结果。
