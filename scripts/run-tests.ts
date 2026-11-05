import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function discover(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory()
        ? discover(file)
        : entry.name.endsWith(".test.ts")
          ? [file]
          : [];
    })
    .sort();
}
const files = discover(path.resolve("tests"));
if (!files.length) throw new Error("tests 下没有测试文件");
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
const result = spawnSync(
  process.execPath,
  [
    "--import",
    import.meta.resolve("tsx"),
    "--test",
    "--test-concurrency=1",
    ...files,
  ],
  { stdio: "inherit", env },
);
process.exitCode = result.status ?? 1;
