# 最终评审问题修复与验收

本文件由实施者记录独立评审后的修复证据。[原始独立评审](final-independent-review.md) 保留对修复前候选的 5 项 Important、0 Critical 结论；没有改写原评审，也没有开展第二轮独立评审。

| 发现 | 修复 | 直接回归 |
| --- | --- | --- |
| I1 文件/子目录 inspect 兼容 | 复用旧任务参数解析；显式 --task-path 才采用 workspace 位置参数；任务转换为同一声明根的相对路径以支持根 junction | 文件、未建文件、子目录、外部目录/文件、显式任务参数和声明根 junction；原反例 RED → GREEN |
| I2 无 Skill 宿主缺语言资料 | Cline/Trae/Copilot 在 backend-craft/reference-skills 私有目录交付全部 common 资料并生成指南，不声明原生 Skill 或公共消费者 | 三宿主 × local/global × en/zh-CN；引用、资源、用户编辑、更新、部分卸载与最终卸载；原反例 RED → GREEN |
| I3 锁前预检过期 | 保留快速预检，在锁内 adapter.plan 再检查完整旧树，沿用 seed/pending 支持 | 在恢复的 await 边界排入新增未知文件和已知文件修改，整批拒绝且不部署 cc；原反例 RED → GREEN |
| I4 全局清单扩大读取范围 | 构造实际 ProductContext，经同一 MANIFEST_CODEC 验证身份与全部引用根，再读取规范路径 | 伪造 cwd、祖先链接返回2，未输出用户原文；原反例 RED → GREEN |
| I5 悬空旧根链接漏检 | 以 lstat 判断根存在性，仅根 ENOENT 视为不存在，所有链接走冲突分支 | 悬空目录 junction/symlink 返回 conflict；原反例 RED → GREEN |

另补充原评审提出的恢复竞争覆盖空白：两个真实独立进程都先读取失效租约；首进程取得新租约并暂停，次进程必须拒绝且新租约字节不变，首进程随后正常释放。产品租约和公共租约分别验证，Windows/Linux 均通过。未改动生产锁算法。

全分发验收中还修正了三项实际失败：旧 61/74 数量断言与当前 OpenClaw 文档未同步；中文独立包的重构目录跨 Skill 链接需沿用既有资源枚举及官方仓库链接转换；后端核心安装测试仍断言迁出前 bec-go 入口。保留资源和安装断言，并新增旧入口不存在检查，没有删除保护逻辑或把失败改成跳过。

OpenClaw 专用类型检查的 rootDir 原限于 src/openclaw，新共用 project 声明模块在 src/project；将 rootDir 放宽到 src，include 仍只从 OpenClaw 入口及其导入闭包检查，TS6059 RED → GREEN。

最终平台、分发与共存结果见 [跨领域能力验收](cross-domain-capabilities.md)。未发布 common 候选的公开 registry frozen 安装仍待发布后验证；桌面 GUI/权限激活/签名、外部数据库/部署/负载、LLM 压力评估仍按批准范围列为未验证。

建议后续提交（本次未执行）：

- common: feat(common): unify product foundation and cross-domain capabilities
- frontend: refactor(frontend): adopt shared foundation and scoped inspection
- backend: feat(backend): adopt shared foundation and service specialties
