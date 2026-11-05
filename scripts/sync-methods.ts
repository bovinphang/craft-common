import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMethodResource, type MethodName } from "../src/content/catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
) as { version: string; repository: { url: string } };
type Definition = {
  id: string;
  method?: MethodName;
  name: string;
  zhName: string;
  description: string;
  zhDescription: string;
  category: string;
  tags: string[];
  yes: string;
  no: string;
};
const definitions: Definition[] = [
  {
    id: "cc-debug-methodology",
    method: "debug",
    name: "Evidence-driven diagnosis",
    zhName: "证据驱动诊断",
    description:
      "Use when diagnosing unexplained engineering failures, build errors, service exceptions, inconsistent data, or cross-layer faults before selecting a repair.",
    zhDescription:
      "用于诊断工程故障、构建报错、服务异常、数据不一致或跨层问题，需要在选择修复前确认根因时。",
    category: "engineering-methods",
    tags: ["debug", "evidence", "root-cause"],
    yes: "Java API 调用超时，先定位根因，不要直接增加重试",
    no: "为新功能绘制架构图",
  },
  {
    id: "cc-doc-sync-core",
    method: "doc-sync",
    name: "Documentation synchronization",
    zhName: "文档事实同步",
    description:
      "Use when project documentation, multilingual READMEs, setup instructions, CLI usage, or public capability descriptions drift from implementation, configuration, tests, or release metadata.",
    zhDescription:
      "用于项目文档、多语言 README、安装说明、CLI 用法或公共能力描述与实现、配置、测试和发布元数据发生漂移时。",
    category: "engineering-methods",
    tags: ["documentation", "source-of-truth", "i18n"],
    yes: "将 Go CLI 的中英文 README 命令与 CI、go.mod 同步",
    no: "只润色一段与实现无关的产品文案",
  },
  {
    id: "cc-drawio-studio",
    name: "Editable technical diagrams",
    zhName: "可编辑技术图",
    description: "",
    zhDescription: "",
    category: "diagrams",
    tags: ["drawio", "uml", "erd", "architecture"],
    yes: "从 Rust 模块生成可编辑的 draw.io 架构图",
    no: "生成产品照片或头像",
  },
  {
    id: "cc-refactoring-core",
    method: "refactoring",
    name: "Behavior-preserving refactoring",
    zhName: "保持行为的重构",
    description:
      "Use when reorganizing existing code, extracting responsibilities, moving modules, or simplifying structure while preserving observable behavior. Do not use for new functionality, behavior-changing defect fixes, or dependency upgrades.",
    zhDescription:
      "用于在保持可观察行为的前提下整理既有代码、提炼职责、搬移模块或简化结构；不要用于新增功能、改变行为的缺陷修复或依赖升级。",
    category: "engineering-methods",
    tags: ["refactoring", "behavior-preservation", "baseline"],
    yes: "Python 内部函数抽取职责，保持行为和已有绿色测试",
    no: "新增权限规则并改变错误返回",
  },
  {
    id: "cc-source-driven-development",
    method: "source-driven-development",
    name: "Source-driven development",
    zhName: "以事实来源驱动开发",
    description:
      "Use when engineering decisions depend on version-sensitive packages, runtimes, platform behavior, public API assumptions, official documentation, source code, or a specified local knowledge base.",
    zhDescription:
      "用于工程决策依赖版本敏感的包、运行时、平台行为、公共 API 假设、官方文档、源码或指定本地知识库时。",
    category: "engineering-methods",
    tags: ["official-docs", "versioning", "local-knowledge"],
    yes: "仅从本地 knowledge 核验当前 Tokio 版本的行为",
    no: "按已经明确的文本修正一个拼写错误",
  },
  {
    id: "cc-tdd-methodology",
    method: "tdd",
    name: "Test-driven development",
    zhName: "测试驱动开发",
    description:
      "Use when implementing new observable behavior or fixing a behavioral defect through tests, or when deciding whether a change is test-driven development or pure behavior-preserving refactoring.",
    zhDescription:
      "用于通过测试实现新的可观察行为、修复行为缺陷，或区分测试驱动开发与纯行为保持重构时。",
    category: "engineering-methods",
    tags: ["tdd", "regression", "red-green-refactor"],
    yes: "用项目已有 Go 测试先证明新增权限规则缺失再实现",
    no: "只更新与业务行为无关的说明文字",
  },
  {
    id: "cc-technical-diagrams",
    name: "Structured technical diagrams",
    zhName: "结构化技术图表",
    description: "",
    zhDescription: "",
    category: "diagrams",
    tags: ["architecture", "sequence", "workflow", "png-qa"],
    yes: "绘制后端任务生命周期和 Agent 记忆流并导出 PNG",
    no: "为前端页面生成视觉样机",
  },
];
const categories: Record<string, string> = {
  "cc-debug-methodology": "review-quality",
  "cc-doc-sync-core": "maintenance-docs",
  "cc-drawio-studio": "implementation-capability",
  "cc-refactoring-core": "project-evolution",
  "cc-source-driven-development": "project-standard",
  "cc-tdd-methodology": "testing",
  "cc-technical-diagrams": "implementation-capability",
};
for (const definition of definitions)
  definition.category = categories[definition.id];

for (const language of ["en", "zh-CN"] as const) {
  const contentRoot =
    language === "en" ? root : path.join(root, "localized", language);
  for (const definition of definitions.filter((item) => item.method)) {
    const skillRoot = path.join(contentRoot, "skills", definition.id);
    fs.mkdirSync(path.join(skillRoot, "references"), { recursive: true });
    fs.writeFileSync(
      path.join(skillRoot, "references/method.md"),
      readMethodResource(root, definition.method!, language),
    );
    const description =
      language === "en" ? definition.description : definition.zhDescription;
    const name = language === "en" ? definition.name : definition.zhName;
    const guide =
      language === "en"
        ? "Read and follow the [shared method](references/method.md). Select project-specific tools and domain checks from the actual repository; this workflow does not require a frontend stack."
        : "读取并遵循[公共方法](references/method.md)，依据实际项目选择工具和专业检查，本流程不要求前端技术栈。";
    fs.writeFileSync(
      path.join(skillRoot, "SKILL.md"),
      `---\nname: ${definition.id}\ndescription: ${description}\n---\n\n# ${name}\n\n${guide}\n`,
    );
  }
  const metadata = definitions.map((item) => ({
    id: item.id,
    name: language === "en" ? item.name : item.zhName,
    category: item.category,
    tags: item.tags,
    summary: language === "en" ? item.name : item.zhName,
    version: pkg.version,
    license: "MIT",
    homepage: pkg.repository.url,
    repository: pkg.repository.url,
    keywords: [item.category, ...item.tags],
    platforms: [
      "skills-cli",
      "skillreg",
      "claude-code",
      "codex",
      "cursor",
      "opencode",
      "openclaw",
      "generic-skill-runtime",
    ],
  }));
  const relations = Object.fromEntries(
    definitions.map((item) => [item.id, { capabilityTags: item.tags }]),
  );
  // 触发评估样例单独维护，不随入口文案重新生成或缩减。
  const queries = JSON.parse(
    fs.readFileSync(path.join(contentRoot, "skills/eval_queries.json"), "utf8"),
  ) as Record<string, unknown>;
  for (const [name, value] of [
    ["metadata", metadata],
    ["relations", relations],
    ["eval_queries", queries],
  ] as const)
    fs.writeFileSync(
      path.join(contentRoot, "skills", `${name}.json`),
      `${JSON.stringify(value, null, 2)}\n`,
    );
}
