import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { FileMutation } from "../types.js";
import { canonicalPath } from "../identity.js";
import { safeProductPath, productPathKey } from "./paths.js";
import {
  assertProductDefinition,
  assertProductOwnership,
} from "./ownership.js";
import type {
  ProductDefinition,
  ProductContext,
  ProductManifestState,
  ProductAction,
  CommonPointer,
} from "./types.js";
import type { OwnedEntry } from "./shared-config/types.js";
import { planConfigEntry, validateConfigEntry } from "./shared-config/index.js";

export interface InstallSessionOptions {
  definition: ProductDefinition;
  context: ProductContext;
  previous?: ProductManifestState;
  action: ProductAction;
  common?: CommonPointer;
  forceOwnedRemoval?: boolean;
  initialMutations?: readonly FileMutation[];
}
export interface FileInstallSession {
  read(file: string): Buffer;
  exists(file: string): boolean;
  stage(file: string, after: Buffer | null): void;
  writeManaged(file: string, after: Buffer): void;
  retireTree(root: string, options?: { rejectUnknown?: boolean }): void;
  finish(): {
    mutations: FileMutation[];
    manifest: ProductManifestState;
    preserved: string[];
    conflicts: string[];
  };
}
export interface InstallSession extends FileInstallSession {
  editShared(file: string, entry: OwnedEntry): void;
}

const hash = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

