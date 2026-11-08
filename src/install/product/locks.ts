import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { safeProductPath, productPathKey } from "./paths.js";

interface Lease {
  pid: number;
  host: string;
  token: string;
}

function readLease(file: string): Lease {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8192)
    throw new Error("Invalid installation lock file");
  const lease = JSON.parse(fs.readFileSync(file, "utf8")) as Lease;
  if (
    !lease ||
    lease.host !== os.hostname() ||
    !Number.isSafeInteger(lease.pid) ||
    lease.pid <= 0 ||
    typeof lease.token !== "string"
  )
    throw new Error("Cannot confirm installation lock identity");
  return lease;
}

export function acquireFileLease(file: string): () => void {
  const lease: Lease = {
    pid: process.pid,
    host: os.hostname(),
    token: randomUUID(),
  };
  const serialized = JSON.stringify(lease);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, serialized, { flag: "wx", mode: 0o600 });
      return () => {
        const now = readLease(file);
        if (now.token !== lease.token)
          throw new Error("Installation lock ownership changed");
        fs.unlinkSync(file);
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const previous = readLease(file);
      let dead = false;
      try {
        process.kill(previous.pid, 0);
      } catch (probe) {
        dead = (probe as NodeJS.ErrnoException).code === "ESRCH";
      }
      if (!dead)
        throw new Error(
          `Installation lock is held by running process ${previous.pid}`,
        );
      const reclaim = `${file}.reclaim`;
      const fd = fs.openSync(reclaim, "wx", 0o600);
      try {
        if (readLease(file).token !== previous.token)
          throw new Error("Installation lock changed during recovery");
        fs.unlinkSync(file);
      } finally {
        fs.closeSync(fd);
        fs.unlinkSync(reclaim);
      }
    }
  }
  throw new Error("Could not acquire installation lock");
}

export async function withProductConfigurationLocks<T>(
  files: readonly string[],
  operation: () => Promise<T>,
): Promise<T> {
  const targets = [
    ...new Set(
      files.map((file) =>
        productPathKey(
          safeProductPath(file, [path.dirname(path.resolve(file))]),
        ),
      ),
    ),
  ].sort();
  const releases: Array<() => void> = [],
    directories = new Set<string>();
  let failure: unknown, value: T | undefined;
  try {
    for (const target of targets) {
      const directory = path.join(path.dirname(target), ".craft-install-locks");
      const token = createHash("sha256").update(target).digest("hex");
      const lock = safeProductPath(path.join(directory, token + ".lock"), [
        path.dirname(target),
      ]);
      let missing = directory;
      for (;;) {
        try {
          fs.lstatSync(missing);
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        directories.add(missing);
        const parent = path.dirname(missing);
        if (parent === missing) break;
        missing = parent;
      }
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      releases.push(acquireFileLease(lock));
    }
    value = await operation();
  } catch (error) {
    failure = error;
  }
  const cleanupErrors: unknown[] = [];
  for (const release of releases.reverse()) {
    try {
      release();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  for (const directory of [...directories].sort(
    (a, b) => b.length - a.length,
  )) {
    try {
      fs.rmdirSync(directory);
    } catch (error) {
      if (
        !["ENOTEMPTY", "EEXIST", "ENOENT"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length)
    throw new AggregateError(
      [...(failure ? [failure] : []), ...cleanupErrors],
      "Installation lock cleanup failed",
    );
  if (failure) throw failure;
  return value as T;
}
