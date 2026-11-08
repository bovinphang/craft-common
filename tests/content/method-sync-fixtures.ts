import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

export const sourceRoot = path.resolve(import.meta.dirname, "../..");
export function methodFixture(t: { after(fn: () => void): void }): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-method-sync-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const name of ["package.json", "src", "scripts", "methods", "skills", "localized"])
    fs.cpSync(path.join(sourceRoot, name), path.join(root, name), { recursive: true });
  fs.symlinkSync(path.join(sourceRoot, "node_modules"), path.join(root, "node_modules"), "junction");
  return root;
}
export function runSync(root: string, args: string[] = []) {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), path.join(root, "scripts/sync-methods.ts"), ...args], { cwd: root, encoding: "utf8", env, windowsHide: true, timeout: 30000 });
  return { ...result, output: String(result.stdout ?? "") + String(result.stderr ?? "") };
}
export function bytesSnapshot(root: string): Record<string, string> {
  const result: Record<string,string> = {};
  const walk = (relative: string) => {
    const file = path.join(root,relative), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) { result[relative] = "link:"+fs.readlinkSync(file); return; }
    if (stat.isDirectory()) { for (const name of fs.readdirSync(file).sort()) walk(relative+"/"+name); return; }
    result[relative] = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  };
  for (const relative of ["skills", "methods", "localized"]) walk(relative);
  return result;
}
export function editJson(file: string, change: (value: unknown) => unknown): void {
  fs.writeFileSync(file,JSON.stringify(change(JSON.parse(fs.readFileSync(file,"utf8"))),null,2)+"\n");
}
