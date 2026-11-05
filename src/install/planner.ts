import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { canonicalPath, resolveSharedIdentity } from "./identity.js";
import type {
  CommonManifest,
  CommonPlan,
  Consumer,
  DependencyLock,
  FileMutation,
  SharedRequest,
} from "./types.js";

export const hashBytes = (bytes: string | Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");
export function consumerIdentity(consumer: Consumer): string {
  if (
    !consumer.product ||
    !["local", "global"].includes(consumer.scope) ||
    !path.isAbsolute(consumer.manifestPath)
  )
    throw new Error("公共依赖消费者身份无效");
  const manifest = canonicalPath(consumer.manifestPath);
  return hashBytes(
    JSON.stringify([
      consumer.product,
      process.platform === "win32" ? manifest.toLowerCase() : manifest,
      consumer.scope,
    ]),
  );
}

export function safeManagedPath(root: string, relative: string): string {
  if (
    !relative ||
    relative.includes("\\") ||
    path.isAbsolute(relative) ||
    relative.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error(`公共资源路径越界：${relative}`);
  const target = path.resolve(root, relative);
  const remainder = path.relative(path.resolve(root), target);
  if (
    !remainder ||
    remainder.startsWith(`..${path.sep}`) ||
    remainder === ".." ||
    path.isAbsolute(remainder)
  )
    throw new Error(`公共资源越过边界：${relative}`);
  let current = target;
  const boundary = path.resolve(root);
  while (true) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      throw new Error(`托管路径不允许符号链接：${current}`);
    if (current === boundary) break;
    current = path.dirname(current);
  }
  return target;
}
export function currentHash(file: string): string | null {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error(`托管路径不是普通文件：${file}`);
    return hashBytes(fs.readFileSync(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
function readJson(file: string): unknown {
  const hash = currentHash(file);
  if (hash === null) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new Error(`公共账本 JSON 损坏：${file}`);
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
function json(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

export function planSharedDeployment(request: SharedRequest): CommonPlan {
  if (!["install", "update", "uninstall"].includes(request.action))
    throw new Error("未知公共安装操作");
  const { target, ledgerDir } = resolveSharedIdentity(request.skillsDir);
  const id = consumerIdentity(request.consumer);
  const catalog = request.catalog;
  if (request.action !== "uninstall" && !catalog)
    throw new Error("公共安装缺少内容目录");
  const desired = new Map<string, Buffer>();
  if (catalog && request.action !== "uninstall") {
    if (
      catalog.schemaVersion !== 1 ||
      catalog.packageName !== "@bovinphang/craft-common" ||
      !["en", "zh-CN"].includes(catalog.language)
    )
      throw new Error("公共内容目录无效");
    for (const skill of catalog.skills) {
      if (!/^cc-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.id))
        throw new Error(`公共技能路径无效：${skill.id}`);
      for (const file of skill.files) {
        const relative = `${skill.id}/${file.relativePath}`;
        safeManagedPath(target, relative);
        const source = safeManagedPath(catalog.root, `skills/${relative}`);
        const bytes = fs.readFileSync(source);
        if (hashBytes(bytes) !== file.hash)
          throw new Error(`公共内容来源摘要不匹配：${relative}`);
        if (desired.has(relative))
          throw new Error(`重复公共资源路径：${relative}`);
        desired.set(relative, bytes);
      }
    }
  }
  const manifestPath = safeManagedPath(ledgerDir, "craft-common.json");
  const lockPath = safeManagedPath(ledgerDir, "dependencies.lock.json");
  const rawManifest = readJson(manifestPath),
    rawLock = readJson(lockPath);
  if (Boolean(rawManifest) !== Boolean(rawLock))
    throw new Error("公共账本不完整，保留资源等待修复");
  let manifest: CommonManifest | undefined;
  let lock: DependencyLock = { schemaVersion: 1, target, consumers: {} };
  if (rawManifest !== undefined) {
    if (
      !object(rawManifest) ||
      rawManifest.schemaVersion !== 1 ||
      rawManifest.target !== target ||
      typeof rawManifest.packageVersion !== "string" ||
      !["en", "zh-CN"].includes(String(rawManifest.language)) ||
      typeof rawManifest.sourceDigest !== "string" ||
      !object(rawManifest.files) ||
      typeof rawManifest.residual !== "boolean" ||
      !object(rawLock) ||
      rawLock.schemaVersion !== 1 ||
      rawLock.target !== target ||
      !object(rawLock.consumers)
    )
      throw new Error("公共账本结构或目标身份无效");
    for (const [relative, hash] of Object.entries(rawManifest.files)) {
      safeManagedPath(target, relative);
      if (
        !relative.startsWith("cc-") ||
        typeof hash !== "string" ||
        !/^[a-f0-9]{64}$/.test(hash)
      )
        throw new Error("公共账本文件所有权无效");
    }
    for (const [key, entry] of Object.entries(rawLock.consumers)) {
      if (
        !object(entry) ||
        !object(entry.consumer) ||
        typeof entry.requiredVersion !== "string" ||
        typeof entry.digest !== "string" ||
        !["en", "zh-CN"].includes(String(entry.language))
      )
        throw new Error("公共消费者账本无效");
      const consumer = entry.consumer as Consumer;
      if (consumerIdentity(consumer) !== key)
        throw new Error("公共消费者标识不匹配");
      if (
        entry.requiredVersion !== rawManifest.packageVersion ||
        entry.language !== rawManifest.language ||
        entry.digest !== rawManifest.sourceDigest
      )
        throw new Error("公共依赖声明与内容账本不一致");
    }
    manifest = rawManifest as CommonManifest;
    lock = rawLock as DependencyLock;
  }
  const plan: CommonPlan = {
    schemaVersion: 1,
    target,
    stateDigest: hashBytes(
      JSON.stringify([rawManifest ?? null, rawLock ?? null]),
    ),
    mutations: [],
    conflicts: [],
  };
  if (catalog && request.action !== "uninstall") {
    const { root: _root, digest, ...content } = catalog;
    if (hashBytes(JSON.stringify(content)) !== digest) {
      plan.conflicts.push("公共内容目录摘要无效，拒绝覆盖相同版本");
      return plan;
    }
  }
  const mutate = (file: string, after: Buffer | null): void => {
    const beforeHash = currentHash(file);
    if (after === null ? beforeHash !== null : beforeHash !== hashBytes(after))
      plan.mutations.push({
        path: file,
        beforeHash,
        after,
      } satisfies FileMutation);
  };
  if (request.action === "uninstall") {
    if (!manifest || !lock.consumers[id]) return plan;
    if (request.retainConsumer) return plan;
    delete lock.consumers[id];
    if (Object.keys(lock.consumers).length) {
      mutate(lockPath, json(lock));
      return plan;
    }
    const residual: Record<string, string> = {};
    for (const [relative, ownedHash] of Object.entries(manifest.files)) {
      const dest = safeManagedPath(target, relative);
      const actualHash = currentHash(dest);
      if (actualHash === null) continue;
      if (actualHash === ownedHash) mutate(dest, null);
      else residual[relative] = ownedHash;
    }
    if (Object.keys(residual).length) {
      mutate(
        manifestPath,
        json({ ...manifest, files: residual, residual: true }),
      );
      mutate(lockPath, json(lock));
    } else {
      mutate(manifestPath, null);
      mutate(lockPath, null);
    }
    return plan;
  }
  if (!catalog) throw new Error("公共安装缺少来源");
  const others = Object.entries(lock.consumers).filter(([key]) => key !== id);
  if (
    manifest &&
    (manifest.packageVersion !== catalog.packageVersion ||
      manifest.language !== catalog.language ||
      manifest.sourceDigest !== catalog.digest) &&
    (others.length || request.action !== "update")
  )
    plan.conflicts.push("公共版本、语言或源摘要冲突，请协调消费者后更新");
  for (const [relative, ownedHash] of Object.entries(manifest?.files ?? {})) {
    const actualHash = currentHash(safeManagedPath(target, relative));
    if (actualHash !== null && actualHash !== ownedHash)
      plan.conflicts.push(`公共托管文件已修改：${relative}`);
  }
  for (const [relative] of desired) {
    if (
      currentHash(safeManagedPath(target, relative)) !== null &&
      !manifest?.files[relative]
    )
      plan.conflicts.push(`未知来源同名公共文件：${relative}`);
  }
  if (plan.conflicts.length) return plan;
  for (const [relative, bytes] of desired)
    mutate(safeManagedPath(target, relative), bytes);
  for (const relative of Object.keys(manifest?.files ?? {}))
    if (!desired.has(relative)) mutate(safeManagedPath(target, relative), null);
  lock.consumers[id] = {
    consumer: {
      ...request.consumer,
      manifestPath: canonicalPath(request.consumer.manifestPath),
    },
    requiredVersion: catalog.packageVersion,
    language: catalog.language,
    digest: catalog.digest,
  };
  const updated: CommonManifest = {
    schemaVersion: 1,
    target,
    packageVersion: catalog.packageVersion,
    language: catalog.language,
    sourceDigest: catalog.digest,
    files: Object.fromEntries(
      [...desired].map(([relative, bytes]) => [relative, hashBytes(bytes)]),
    ),
    residual: false,
  };
  mutate(manifestPath, json(updated));
  mutate(lockPath, json(lock));
  return plan;
}
