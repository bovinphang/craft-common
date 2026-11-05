import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const moduleUrl = pathToFileURL(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../skills/cc-technical-diagrams/scripts/diagram-browser.mjs",
  ),
).href;
test("等待端口文件解除临时锁后读取完整端口", async () => {
  const { waitForDebuggingPort } = await import(moduleUrl);
  let reads = 0;
  const port = await waitForDebuggingPort(() => {
    reads++;
    if (reads === 1)
      throw Object.assign(new Error("locked"), { code: "EBUSY" });
    return "9222\n/devtools/browser/id\n";
  }, Date.now() + 1000);
  assert.equal(port, 9222);
  assert.equal(reads, 2);
});
test("无效端口在截止时间内失败且保留统一导出错误边界", async () => {
  const { waitForDebuggingPort } = await import(moduleUrl);
  await assert.rejects(
    waitForDebuggingPort(() => "0\n", Date.now() + 30),
    /Browser raster export failed/,
  );
});
