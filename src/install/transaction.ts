import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import type { CommonPlan, FileMutation, SharedRequest } from "./types.js";
import { canonicalPath, resolveSharedIdentity } from "./identity.js";
import {
  transactionEntryHash,
  prepareTransitionRestore,
} from "./file-transition.js";
import {
  currentHash,
  hashBytes,
  planSharedDeployment,
  safeManagedPath,
} from "./planner.js";

type JournalEntry = {
  path: string;
  before: string | null;
  after: string | null;
  beforeHash: string | null;
  afterHash: string | null;
};
type Journal = {
  schemaVersion: 1;
  target: string;
  phase: "prepared" | "committed";
  token: string;
  entries: JournalEntry[];
};
type Lease = { pid: number; host: string; token: string };
const journalName = "transaction.json";

function atomicWrite(file: string, bytes: Buffer, token: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${token}.tmp`;
  try {
    const mode = fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o600;
    fs.writeFileSync(temp, bytes, { flag: "wx", mode });
    fs.renameSync(temp, file);
  } catch (error) {
    try {
      fs.unlinkSync(temp);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT")
        throw new AggregateError(
          [error, cleanupError],
          "原子写入及临时文件清理失败",
        );
    }
    throw error;
  }
}
function release(lockFile: string, lease: Lease): void {
  if (!fs.existsSync(lockFile)) return;
  const existing = JSON.parse(fs.readFileSync(lockFile, "utf8")) as Lease;
  if (existing.token !== lease.token)
    throw new Error("公共安装锁归属改变，保留现场");
  fs.unlinkSync(lockFile);
}
function acquire(ledgerDir: string): { lockFile: string; lease: Lease } {
  const lockFile = safeManagedPath(ledgerDir, "install.lock");
  fs.mkdirSync(ledgerDir, { recursive: true, mode: 0o700 });
  const lease: Lease = {
    pid: process.pid,
    host: os.hostname(),
    token: randomUUID(),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(lockFile, JSON.stringify(lease), {
        flag: "wx",
        mode: 0o600,
      });
      return { lockFile, lease };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let previous: Lease;
      try {
        previous = JSON.parse(fs.readFileSync(lockFile, "utf8")) as Lease;
      } catch {
        throw new Error("无法确认公共安装锁身份，请检查保留现场");
      }
      if (
        previous.host !== os.hostname() ||
        !Number.isSafeInteger(previous.pid) ||
        previous.pid <= 0 ||
        typeof previous.token !== "string"
      )
        throw new Error("无法确认公共安装锁所属进程");
      try {
        process.kill(previous.pid, 0);
      } catch (probe) {
        if ((probe as NodeJS.ErrnoException).code !== "ESRCH")
          throw new Error("无法确认公共安装锁是否失效");
        // Serialize stale-lease recovery, so two recoverers cannot unlink a new owner's lease.
        const reclaimFile = safeManagedPath(ledgerDir, "reclaim.lock");
        try {
          fs.writeFileSync(reclaimFile, JSON.stringify(lease), {
            flag: "wx",
            mode: 0o600,
          });
        } catch {
          throw new Error("公共安装锁正在恢复或恢复锁需人工检查");
        }
        try {
          if (fs.readFileSync(lockFile, "utf8") !== JSON.stringify(previous))
            throw new Error("公共安装锁发生并发变化");
          fs.unlinkSync(lockFile);
        } finally {
          fs.unlinkSync(reclaimFile);
        }
        continue;
      }
      throw new Error(`公共安装正在执行，锁进程 ${previous.pid}`);
    }
  }
  throw new Error("无法取得公共安装锁");
}
function validateDestination(
  file: string,
  target: string,
  ledgerDir: string,
  productRoots: string[],
): void {
  const absolute = path.resolve(file);
  const sharedRelative = path
    .relative(target, absolute)
    .split(path.sep)
    .join("/");
  if (sharedRelative.startsWith("cc-") && !sharedRelative.startsWith("../")) {
    safeManagedPath(target, sharedRelative);
    return;
  }
  if (
    ["craft-common.json", "dependencies.lock.json"].some(
      (name) => absolute === path.join(ledgerDir, name),
    )
  ) {
    safeManagedPath(ledgerDir, path.basename(absolute));
    return;
  }
  for (const root of productRoots) {
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (
      relative &&
      relative !== ".." &&
      !relative.startsWith("../") &&
      !path.isAbsolute(relative)
    ) {
      safeManagedPath(root, relative);
      return;
    }
  }
  throw new Error(`事务写入越过允许边界：${file}`);
}
function validateJournal(
  value: unknown,
  target: string,
  ledgerDir: string,
  productRoots: string[],
): Journal {
  const journal = value as Journal;
  if (
    !journal ||
    journal.schemaVersion !== 1 ||
    journal.target !== target ||
    !["prepared", "committed"].includes(journal.phase) ||
    !/^[a-f0-9-]{36}$/.test(journal.token) ||
    !Array.isArray(journal.entries)
  )
    throw new Error("公共事务记录无效，保留现场");
  const paths = new Set<string>();
  for (const entry of journal.entries) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      !path.isAbsolute(entry.path) ||
      paths.has(entry.path)
    )
      throw new Error("公共事务路径无效");
    paths.add(entry.path);
    validateDestination(entry.path, target, ledgerDir, productRoots);
    for (const side of ["before", "after"] as const) {
      const bytes = entry[side],
        hash = entry[`${side}Hash`];
      if (
        bytes === null
          ? hash !== null
          : typeof bytes !== "string" ||
            Buffer.from(bytes, "base64").toString("base64") !== bytes ||
            hashBytes(Buffer.from(bytes, "base64")) !== hash
      )
        throw new Error("公共事务内容摘要无效");
    }
  }
  return journal;
}
function restore(journal: Journal, token: string): void {
  for (const entry of [...journal.entries].reverse()) {
    const actual = transactionEntryHash(entry, journal.entries);
    if (actual !== entry.beforeHash && actual !== entry.afterHash)
      throw new Error(`事务期间文件被修改，保留恢复记录：${entry.path}`);
    if (actual === entry.beforeHash) continue;
    if (entry.before === null) fs.unlinkSync(entry.path);
    else {
      prepareTransitionRestore(entry, journal.entries);
      atomicWrite(entry.path, Buffer.from(entry.before, "base64"), token);
    }
  }
}
function recoverUnderLease(
  target: string,
  ledgerDir: string,
  token: string,
  productRoots: string[],
): "clean" | "recovered" {
  const file = safeManagedPath(ledgerDir, journalName);
  if (!fs.existsSync(file)) return "clean";
  const journal = validateJournal(
    JSON.parse(fs.readFileSync(file, "utf8")),
    target,
    ledgerDir,
    productRoots,
  );
  if (journal.phase === "prepared") restore(journal, token);
  else
    for (const entry of journal.entries)
      if (transactionEntryHash(entry, journal.entries) !== entry.afterHash)
        throw new Error(`已提交事务存在外部修改，保留恢复记录：${entry.path}`);
  fs.unlinkSync(file);
  return "recovered";
}

export async function recoverSharedTransaction(
  skillsDir: string,
  allowedProductRoots: string[] = [],
): Promise<"clean" | "recovered"> {
  const { target, ledgerDir } = resolveSharedIdentity(skillsDir);
  if (!fs.existsSync(ledgerDir)) return "clean";
  const { lockFile, lease } = acquire(ledgerDir);
  try {
    return recoverUnderLease(
      target,
      ledgerDir,
      lease.token,
      allowedProductRoots.map(canonicalPath),
    );
  } finally {
    release(lockFile, lease);
  }
}

function normalizeProductPath(file: string, roots: string[]): string {
  const absolute = path.resolve(file);
  const candidates = roots
    .flatMap((root) => {
      const real = canonicalPath(root);
      return [
        { boundary: path.resolve(root), real },
        { boundary: real, real },
      ];
    })
    .sort((a, b) => b.boundary.length - a.boundary.length);
  for (const { boundary, real } of candidates) {
    const relative = path.relative(boundary, absolute);
    if (
      !relative ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      continue;
    // The declared root may be a junction; links beneath it remain forbidden.
    let current = absolute;
    while (
      (process.platform === "win32" ? current.toLowerCase() : current) !==
      (process.platform === "win32" ? boundary.toLowerCase() : boundary)
    ) {
      try {
        if (fs.lstatSync(current).isSymbolicLink())
          throw new Error(`产品托管路径不允许符号链接：${current}`);
      } catch (error) {
        if (
          !["ENOENT", "ENOTDIR"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        )
          throw error;
      }
      const parent = path.dirname(current);
      if (parent === current) throw new Error("产品路径未到达声明边界");
      current = parent;
    }
    return safeManagedPath(real, relative.split(path.sep).join("/"));
  }
  throw new Error(`产品写入越过允许边界：${file}`);
}

export async function executeSharedPlan(
  request: SharedRequest,
  options: {
    dryRun: boolean;
    productMutations?: FileMutation[];
    allowedProductRoots?: string[];
  },
): Promise<CommonPlan> {
  const { target, ledgerDir } = resolveSharedIdentity(request.skillsDir);
  const roots = (options.allowedProductRoots ?? []).map(canonicalPath);
  const products = (options.productMutations ?? []).map((mutation) => ({
    ...mutation,
    path: normalizeProductPath(
      mutation.path,
      options.allowedProductRoots ?? [],
    ),
  }));
  for (const mutation of products) {
    const file = mutation.path;
    const shared = path.relative(target, file).split(path.sep).join("/");
    const ledger = path.relative(ledgerDir, file).split(path.sep).join("/");
    if (
      (shared.toLowerCase().startsWith("cc-") && !shared.startsWith("../")) ||
      !ledger ||
      (ledger !== ".." && !ledger.startsWith("../") && !path.isAbsolute(ledger))
    )
      throw new Error(`产品不能认领公共资源或账本：${file}`);
    validateDestination(file, target, ledgerDir, roots);
  }
  if (options.dryRun) {
    if (fs.existsSync(path.join(ledgerDir, journalName)))
      throw new Error("存在待恢复公共事务，dry-run 不执行恢复");
    const plan = planSharedDeployment(request);
    if (plan.conflicts.length) throw new Error(plan.conflicts.join("\n"));
    for (const entry of products) {
      validateDestination(entry.path, target, ledgerDir, roots);
      if (currentHash(entry.path) !== entry.beforeHash)
        throw new Error(`产品文件在规划后已修改：${entry.path}`);
    }
    return plan;
  }
  // A conflict in an untouched deployment must not create even an empty ledger directory.
  if (!fs.existsSync(path.join(ledgerDir, journalName))) {
    const initial = planSharedDeployment(request);
    if (initial.conflicts.length) throw new Error(initial.conflicts.join("\n"));
  }
  const { lockFile, lease } = acquire(ledgerDir);
  const journalFile = safeManagedPath(ledgerDir, journalName);
  let journal: Journal | undefined;
  try {
    recoverUnderLease(target, ledgerDir, lease.token, roots);
    const plan = planSharedDeployment(request);
    if (plan.conflicts.length) throw new Error(plan.conflicts.join("\n"));
    const mutations = [...plan.mutations, ...products];
    const paths = new Set<string>();
    const entries = mutations.map((mutation) => {
      const file = path.resolve(mutation.path);
      validateDestination(file, target, ledgerDir, roots);
      if (paths.has(file)) throw new Error(`公共与产品写入重复认领：${file}`);
      paths.add(file);
      if (currentHash(file) !== mutation.beforeHash)
        throw new Error(`产品或公共文件在规划后已修改：${file}`);
      return {
        path: file,
        before:
          mutation.beforeHash === null
            ? null
            : fs.readFileSync(file).toString("base64"),
        after: mutation.after?.toString("base64") ?? null,
        beforeHash: mutation.beforeHash,
        afterHash: mutation.after === null ? null : hashBytes(mutation.after),
      };
    });
    if (!entries.length) return plan;
    journal = {
      schemaVersion: 1,
      target,
      phase: "prepared",
      token: lease.token,
      entries,
    };
    atomicWrite(journalFile, Buffer.from(JSON.stringify(journal)), lease.token);
    for (const entry of entries) {
      if (currentHash(entry.path) !== entry.beforeHash)
        throw new Error(`事务执行前文件已修改：${entry.path}`);
      if (entry.after === null) fs.unlinkSync(entry.path);
      else
        atomicWrite(
          entry.path,
          Buffer.from(entry.after, "base64"),
          lease.token,
        );
    }
    journal.phase = "committed";
    atomicWrite(journalFile, Buffer.from(JSON.stringify(journal)), lease.token);
    fs.unlinkSync(journalFile);
    return plan;
  } catch (error) {
    if (journal?.phase === "prepared") {
      try {
        restore(journal, lease.token);
        fs.unlinkSync(journalFile);
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "公共安装失败且需保留事务记录继续恢复",
        );
      }
    }
    throw error;
  } finally {
    release(lockFile, lease);
  }
}