export function createInstallSession(
  options: InstallSessionOptions,
): InstallSession {
  const definition = structuredClone(options.definition);
  assertProductDefinition(definition);
  const ctx = {
    ...options.context,
    allowedRoots: [...options.context.allowedRoots],
  };
  const previous = options.previous
    ? structuredClone(options.previous)
    : undefined;
  const ownershipRoots = ctx.allowedRoots.map(canonicalPath);
  if (
    previous &&
    (previous.product !== definition.packageName ||
      previous.runtime !== ctx.runtime ||
      previous.scope !== ctx.scope)
  ) {
    throw new Error("Product manifest identity mismatch");
  }
  if (
    previous?.common &&
    (!options.common ||
      productPathKey(previous.common.target) !==
        productPathKey(options.common.target) ||
      productPathKey(previous.common.ledgerDir) !==
        productPathKey(options.common.ledgerDir))
  ) {
    throw new Error("Product common target identity mismatch");
  }
  const draft = new Map<string, FileMutation>(),
    owned = new Map<string, { path: string; hash: string }>();
  const requested = new Set<string>(),
    preserved = new Set<string>();
  const shared = new Map<string, { path: string; entry: OwnedEntry }>();
  const requestedShared = new Set<string>();
  let finished = false;
  const open = () => {
    if (finished) throw new Error("Installation session is closed");
  };
  const target = (file: string): string => {
    const value = safeProductPath(file, ctx.allowedRoots);
    assertProductOwnership(value, definition, ownershipRoots);
    return value;
  };
  for (const entry of previous?.files ?? []) {
    const file = target(entry.path),
      key = productPathKey(file);
    if (!/^[a-f0-9]{64}$/.test(entry.hash))
      throw new Error("Invalid owned file hash");
    if (owned.has(key)) throw new Error("Duplicate owned path in manifest");
    owned.set(key, { path: file, hash: entry.hash });
  }
  for (const record of previous?.sharedEntries ?? []) {
    const file = target(record.path),
      key = productPathKey(file) + ":" + record.entry.id;
    validateConfigEntry(record.entry, definition);
    if (shared.has(key)) throw new Error("Duplicate shared entry in manifest");
    shared.set(key, { path: file, entry: record.entry });
  }
  const disk = (file: string): Buffer | null => {
    try {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error(`Product target is not a regular file: ${file}`);
      return fs.readFileSync(file);
    } catch (error) {
      if (
        ["ENOENT", "ENOTDIR"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        return null;
      throw error;
    }
  };
  const readCurrent = (file: string): Buffer | null => {
    const pending = draft.get(productPathKey(file));
    return pending ? pending.after : disk(file);
  };
  const stage = (file: string, after: Buffer | null): void => {
    open();
    const absolute = target(file),
      key = productPathKey(absolute),
      pending = draft.get(key);
    const before = pending ? undefined : disk(absolute);
    draft.set(key, {
      path: absolute,
      beforeHash: pending
        ? pending.beforeHash
        : before === null
          ? null
          : hash(before!),
      after: after === null ? null : Buffer.from(after),
    });
  };
  const retire = (key: string, old: { path: string; hash: string }): void => {
    const current = readCurrent(old.path);
    if (
      current !== null &&
      hash(current) !== old.hash &&
      !(options.action === "uninstall" && options.forceOwnedRemoval)
    ) {
      preserved.add(old.path);
      return;
    }
    stage(old.path, null);
    owned.delete(key);
  };

  const initialPaths = new Set<string>();
  for (const mutation of options.initialMutations ?? []) {
    const key = productPathKey(target(mutation.path));
    if (initialPaths.has(key))
      throw new Error("Duplicate initial product mutation");
    initialPaths.add(key);
    stage(mutation.path, mutation.after);
    if (draft.get(key)!.beforeHash !== mutation.beforeHash)
      throw new Error("Initial product mutation changed before planning");
  }
  return {
    read(file) {
      open();
      const absolute = target(file),
        bytes = readCurrent(absolute);
      if (bytes === null)
        throw Object.assign(new Error(`Planned file does not exist: ${file}`), {
          code: "ENOENT",
        });
      return Buffer.from(bytes);
    },
    exists(file) {
      open();
      return readCurrent(target(file)) !== null;
    },
    stage,
    editShared(file, input) {
      open();
      const absolute = target(file),
        key = productPathKey(absolute) + ":" + input.id;
      const old = shared.get(key);
      const entry = structuredClone({
        ...input,
        createdFile: old?.entry.createdFile ?? input.createdFile,
      });
      const result = planConfigEntry({
        before: readCurrent(absolute),
        owner: definition,
        entry,
        previous: old?.entry,
        action: "upsert",
      });
      requestedShared.add(key);
      if (result.status === "preserved") {
        preserved.add(absolute);
        return;
      }
      stage(absolute, result.after);
      shared.set(key, { path: absolute, entry });
    },
    writeManaged(file, after) {
      open();
      const absolute = target(file),
        key = productPathKey(absolute),
        old = owned.get(key),
        current = readCurrent(absolute);
      requested.add(key);
      if (current !== null && (!old || hash(current) !== old.hash)) {
        preserved.add(absolute);
        return;
      }
      stage(absolute, after);
      owned.set(key, { path: absolute, hash: hash(after) });
    },
    retireTree(root, flags = {}) {
      open();
      const absolute = target(root),
        files: string[] = [];
      const walk = (entry: string): void => {
        if (!fs.existsSync(entry)) return;
        const stat = fs.lstatSync(entry);
        if (stat.isSymbolicLink())
          throw new Error(`Retired tree contains a link: ${entry}`);
        if (stat.isDirectory()) {
          for (const name of fs.readdirSync(entry))
            walk(path.join(entry, name));
        } else if (stat.isFile()) files.push(target(entry));
        else throw new Error(`Unknown retired tree node: ${entry}`);
      };
      walk(absolute);
      if (flags.rejectUnknown) {
        for (const file of files) {
          const old = owned.get(productPathKey(file));
          if (!old || hash(disk(file)!) !== old.hash)
            throw new Error(
              `Retired resource is unknown, modified or unowned: ${file}`,
            );
        }
      }
      for (const [key, old] of [...owned]) {
        const relative = path.relative(absolute, old.path);
        if (
          !path.isAbsolute(relative) &&
          relative !== ".." &&
          !relative.startsWith(`..${path.sep}`)
        ) {
          requested.add(key);
          retire(key, old);
        }
      }
    },
    finish() {
      open();
      for (const [key, old] of [...owned])
        if (
          !requested.has(key) &&
          (options.action === "uninstall" || !definition.retainUnrequestedFiles)
        )
          retire(key, old);
      for (const [key, old] of [...shared]) {
        if (requestedShared.has(key)) continue;
        const result = planConfigEntry({
          before: readCurrent(old.path),
          owner: definition,
          entry: old.entry,
          previous: old.entry,
          action: "remove",
        });
        if (result.status === "preserved") {
          preserved.add(old.path);
          continue;
        }
        stage(old.path, result.after);
        shared.delete(key);
      }
      finished = true;
      const manifest: ProductManifestState = {
        product: definition.packageName,
        packageVersion: ctx.packageVersion,
        runtime: ctx.runtime,
        scope: ctx.scope,
        language: ctx.language,
        installedAt: previous?.installedAt ?? new Date().toISOString(),
        files: [...owned.values()].sort((a, b) =>
          a.path.localeCompare(b.path, "en"),
        ),
        sharedEntries: [...shared.values()].sort((a, b) =>
          (a.path + ":" + a.entry.id).localeCompare(
            b.path + ":" + b.entry.id,
            "en",
          ),
        ),
        ...(options.common ? { common: structuredClone(options.common) } : {}),
      };
      return {
        mutations: [...draft.values()].filter((entry) =>
          entry.after === null
            ? entry.beforeHash !== null
            : hash(entry.after) !== entry.beforeHash,
        ),
        manifest,
        preserved: [...preserved],
        conflicts: [],
      };
    },
  };
}
