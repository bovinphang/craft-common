import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  executeSharedPlan,
  recoverSharedTransaction,
} from "../../src/install/transaction.js";
import { sharedFixture } from "./fixtures.js";

for (const point of ["resource", "commit"] as const) {
  test(`进程在 ${point} 中断后恢复，不误删已提交资源`, async (t) => {
    const f = sharedFixture(t);
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const worker = fileURLToPath(
      new URL("../fixtures/transaction-worker.ts", import.meta.url),
    );
    const child = spawn(
      process.execPath,
      ["--import", import.meta.resolve("tsx"), worker, f.root, point],
      { env, stdio: ["ignore", "pipe", "pipe"] },
    );
    t.after(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    });
    await new Promise<void>((resolve, reject) => {
      let output = "",
        errors = "";
      const timer = setTimeout(
        () => reject(new Error(`子进程没有到达中断点：${output} ${errors}`)),
        10000,
      );
      child.stderr?.on("data", (bytes) => {
        errors += String(bytes);
      });
      child.stdout?.on("data", (bytes) => {
        output += String(bytes);
        if (output.includes("CRASH_READY")) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`中断点前退出 ${code}: ${errors}`));
      });
    });
    await assert.rejects(
      executeSharedPlan(
        {
          action: "install",
          skillsDir: f.skillsDir,
          consumer: f.consumer("backend-craft"),
          catalog: f.catalog(),
        },
        { dryRun: false },
      ),
      /锁|正在执行/,
    );
    const exit = once(child, "exit");
    child.kill("SIGKILL");
    await exit;
    assert.equal(await recoverSharedTransaction(f.skillsDir), "recovered");
    assert.equal(
      fs.existsSync(path.join(f.skillsDir, "cc-example/SKILL.md")),
      point === "commit",
    );
    await executeSharedPlan(
      {
        action: "install",
        skillsDir: f.skillsDir,
        consumer: f.consumer("frontend-craft"),
        catalog: f.catalog(),
      },
      { dryRun: false },
    );
    assert.equal(await recoverSharedTransaction(f.skillsDir), "clean");
  });
}
