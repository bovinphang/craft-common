import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FileMutation } from "../types.js";
import type { ProductContext, ProductDefinition } from "./types.js";
interface InstallContext extends ProductContext {
  definition: ProductDefinition;
}
export interface ProductTransactionInput {
  definition: ProductDefinition;
  context: ProductContext;
}
const allowedRoots = (ctx: InstallContext): string[] => ctx.allowedRoots;
import {
  safeProductPath as safeDestination,
  productPathKey as pathKey,
} from "./paths.js";
import { assertProductOwnership } from "./ownership.js";
import { acquireFileLease } from "./locks.js";
import { currentHash } from "../planner.js";
import { hashBytes } from "./shared-config/hash.js";
import { canonicalPath } from "../identity.js";
import {
  transactionEntryHash,
  prepareTransitionRestore,
} from "../file-transition.js";
interface Entry {
  path: string;
  before: string | null;
  after: string | null;
  mode: number;
}
interface Journal {
  schemaVersion: 1;
  identity: string;
  phase: "prepared" | "committed";
  entries: Entry[];
}
function locations(ctx: InstallContext) {
  const base = safeDestination(
    path.join(ctx.baseDir, ctx.definition.stateDirectoryName + "/journal.json"),
    allowedRoots(ctx),
  );
  return {
    journal: base,
    state: path.dirname(base),
    identity: JSON.stringify([
      path.dirname(path.dirname(base)),
      ctx.runtime,
      ctx.scope === "global",
    ]),
  };
}
function target(ctx: InstallContext, file: string): string {
  const resolved = safeDestination(file, allowedRoots(ctx));
  if (
    pathKey(resolved) !==
    pathKey(
      safeDestination(
        path.join(ctx.baseDir, ctx.definition.manifestName),
        allowedRoots(ctx),
      ),
    )
  )
    assertProductOwnership(
      resolved,
      ctx.definition,
      ctx.allowedRoots.map(canonicalPath),
    );
  if (resolved.split(path.sep).includes(ctx.definition.stateDirectoryName))
    throw new Error("不能修改产品事务状态");
  return resolved;
}
const ctxAtomicPrefix = "craft-product";
function atomic(file: string, bytes: Buffer | null, mode = 0o600): void {
  if (bytes === null) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(
    path.dirname(file),
    "." + ctxAtomicPrefix + "-" + randomUUID() + ".tmp",
  );
  try {
    fs.writeFileSync(temporary, bytes, { flag: "wx", mode });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}
function bytes(value: string | null): Buffer | null {
  return value === null ? null : Buffer.from(value, "base64");
}
function hash(value: string | null): string | null {
  return value === null ? null : hashBytes(Buffer.from(value, "base64"));
}
function save(file: string, journal: Journal): void {
  atomic(file, Buffer.from(JSON.stringify(journal)));
}
function load(ctx: InstallContext): Journal | undefined {
  const loc = locations(ctx);
  if (!fs.existsSync(loc.journal)) return;
  if (fs.statSync(loc.journal).size > 64 * 1024 * 1024)
    throw new Error("事务日志过大");
  let value: Journal;
  try {
    value = JSON.parse(fs.readFileSync(loc.journal, "utf8")) as Journal;
  } catch {
    throw new Error("产品事务日志损坏");
  }
  if (
    !value ||
    value.schemaVersion !== 1 ||
    value.identity !== loc.identity ||
    !["prepared", "committed"].includes(value.phase) ||
    !Array.isArray(value.entries)
  )
    throw new Error("产品事务身份或结构无效");
  const seen = new Set<string>();
  for (const entry of value.entries) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      ![entry.before, entry.after].every(
        (v) =>
          v === null ||
          (typeof v === "string" &&
            Buffer.from(v, "base64").toString("base64") === v),
      ) ||
      !Number.isInteger(entry.mode)
    )
      throw new Error("产品事务条目损坏");
    const file = target(ctx, entry.path);
    if (pathKey(file) !== pathKey(entry.path) || seen.has(pathKey(file)))
      throw new Error("产品事务路径无效");
    seen.add(pathKey(file));
  }
  return value;
}
function recoverLocked(ctx: InstallContext): "clean" | "recovered" {
  const journal = load(ctx);
  if (!journal) return "clean";
  for (const entry of journal.entries) {
    const actual = transactionEntryHash(entry, journal.entries);
    if (actual !== hash(entry.before) && actual !== hash(entry.after))
      throw new Error("恢复冲突：事务后文件被外部修改，保留日志");
    if (journal.phase === "committed" && actual !== hash(entry.after))
      throw new Error("已提交事务内容发生冲突");
  }
  if (journal.phase === "prepared")
    for (const entry of [...journal.entries].reverse())
      if (transactionEntryHash(entry, journal.entries) !== hash(entry.before)) {
        prepareTransitionRestore(entry, journal.entries);
        atomic(entry.path, bytes(entry.before), entry.mode);
      }
  fs.unlinkSync(locations(ctx).journal);
  return "recovered";
}
function acquire(ctx: InstallContext): () => void {
  const { state } = locations(ctx);
  fs.mkdirSync(state, { recursive: true, mode: 0o700 });
  return acquireFileLease(
    safeDestination(path.join(state, "lease.json"), allowedRoots(ctx)),
  );
}
export async function recoverProductTransaction(
  input: ProductTransactionInput,
): Promise<"clean" | "recovered"> {
  const ctx: InstallContext = {
    ...input.context,
    definition: input.definition,
  };
  const loc = locations(ctx);
  if (!fs.existsSync(loc.journal)) return "clean";
  const release = acquire(ctx);
  try {
    return recoverLocked(ctx);
  } finally {
    release();
  }
}
export async function executeProductPlan(
  input: ProductTransactionInput,
  mutations: FileMutation[],
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const ctx: InstallContext = {
    ...input.context,
    definition: input.definition,
  };
  if ((options.dryRun || ctx.dryRun) && fs.existsSync(locations(ctx).journal))
    throw new Error(
      "Pending product transaction recovery; dry-run does not recover",
    );
  const seen = new Set<string>();
  const normalized = mutations.map((m) => {
    if (
      !m ||
      typeof m.path !== "string" ||
      !(
        m.beforeHash === null ||
        (typeof m.beforeHash === "string" &&
          /^[a-f0-9]{64}$/.test(m.beforeHash))
      ) ||
      !(m.after === null || Buffer.isBuffer(m.after))
    )
      throw new Error("产品变更结构无效");
    const file = target(ctx, m.path);
    if (seen.has(pathKey(file))) throw new Error("产品变更路径重复");
    seen.add(pathKey(file));
    return { ...m, path: file };
  });
  const check = () => {
    for (const m of normalized)
      if (currentHash(m.path) !== m.beforeHash)
        throw new Error("产品变更冲突：规划后文件被修改");
  };
  check();
  if (options.dryRun || ctx.dryRun || !normalized.length) return;
  const release = acquire(ctx);
  try {
    recoverLocked(ctx);
    check();
    const loc = locations(ctx);
    const journal: Journal = {
      schemaVersion: 1,
      identity: loc.identity,
      phase: "prepared",
      entries: normalized.map((m) => ({
        path: m.path,
        before:
          m.beforeHash === null
            ? null
            : fs.readFileSync(m.path).toString("base64"),
        after: m.after?.toString("base64") ?? null,
        mode: m.beforeHash === null ? 0o600 : fs.statSync(m.path).mode & 0o777,
      })),
    };
    save(loc.journal, journal);
    try {
      for (const entry of journal.entries)
        atomic(entry.path, bytes(entry.after), entry.mode);
      journal.phase = "committed";
      save(loc.journal, journal);
    } catch (error) {
      recoverLocked(ctx);
      throw error;
    }
    fs.unlinkSync(loc.journal);
  } finally {
    release();
  }
}
