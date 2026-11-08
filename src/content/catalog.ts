import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ContentCatalog, InstallLanguage } from "./types.js";
import { collectSkillResources } from "./resources.js";

export type MethodName =
  | "source-driven-development"
  | "doc-sync"
  | "debug"
  | "refactoring"
  | "tdd"
  | "engineering-practices";
export function readMethodResource(
  packageRoot: string,
  method: MethodName,
  language: InstallLanguage,
): Buffer {
  const allowed: readonly string[] = [
    "source-driven-development",
    "doc-sync",
    "debug",
    "refactoring",
    "tdd",
    "engineering-practices",
  ];
  if (!allowed.includes(method))
    throw new Error(`未知公共方法：${String(method)}`);
  if (language !== "en" && language !== "zh-CN")
    throw new Error(`不支持的语言：${String(language)}`);
  const root =
    language === "en"
      ? packageRoot
      : path.join(packageRoot, "localized", language);
  const file = path.join(root, "methods", `${method}.md`);
  if (fs.lstatSync(file).isSymbolicLink())
    throw new Error(`方法资源不允许符号链接：${file}`);
  return fs.readFileSync(file);
}

function hash(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function readContentCatalog(
  packageRoot: string,
  language: InstallLanguage,
): ContentCatalog {
  if (language !== "en" && language !== "zh-CN")
    throw new Error(`不支持的语言：${String(language)}`);
  const root = fs.realpathSync(packageRoot);
  const pkg: unknown = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  if (!pkg || typeof pkg !== "object") throw new Error("公共包元数据无效");
  const { name, version, repository } = pkg as Record<string, unknown>;
  const repositoryUrl =
    typeof repository === "string"
      ? repository
      : repository && typeof repository === "object"
        ? (repository as Record<string, unknown>).url
        : undefined;
  if (
    name !== "@bovinphang/craft-common" ||
    typeof version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version) ||
    typeof repositoryUrl !== "string"
  )
    throw new Error("公共包名称、版本或 repository 无效");
  const contentRoot =
    language === "en" ? root : path.join(root, "localized", language);
  const skillsDir = path.join(contentRoot, "skills");
  if (!fs.existsSync(skillsDir))
    throw new Error(`缺少 ${language} 公共内容：${skillsDir}`);
  if (fs.lstatSync(skillsDir).isSymbolicLink())
    throw new Error(`公共技能目录不允许符号链接：${skillsDir}`);
  const skills = fs
    .readdirSync(skillsDir)
    .sort()
    .flatMap((id) => {
      const skillRoot = path.join(skillsDir, id);
      const stat = fs.lstatSync(skillRoot);
      if (stat.isSymbolicLink())
        throw new Error(`公共技能不允许符号链接：${skillRoot}`);
      if (!stat.isDirectory()) return [];
      if (!/^cc-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
        throw new Error(`公共技能 ID 无效：${id}`);
      const files = collectSkillResources(skillRoot);
      if (!files.some((file) => file.relativePath === "SKILL.md"))
        throw new Error(`缺少公共技能入口：${id}/SKILL.md`);
      return [
        { id, version, sourcePackage: name, repository: repositoryUrl, files },
      ];
    });
  if (!skills.length) throw new Error(`没有 ${language} 公共技能`);
  const content: Omit<ContentCatalog, "root" | "digest"> = {
    schemaVersion: 1,
    packageName: name,
    packageVersion: version,
    language,
    skills,
  };
  return {
    ...content,
    root: contentRoot,
    digest: hash(JSON.stringify(content)),
  };
}
