# 跨领域能力与统一底座验收（2026-11-08）

本次为三个本地仓库的未提交候选改动，没有发布、push 或 commit。common 精确版本为 2.0.0-dev.20261108，frontend 3.0.0，backend 1.0.0。发布前仍需 common 先发布，并验证公开 registry 的 frozen 安装；本地归档验证不能替代这一条件。

## 内容与接口

- common 21 个入口：原有 7 + 十二个跨领域语言入口 + Tauri/Electron。原语言路径与原文件哈希见 [迁移来源](../migrations/2026-11-08-language-sources.json)。C 与 C++ 均为独立入口。
- frontend 53 个专属 + common 21 = 74；backend 21 个专属 + common 21 = 42。两产品交付相同完整公共 catalog，不做裁剪求解。
- common 负责路径、显式会话、所有权、共享配置算法、锁、事务恢复、快照同步、有界扫描和任务推荐。产品负责身份声明、历史清单 codec、内容转换、领域 detector 和 CLI 兼容。
- 工程角色、语言、框架、任务分维匹配。最近任务根限定候选，IPC 只延伸有相同桌面框架事实关联的 UI/core。无 applicability 的旧 metadata 仍有效但不猜测推荐范围。
- fec 新增 project inspect；bec 保留六语言 projects/validate，增加完整 units 与相同任务参数。二者只推荐实际交付目录中的入口，不执行构建或自动安装工具。
- 旧入口仅在所有权明确且内容未修改时随共享事务退役；未知文件、用户修改、链接和伪造路径阻断。旧公共版本消费者必须先由旧产品退出，不能自动升级另一个产品。

## 真实框架证据及边界

| 专项 | 实际执行 | 未执行范围 |
| --- | --- | --- |
| Tauri | Rust command core 路径拒绝，同一缺陷/修复用例 RED/GREEN；配置静态一致性 | GUI crate 构建、真实 IPC 权限激活、签名与原生包 |
| Electron | Node 执行实际 IPC handler，sender/参数拒绝，同一缺陷/修复 RED/GREEN；配置静态一致性 | Electron GUI、运行时 sandbox 激活、签名与原生包 |
| Spring Boot | Docker Java17、Boot3.5.16、真实 Spring context + MockMvc，HTTP400且副作用0 | 数据库事务隔离/回滚、部署与负载 |
| FastAPI | 本机 Python3.14.7、FastAPI0.141.1 TestClient，真实 lifespan 建立/关闭资源 | 外部数据库与部署 |
| Gin | Docker Go1.25.14、Gin1.11.0 httptest，校验拒绝后副作用0 | 真实部署/负载 |
| Axum | Docker Rust1.96.1、Axum0.8.9 Router/Tower，提取错误保留4xx且副作用0 | 真实数据库/部署/负载 |
| Drogon | Docker Drogon1.9.14、真实链接 Filter/Controller回调拒绝，单次响应且副作用0 | 网络路由、真实鉴权、数据库/部署；样例role头仅为合成测试门禁 |

五项服务均先观察真实业务失败，再修复同一案例；依赖准备错误不计为 RED。精确镜像 ID、工具版本和命令见 [服务框架记录](service-framework-evidence.json)。Docker 源挂载只读，默认离线复验，--prepare 显式授权准备依赖。

## 验证记录

下表来自修复后的实际命令输出。三仓 lint/typecheck/build 均通过；两个产品 sync/check:common 通过，清理临时配置后又用同一脚本只读复核通过。

| 验证 | 结果 |
| --- | --- |
| Windows common 全量 | 159/159 PASS，0 SKIP；21 个双语独立包生成与 npm 归档通过 |
| Windows frontend pack:all | 336/336 PASS，0 SKIP；OpenClaw 原生归档、74 个双语独立包通过；另验证 npm CLI 归档 |
| Windows backend pack:all | 272 总计：230 PASS、42 条件 SKIP、0 FAIL；CLI + OpenClaw +42 独立 Skill 共44个归档通过 |
| 真实双产品共存专项 | 39/39 PASS、0 SKIP；十五宿主两种顺序，以及 global/中文/冲突保护 |
| Linux Ubuntu common 全量 | 159 总计：156 PASS、3 SKIP、0 FAIL |
| Linux backend 关键回归 | 92 总计：88 PASS、4 SKIP、0 FAIL；工程识别、旧CLI、验证计划、生命周期、迁移与核心安装 |
| Linux frontend 关键回归 | 32/32 PASS，0 SKIP；inspect/hint/迁移/公共安装 |
| OpenClaw 专用类型检查 | PASS |

后端常规套件中的39项共存条件跳过已由真实专项39/39补齐；其余3项为宿主缺cmake、mvn或已准备的Gin依赖，分别有前述Docker真实框架记录。Linux common跳过为缺Chromium、缺cargo和Windows专属路径用例；Linux backend跳过为缺Go格式工具、Windows wrapper和两项未准备的Python真实执行用例。没有将条件跳过改记为通过，也没有把Linux关键回归说成产品全量套件。

独立评审发现5项 Important、0 Critical；五项均先复现RED、再修复GREEN，并通过上述最终门禁。[修复后的证据](final-remediation.md)与[修复前原始独立评审](final-independent-review.md)分开保留。评审提出的恢复竞争覆盖空白已补两种真实进程竞争用例，Windows/Linux通过；没有第二轮独立评审。

[本地归档清单与SHA512](final-artifacts.json)记录实际产物。两产品锁中的common SRI相同且匹配保留归档；其267个文件与当前发布文件集合一致，除pnpm正常移除packageManager/prepack外逐文件字节一致，全部31个编译文件也相同。静态触发查询/资源闭合测试不宣称完成LLM压力评估。

任务逐项 RED/GREEN、修订理由和完整日志保存在本地任务 ledger（.superpowers/sdd/2026-11-08-product-installation-foundation），不将历史报告改写成当前结果。

## 复现与升级顺序

1. 公开安装需先发布已核验的 common 归档，再发布依赖它的产品；本次未执行发布、push或commit。正式 cc 独立包以common唯一源构建产物为发布基准，两产品包中的副本不另行竞争发布同名版本。
2. 候选未发布时，用保留tarball和scripts/local-registry.ts做本地联调，项目级scoped registry及pnpm12自动添加的精确候选minimumReleaseAge例外仅临时使用。完成后移除项目.npmrc、lock中的localhost tarball和本次例外；本次均已清理并停止本地服务，保留真实SRI。清理后pnpm可能重新核验未发布候选，需按此本地流程复现；不能假称公开源frozen安装通过。
3. 已安装旧公共快照时，先备份修改、运行各产品runtime check-migration，再用各旧CLI退出旧公共消费者并处理保留文件，之后安装版本/语言/摘要匹配的新产品。新CLI不会替另一个产品自动升级或卸载。
4. 三仓改动保留在feature/shared-product-foundation，未提交。忽略目录中的候选包、日志和ledger保留用于复现；Docker任务缓存也保留以支持离线框架复验。
