import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export function canonicalPath(input: string): string {
  let current = path.resolve(input);
  const missing: string[] = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`无法解析真实路径：${input}`);
    missing.unshift(path.basename(current));
    current = parent;
  }
  return path.join(fs.realpathSync.native(current), ...missing);
}

export function resolveSharedIdentity(skillsDir: string): {
  target: string;
  ledgerDir: string;
} {
  const target = canonicalPath(skillsDir);
  const store = path.join(path.dirname(target), "craft-manifests");
  if (fs.existsSync(store) && fs.lstatSync(store).isSymbolicLink())
    throw new Error("公共账本目录不允许符号链接");
  const key = createHash("sha256")
    .update(process.platform === "win32" ? target.toLowerCase() : target)
    .digest("hex");
  const ledgerDir = path.join(store, key);
  if (fs.existsSync(ledgerDir) && fs.lstatSync(ledgerDir).isSymbolicLink())
    throw new Error("公共账本目录不允许符号链接");
  return { target, ledgerDir };
}
