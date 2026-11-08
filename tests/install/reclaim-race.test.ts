import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { resolveSharedIdentity } from "../../src/index.js";
for (const kind of ["product", "shared"])
  test(
    `two real ${kind} stale recoverers cannot unlink the newly acquired lease`,
    { timeout: 20000 },
    async (t) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "cc-reclaim-race-"));
      const children: ReturnType<typeof spawn>[] = [];
      t.after(async () => {
        for (const child of children)
          if (child.exitCode === null) {
            const exited = once(child, "exit");
            child.kill("SIGKILL");
            await exited;
          }
        fs.rmSync(root, { recursive: true, force: true });
      });
      const dead = spawnSync(process.execPath, ["-e", ""]);
      assert.equal(dead.status, 0);
      assert.throws(
        () => process.kill(dead.pid, 0),
        (e) => (e as NodeJS.ErrnoException).code === "ESRCH",
      );
      const lease =
        kind === "product"
          ? path.join(root, "lease.json")
          : path.join(
              resolveSharedIdentity(path.join(root, "skills")).ledgerDir,
              "install.lock",
            );
      fs.mkdirSync(path.dirname(lease), { recursive: true });
      fs.writeFileSync(
        lease,
        JSON.stringify({
          pid: dead.pid,
          host: os.hostname(),
          token: "stale-token",
        }),
      );
      const worker = (id: string) => {
        const env = { ...process.env };
        delete env.NODE_TEST_CONTEXT;
        const child = spawn(
          process.execPath,
          [
            "--import",
            import.meta.resolve("tsx"),
            fileURLToPath(
              new URL("../fixtures/reclaim-worker.ts", import.meta.url),
            ),
            root,
            kind,
            id,
            String(dead.pid),
          ],
          { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
        );
        children.push(child);
        const exited = once(child, "exit");
        let output = "";
        child.stdout!.on("data", (bytes) => {
          output += String(bytes);
        });
        child.stderr!.on("data", (bytes) => {
          output += String(bytes);
        });
        const wait = (text: string) =>
          new Promise<void>((resolve, reject) => {
            if (output.includes(text)) {
              resolve();
              return;
            }
            const timer = setTimeout(() => {
              cleanup();
              reject(new Error("Missing " + text + ": " + output));
            }, 10000);
            const check = () => {
              if (output.includes(text)) {
                cleanup();
                resolve();
              }
            };
            const cleanup = () => {
              clearTimeout(timer);
              child.stdout!.off("data", check);
            };
            child.stdout!.on("data", check);
          });
        return { child, exited, wait };
      };
      const first = worker("first"),
        second = worker("second");
      await Promise.all([first.wait("STALE_READ"), second.wait("STALE_READ")]);
      fs.writeFileSync(path.join(root, "first.start"), "");
      await first.wait("NEW_OWNER");
      const before = fs.readFileSync(lease);
      assert.equal(JSON.parse(before.toString()).pid, first.child.pid);
      fs.writeFileSync(path.join(root, "second.start"), "");
      assert.equal((await second.exited)[0], 2);
      assert.deepEqual(
        fs.readFileSync(lease),
        before,
        "stale second recoverer must preserve new owner bytes",
      );
      assert.equal(
        fs.existsSync(
          kind === "product"
            ? lease + ".reclaim"
            : path.join(path.dirname(lease), "reclaim.lock"),
        ),
        false,
      );
      fs.writeFileSync(path.join(root, "first.release"), "");
      assert.equal((await first.exited)[0], 0);
      assert.equal(fs.existsSync(lease), false);
    },
  );
