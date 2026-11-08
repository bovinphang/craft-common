# 工程实践覆盖与边界

结构、原生行为和模型决策分别计证。36个增强入口（common14/front8/back14）、八项核心规则和31条一手来源均由显式契约验证；产品目录数仍为21/74/42。每入口包含双语本地卡和三公共资源，代码/锁同字节，说明本地化。

| 仓库 | 入口 | 结构 | 直接新增原生案例 | 配对模型材料 |
| --- | --- | --- | --- | --- |
| craft-common | cc-typescript-project-standard | PASS，双语+三资源 | EP-TS-01 | Q1 |
| craft-common | cc-rust-project-standard | PASS，双语+三资源 | EP-RS-01 | Q2 |
| craft-common | cc-go-project-standard | PASS，双语+三资源 | EP-GO-01 | Q2 |
| craft-common | cc-java-project-standard | PASS，双语+三资源 | EP-JAVA-01 | Q4 |
| craft-common | cc-python-project-standard | PASS，双语+三资源 | EP-PY-01 | Q4 |
| craft-common | cc-c-project-standard | PASS，双语+三资源 | EP-C-01 | Q3 |
| craft-common | cc-cpp-project-standard | PASS，双语+三资源 | EP-CPP-01 | Q3 |
| craft-common | cc-rust-async | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | Q2 |
| craft-common | cc-go-concurrency | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | Q2 |
| craft-common | cc-python-async | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | Q4 |
| craft-common | cc-java-runtime | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | Q4 |
| craft-common | cc-native-memory-safety | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | Q3 |
| craft-common | cc-tauri-project-standard | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| craft-common | cc-electron-project-standard | PASS，双语+三资源 | EP-IPC-01 | 未覆盖 |
| frontend-craft | fec-react-project-standard | PASS，双语+三资源 | EP-UI-01 | Q1 |
| frontend-craft | fec-vue3-project-standard | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| frontend-craft | fec-api-integration | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | Q1 |
| frontend-craft | fec-data-fetching | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | Q1 |
| frontend-craft | fec-code-review | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| frontend-craft | fec-testing-strategy | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| frontend-craft | fec-security-review | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| frontend-craft | fec-dependency-upgrade | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-architecture-design | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-api-design | PASS，双语+三资源 | EP-SVC-01 | 未覆盖 |
| backend-craft | bec-auth-security | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-database-design | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-transaction-management | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-observability | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-testing-strategy | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-code-review | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-dependency-management | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-spring-boot-project-standard | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-fastapi-project-standard | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-gin-project-standard | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-axum-project-standard | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |
| backend-craft | bec-drogon-project-standard | PASS，双语+三资源 | review-only；关联ID不证明本项运行 | 未覆盖 |

十个直接案例的工具、hash、命名计数、原始日志位置及未运行范围见[案例证据](examples.json)。所有十例均有实际业务RED→GREEN，UI与服务另有Windows/Linux执行；C/C++在本机缺编译器，由Linux Docker补足且断言在NDEBUG下仍执行。

Q1–Q4仅覆盖上述15入口的限定决策，不等于它们全部规则已验证。独立匿名评分新16/16、旧15/16，唯一差异为旧Q3未明确缺编译器但已声明未执行；没有关键工程决策提升的证据。精确模型标识和逐条读取日志不可独立核验，见[模型报告](model-evaluation.md)。未列入材料的21入口没有模型行为覆盖。

既有七框架仍分别验收：Tauri Rust命令核心、Electron Node边界在A7执行；FastAPI真实lifespan在B4宿主执行，Gin/Drogon/Axum/Spring在B4实际缓存Linux容器执行，原始报告分别保留。不以核心函数/MockMvc/Router测试冒充GUI、鉴权激活、监听HTTP、真实数据库或部署。

最终Windows门禁：common187通过+3条件跳过/190（宿主C/C++及文件symlink权限）；frontend344/344；backend236通过+42条件跳过/278（39项共存默认未启用及3项宿主工具/准备条件）。另行显式运行真实共存39/39，零跳过；五服务真实案例已补框架运行。Linux隔离副本执行common37、frontend27、backend33，全部零跳过；UI默认离线复验PASS，服务Go1.25真实HTTP另验PASS。这里只声称相关Linux路径，未跑两产品完整Linux套件。

实际独立归档及来源版本/SRI见[分发清单](artifacts.json)；唯一最终评审与处理分别见[独立评审](final-review.md)、[处理与交付](remediation.md)。公开源frozen安装仍待实际发布，不执行commit/push/publish。
