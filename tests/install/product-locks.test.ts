import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as common from "../../src/index.js";

const api = common as unknown as {
  withProductConfigurationLocks<T>(
    files: readonly string[],
    operation: () => Promise<T>,
  ): Promise<T>;
};
test("configuration locks coordinate different products and release after rejection", async (t) => {
  assert.equal(typeof api.withProductConfigurationLocks, "function");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-config-lock-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "settings.json"),
    other = path.join(root, "config.toml");
  await api.withProductConfigurationLocks([file, other, file], async () => {
    await assert.rejects(
      api.withProductConfigurationLocks([other, file], async () =>
        assert.fail("conflicting operation cannot run"),
      ),
      /lock|running|锁|执行/i,
    );
    fs.writeFileSync(file, "first owner");
  });
  await assert.rejects(
    api.withProductConfigurationLocks([file], async () => {
      throw new Error("operation failed");
    }),
    /operation failed/,
  );
  assert.equal(
    await api.withProductConfigurationLocks([file], async () =>
      fs.readFileSync(file, "utf8"),
    ),
    "first owner",
  );
});
