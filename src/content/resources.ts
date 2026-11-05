import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ContentFile } from "./types.js";

export function collectSkillResources(skillRoot: string): ContentFile[] {
  const root = path.resolve(skillRoot);
  const files: ContentFile[] = [];
  function checkReference(from: string, reference: string): void {
    if (/^(?:https?:|mailto:|data:|#)/i.test(reference)) return;
    const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
    if (!clean) return;
    const target = path.resolve(path.dirname(from), clean);
    const relative = path.relative(root, target);
    if (
      path.isAbsolute(clean) ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      throw new Error(`资源引用越过技能边界：${reference}`);
    if (!fs.existsSync(target))
      throw new Error(`缺少引用资源：${reference}（${from}）`);
  }
  function walk(dir: string): void {
    if (fs.lstatSync(dir).isSymbolicLink())
      throw new Error(`技能资源不允许符号链接：${dir}`);
    for (const name of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink())
        throw new Error(`技能资源不允许符号链接：${file}`);
      if (stat.isDirectory()) {
        walk(file);
        continue;
      }
      if (!stat.isFile()) throw new Error(`不支持的资源类型：${file}`);
      const content = fs.readFileSync(file);
      files.push({
        relativePath: path.relative(root, file).split(path.sep).join("/"),
        hash: createHash("sha256").update(content).digest("hex"),
      });
      if (file.endsWith(".md"))
        for (const match of content
          .toString("utf8")
          .matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g))
          checkReference(file, match[1]);
      if (/\.[cm]?[jt]s$/.test(file)) {
        for (const match of content
          .toString("utf8")
          .matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']+)["']/g))
          checkReference(file, match[1]);
      }
    }
  }
  walk(root);
  return files.sort((a, b) =>
    a.relativePath < b.relativePath
      ? -1
      : a.relativePath > b.relativePath
        ? 1
        : 0,
  );
}
