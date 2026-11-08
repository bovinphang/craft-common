import fs from "node:fs";
import path from "node:path";
import { acquireFileLease } from "../../src/install/product/locks.js";
import {
  recoverSharedTransaction,
  resolveSharedIdentity,
} from "../../src/index.js";
const [root, kind, id, deadText] = process.argv.slice(2),
  deadPid = Number(deadText);
const lease =
  kind === "product"
    ? path.join(root, "lease.json")
    : path.join(
        resolveSharedIdentity(path.join(root, "skills")).ledgerDir,
        "install.lock",
      );
function checkpoint(label: string, gate: string) {
  fs.writeSync(process.stdout.fd, label + "\n");
  const deadline = Date.now() + 10000;
  while (!fs.existsSync(path.join(root, gate))) {
    if (Date.now() > deadline) throw new Error("Checkpoint timeout " + label);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  }
}
const kill = process.kill;
let probed = false;
process.kill = (pid, signal) => {
  if (pid === deadPid && signal === 0 && !probed) {
    probed = true;
    checkpoint("STALE_READ", id + ".start");
  }
  return kill(pid, signal);
};
const write = fs.writeFileSync;
fs.writeFileSync = (file, data, options) => {
  write(file, data, options);
  if (
    String(file) === lease &&
    typeof data === "string" &&
    JSON.parse(data).pid === process.pid
  )
    checkpoint("NEW_OWNER", id + ".release");
};
try {
  if (kind === "product") {
    const release = acquireFileLease(lease);
    release();
  } else await recoverSharedTransaction(path.join(root, "skills"));
  fs.writeSync(process.stdout.fd, "RELEASED\n");
} catch (error) {
  fs.writeSync(process.stdout.fd, "REFUSED " + String(error) + "\n");
  process.exitCode = 2;
}
