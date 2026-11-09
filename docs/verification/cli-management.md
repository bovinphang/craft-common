# CLI 全面对齐验收记录

日期：2026-11-09（Asia/Shanghai）。本记录对应三个项目在独立 feature/refactor 分支上的合并前验收；未执行 npm 发布。

## 实现

- craft-common 新增共享命令调度、产品定义/适配器类型、可配置语言与默认值、npm/pnpm 来源识别、CLI 生命周期、交互选择和 Claude 缓存/渠道管理。
- frontend-craft 使用共享实现，保留资源转换、历史清单迁移、渠道冲突和专业命令；诊断通过注入日志输出，不修改全局 console 或中途修改 process.exitCode。
- backend-craft 补齐 setup、交互、批量安装/发现更新/卸载、命令别名、短参数、自升级/卸载、purge/yes、元数据检查和缓存修复。保留 inspect、validate、JSON、runtime list 及原安装事务。
- setup 默认本地；普通非交互安装默认 Claude、全局、英文。现有脚本应显式指定作用域。
- 公共包准备 2.1.0，产品保持 3.0.0/1.0.0，双产品精确依赖及生成内容锁已同步。

## 验证

| 检查 | 结果 |
| --- | --- |
| 三个项目 lint、typecheck、build | 全部通过 |
| craft-common 完整测试 | 257 项：254 通过、3 环境跳过、0 失败 |
| frontend-craft 完整重跑 | 349/349 通过 |
| 前端最终公共包专项回归 | 23/23 通过 |
| backend-craft 完整测试 | 281 项：239 通过、42 跳过、0 失败 |
| 后端最终 parity/打包回归 | 9/9 通过 |
| 独立真实双产品共存 | 39/39 通过、0 跳过 |
| 公共内容同步及内容检查 | 通过 |
| 前端独立 Skill 分发检查 | 74 个包通过 |
| 最终真实 tarball 冒烟 | 9 项检查、17 次 CLI 调用，全部通过 |
| 锁文件 | 精确 2.1.0；SHA-512 与实际公共 tarball 一致 |

后端完整测试中的 39 个共存跳过项已由独立共存运行覆盖；其余 3 项缺少 cmake、Maven 或预备框架依赖/锁。公共包的 3 项跳过涉及 Windows 文件符号链接权限和本机编译工具条件。原生日常宿主激活与真实全局 CLI 破坏性操作未作为测试执行；自管理分支通过双产品隔离进程替身测试。

真实归档测试在不含 node_modules、脱离相邻源码的目录执行：验证共享 API 导入、两个产品 bin、帮助/版本/JSON、自管理未知来源拒绝且零写入、同项目中文安装/更新/诊断、后端独立卸载保留前端及全部 21 个公共 Skill 字节、最后消费者卸载释放 Skill 文件与公共账本，以及后端 validate dry-run 零执行。空目录安全保留。

## 已处理的回归

- 损坏清单记录诊断后继续处理有效安装，整批返回非零；不再跳过健康目标。
- 三个交互阶段的 Ctrl-C 均取消，不使用默认选项继续安装，不污染进程退出码。
- doctor 非法参数、冲突作用域及非 Claude 缓存修复在任何清理前拒绝。
- 卸载默认保留用户修改；force 仅移除当前产品自有文件，不接管其他产品或公共消费者。
- 前端输出兼容问题已复现修复，并完整重跑 349 项测试。

## 交付与边界

验收安装使用实际 2.1.0 tarball 的临时本地覆盖，最终仓库已移除覆盖及 file 依赖，恢复精确版本和归档计算的完整性锁；不以本地源码链接代替归档验证。公共包尚未发布，因此公开 registry 的全新安装需等待 2.1.0 发布。

公共资源账本仍要求精确版本、语言、摘要匹配。现有 2.0.0 消费者按既有迁移流程由旧 CLI 退出后，再安装匹配 2.1.0 的产品构建；单独更新 CLI 后的资源冲突不会自动回滚 CLI。

公共 tarball：bovinphang-craft-common-2.1.0.tgz

完整性：

`sha512-TJVYWcprj9uUV3tqqcOhF/YHMYXxkQvgNfLb13dhm/aHdndl6GKvuoRY6UIpJTnova4iG2lBbnPD3DlU6c6ICA==`

完整日志、三个最终 tarball、打包清单、独立共存证据及可复用冒烟脚本位于工作区根目录 .cli-verification/。主要文件：common-test.log、frontend-test.log、backend-test.log、coexistence.log、packed-cli-smoke-result.json、final-lock-integrity.json。
