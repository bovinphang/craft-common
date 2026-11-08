import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
export const packageRoot = path.resolve(import.meta.dirname, "../..");
export function example(t: { after(fn: () => void): void }, id: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-framework-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(path.join(packageRoot, "skills", id, "examples/minimal"), root, {
    recursive: true,
  });
  return root;
}
export function execute(
  command: string,
  args: string[],
  cwd: string,
  extra: NodeJS.ProcessEnv = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    RUSTUP_AUTO_INSTALL: "0",
    ...extra,
  };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 90000,
    windowsHide: true,
    env,
  });
  return {
    ...result,
    output: (result.stdout ?? "") + "\n" + (result.stderr ?? ""),
  };
}
